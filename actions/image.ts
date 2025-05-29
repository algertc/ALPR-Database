
"use server";

import {
  clearImageDataBatch, getRecordsToMigrate,
  getTotalRecordsToMigrate, updateImagePathsBatch, verifyImageMigration
} from "@/lib/db";
import { completeUpdate } from "./update";
import fileStorage from "@/lib/fileStorage";

export async function skipImageMigration() {
  try {
    const verificationResult = await verifyImageMigration();

    if (!verificationResult.success) {
      return {
        success: false,
        error: "Could not verify migration status",
      };
    }

    if (!verificationResult.isComplete) {
      return {
        success: false,
        error: `Cannot skip migration: ${verificationResult.incompleteCount} records still need migration`,
      };
    }

    await completeUpdate();
    return { success: true };
  } catch (error) {
    console.error("Error in skipImageMigration:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Unknown error occurred" };
  }
}

export async function clearImageData() {
  console.log("Starting image data cleanup...");

  try {
    let totalCleared = 0;
    let batchCount;

    do {
      batchCount = await clearImageDataBatch(1000);
      totalCleared += batchCount;
      console.log(`Cleared ${totalCleared} records...`);
    } while (batchCount > 0);

    return {
      success: true,
      clearedCount: totalCleared,
    };
  } catch (error) {
    console.error("Cleanup failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function migrateImageDataToFiles() {
  console.log("Starting image data migration...");

  try {
    const totalRecords = await getTotalRecordsToMigrate();
    console.log(`Total records to migrate: ${totalRecords}`);

    let processed = 0;
    let errors = 0;
    let lastId = 0;
    const BATCH_SIZE = 100;

    while (true) {
      const records = await getRecordsToMigrate(BATCH_SIZE, lastId);
      if (records.length === 0) break;

      const updates = [];

      for (const record of records) {
        try {
          const { imagePath, thumbnailPath } =
            await fileStorage.migrateBase64ToFile(
              record.image_data,
              record.plate_number,
              record.timestamp
            );

          updates.push({ id: record.id, imagePath, thumbnailPath });
          processed++;
        } catch (error) {
          console.error(`Error processing record ${record.id}:`, error);
          errors++;
        }

        lastId = record.id;
      }

      if (updates.length > 0) {
        try {
          await updateImagePathsBatch(updates);
        } catch (error) {
          console.error("Error updating batch:", error);
          errors += updates.length;
          processed -= updates.length;
        }
      }

      console.log(
        `Processed ${processed}/${totalRecords} records (${errors} errors)`
      );
    }

    return {
      success: true,
      processed,
      errors,
      totalRecords,
    };
  } catch (error) {
    console.error("Migration failed:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Unknown error occurred" };
  }
}