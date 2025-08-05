import { cleanupOldRecords, getPool, isPlateIgnored } from "@/lib/db";
import {
  checkPlateForNotification,
  checkPlateForMqttNotification,
} from "@/lib/db";
import { sendPushoverNotification } from "@/lib/notifications";
import { sendMqttNotificationByPlate } from "@/lib/mqtt-client";
import { getAuthConfig } from "@/lib/auth";
import { getConfig } from "@/lib/settings";
import { revalidatePlatesPage } from "@/app/actions";
import { revalidatePath } from "next/cache";
import fileStorage from "@/lib/fileStorage";

// Revised to use a blacklist of all other possible AI labels if using the memo
const EXCLUDED_LABELS = [
  "person",
  "bicycle",
  "car",
  "motorcycle",
  "bus",
  "truck",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "bear",
  "deer",
  "rabbit",
  "raccoon",
  "fox",
  "skunk",
  "squirrel",
  "pig",
  "vehicle",
  "boat",
  "bottle",
  "chair",
  "cup",
  "table",
  "airplane",
  "train",
  "traffic light",
  "fire hydrant",
  "stop sign",
  "parking meter",
  "bench",
  "elephant",
  "zebra",
  "giraffe",
  "backpack",
  "umbrella",
  "handbag",
  "tie",
  "suitcase",
  "frisbee",
  "skis",
  "snowboard",
  "sports ball",
  "kite",
  "baseball bat",
  "baseball glove",
  "skateboard",
  "surfboard",
  "tennis racket",
  "wine glass",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  "couch",
  "potted plant",
  "bed",
  "dining table",
  "toilet",
  "tv",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cell phone",
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "book",
  "clock",
  "vase",
  "scissors",
  "teddy bear",
  "hair drier",
  "toothbrush",
  "plate",
  "dayplate",
  "nightplate",
  "people",
  "motorbike",
].map((label) => label.toLowerCase());

function extractPlatesFromMemo(memo) {
  if (!memo) {
    return [];
  }

  // Split up all the detected objects/plates in memo
  const detections = memo.split(",").map((d) => d.trim());

  // Process each item in the memo
  const plates = detections
    .map((detection) => {
      // Split by colon to separate label from confidence
      const [label] = detection.split(":");

      if (!label) {
        return null;
      }

      // Convert to lowercase for comparison
      const normalizedLabel = label.trim().toLowerCase();

      // ignore other AI objects and only return plates
      if (EXCLUDED_LABELS.includes(normalizedLabel)) {
        return null;
      }

      // The older dayplate and nightplate models return the plate in brackets
      let plateNumber = label.trim();
      if (plateNumber.includes("[") && plateNumber.includes("]")) {
        plateNumber = plateNumber.replace(/\[|\]/g, "");
      }

      // Return cleaned plate number in uppercase
      return plateNumber.toUpperCase();
    })
    .filter((plate) => plate !== null);

  return [...new Set(plates)]; // Remove duplicates
}

