"use server";

import { getDistinctCameraNames } from "@/lib/db";
import { getConfig } from "@/lib/settings";

export type TimeData = {
  timestamp: string;
  frequency: number;
  hour: number;
}

export async function getTimeFormat() {
  const config = await getConfig();
  return config.general.timeFormat;
}

export async function getCameraNames() {
  try {
    const cameraNames = await getDistinctCameraNames();
    return {
      success: true,
      data: cameraNames,
    };
  } catch (error) {
    console.error("Error getting camera names:", error);
    return {
      success: false,
      error: "Failed to fetch camera names",
    };
  }
}