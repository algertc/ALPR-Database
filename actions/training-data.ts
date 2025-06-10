"use server";

import os from "os";
import path from "path";

import { getConfig } from "@/lib/settings";
import TrainingDataGenerator from "@/lib/training";
import { getTrainingRecordCount } from "@/lib/db";

export async function generateTrainingData() {
  try {
    const config = await getConfig();

    console.log("Starting training data generation and upload process");
    const tmpDir = path.join(os.tmpdir(), "alpr-training-" + Date.now());
    const generator = new TrainingDataGenerator(tmpDir);
    await generator.generateAndUpload();

    return {
      success: true,
      ocrCount: generator.stats.ocr.totalCount,
      licensePlateCount: generator.stats.licensePlate.totalCount,
      message: "Training data generated and uploaded successfully",
    };
  } catch (error) {
    console.error("Error generating training data:", error);
    if (error instanceof Error) {
      throw new Error(error.message || "Failed to generate training data");
    }

    throw new Error("Failed to generate training data");
  }
}

export async function processTrainingData() {
  try {
    // Check if training is enabled in settings
    const config = await getConfig();
    if (!config?.training?.enabled) {
      return { success: false, message: "Training not enabled" };
    }

    // Check if we have enough records
    const { newRecordsCount } = await getTrainingRecordCount();
    if (newRecordsCount < 500) {
      return { success: false, message: "Not enough new records" };
    }

    // Create temp directory
    const tempDir = path.join(os.tmpdir(), `alpr-training-${Date.now()}`);

    // Start the generator
    const generator = new TrainingDataGenerator(tempDir);
    await generator.generateAndUpload();

    return { success: true };
  } catch (error) {
    console.error("Error processing training data:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Unknown error occurred" };
  }
}