export async function POST(req) {
  let dbClient = null;

  try {
    const data = await req.json();
    console.log("Received plate read data:", data);

    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return Response.json({ error: "API key is required" }, { status: 401 });
    }

    const authConfig = await getAuthConfig();
    if (apiKey !== authConfig.apiKey) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Initialize common values
    const timestamp = data.timestamp || new Date().toISOString();
    const camera = data.camera || null;
    let plates = [];

    // Handle AI dump format if present
    if (data.ai_dump) {
      try {
        const aiDumpArray = Array.isArray(data.ai_dump)
          ? data.ai_dump
          : [data.ai_dump];

        // Find the ALPR response in the ai_dump array
        const aiData = aiDumpArray.find((item) => item?.api === "alpr");

        if (aiData?.found?.predictions) {
          // Get all plate annotations for this batch
          const allPlateAnnotations = aiData.found.predictions
            .filter((pred) => pred.valid_ocr_annotation)
            .map((pred) => pred.plate_annotation)
            .filter(Boolean)
            .join("&");

          // Process each prediction
          plates = aiData.found.predictions.map((prediction) => ({
            plate_number: prediction.plate?.toUpperCase(),
            confidence: prediction.confidence.toFixed(2),
            crop_coordinates: [
              prediction.x_min,
              prediction.y_min,
              prediction.x_max,
              prediction.y_max,
            ],
            ...(prediction.valid_ocr_annotation && {
              ocr_annotation: {
                ocr_annotation: prediction.ocr_annotation,
              },
              plate_annotation: allPlateAnnotations,
            }),
          }));
        }
      } catch (error) {
        console.error(
          "Malformed data from Blue Iris. Your JSON macro is missing the required properties from codeproject. Please update your AI to the newest ALPR model or use plate instead of json macro.",
          error
        );
        return Response.json(
          {
            error:
              "Outdated AI. Update Model in CodeProject or use plate or memo instead of json",
          },
          { status: 400 }
        );
      }
    }
    // Backwards compatibility for older formats
    else if (data.memo) {
      //extract plates from memo
      plates = extractPlatesFromMemo(data.memo).map((plate) => ({
        plate_number: plate,
      }));
    } else if (data.plate_number) {
      plates = [
        {
          plate_number: data.plate_number.toUpperCase(),
        },
      ];
    }

    if (plates.length === 0) {
      return Response.json(
        { error: "No valid plates found in request" },
        { status: 400 }
      );
    }

    // Get database connection
    const pool = await getPool();
    dbClient = await pool.connect();
    console.log("Database connection established");

    const processedPlates = [];
    const duplicatePlates = [];
    const ignoredPlates = [];

    for (const plateData of plates) {
      // Check notifications
      const shouldNotify = await checkPlateForNotification(
        plateData.plate_number
      );
      if (shouldNotify) {
        await sendPushoverNotification(
          plateData.plate_number,
          null,
          data.Image
        );
      }

      // Check MQTT notifications
      const shouldMqttNotify = await checkPlateForMqttNotification(
        plateData.plate_number
      );
      if (shouldMqttNotify) {
        try {
          const mqttResult = await sendMqttNotificationByPlate(
            plateData.plate_number,
            {
              ...plateData,
              camera_name: camera,
              timestamp: timestamp,
            }
          );
          if (mqttResult.success && mqttResult.sent > 0) {
            console.log(
              `Sent ${mqttResult.sent} MQTT notification(s) for plate ${plateData.plate_number}`
            );
          }
        } catch (error) {
          console.error("Error sending MQTT notifications:", error);
          // Don't fail the entire request if MQTT fails
        }
      }

      const isIgnored = await isPlateIgnored(plateData.plate_number);
      if (isIgnored) {
        ignoredPlates.push(plateData.plate_number);
        continue;
      }

      let imagePaths = { imagePath: null, thumbnailPath: null };
      if (data.Image) {
        try {
          imagePaths = await fileStorage.saveImage(
            data.Image,
            plateData.plate_number
          );
        } catch (error) {
          console.error(
            `Error saving image for plate ${plateData.plate_number}:`,
            error
          );
        }
      }

      let biPath = null;
      if (data.ALERT_CLIP && data.ALERT_PATH && camera) {
        try {
          const parts = data.ALERT_PATH.split(".");
          const msOffset = parts[2];
          const recId = data.ALERT_CLIP.replace("@", "");
          biPath = `ui3.htm?rec=${recId}-${msOffset}&cam=${camera}`;
        } catch (error) {
          console.error("Error constructing bi_path:", error);
        }
      }

      const result = await dbClient.query(
        `WITH new_plate AS (
          INSERT INTO plates (plate_number)
          VALUES ($1)
          ON CONFLICT (plate_number) DO NOTHING
        ),
        new_read AS (
          INSERT INTO plate_reads (
            plate_number, 
            image_data, 
            image_path, 
            thumbnail_path,
            timestamp, 
            camera_name,
            bi_path,
            confidence,
            crop_coordinates,
            ocr_annotation,
            plate_annotation
          )
          SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          WHERE NOT EXISTS (
            SELECT 1 FROM plate_reads 
            WHERE plate_number = $1 AND timestamp = $5
          )
          RETURNING id
        )
        SELECT id FROM new_read`,
        [
          plateData.plate_number,
          null,
          imagePaths.imagePath,
          imagePaths.thumbnailPath,
          timestamp,
          camera,
          biPath,
          plateData.confidence || null,
          plateData.crop_coordinates || null,
          plateData.ocr_annotation || null,
          plateData.plate_annotation || null,
        ]
      );

      if (result.rows.length === 0) {
        duplicatePlates.push(plateData.plate_number);
      } else {
        processedPlates.push({
          plate: plateData.plate_number,
          id: result.rows[0].id,
        });
      }
    }

    const config = await getConfig();
    cleanupOldRecords(config.general.maxRecords).catch((err) =>
      console.error("Database pruning failed:", err)
    );

    fileStorage.cleanupOldFiles(config.general.retention).catch((error) => {
      console.error("JPEG pruning failed", error);
    });

    // if (processedPlates.length > 0) {
    //   console.log("New plate(s) processed, notifying clients");

    //   // Add revalidation here as well for good measure
    //   await revalidatePlatesPage();
    // }
    if (processedPlates.length > 0) {
      try {
        console.log("⭐ Plate Received");
        await revalidatePlatesPage();
        // Ensure revalidation completes
        await new Promise((resolve) => setTimeout(resolve, 100));
        // console.log("⭐ Revalidation completed");
      } catch (error) {
        console.error("⭐ Revalidation failed:", error);
        throw error;
      }
    }

    return Response.json(
      {
        processed: processedPlates,
        duplicates: duplicatePlates,
        ignored: ignoredPlates,
        message: `Processed ${processedPlates.length} plates, ${duplicatePlates.length} duplicates, ${ignoredPlates.length} ignored`,
      },
      { status: processedPlates.length > 0 ? 201 : 409 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return Response.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }
}
