"use server";

import {
  getFlaggedPlates,
  togglePlateIgnore,
  togglePlateFlag,
} from "@/lib/db";

export async function getFlagged() {
  console.log("Fetching flagged plates");
  try {
    const plates = await getFlaggedPlates();
    return plates;
  } catch (error) {
    console.error("Error fetching flagged plates:", error);
    return [];
  }
}

export async function toggleIgnorePlate(formData: FormData) {
  try {
    const plateNumber = formData.get("plateNumber");
    const ignore = formData.get("ignore") === "true";

    const result = await togglePlateIgnore(plateNumber, ignore);
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to toggle plate ignore:", error);
    return { success: false, error: "Failed to toggle plate ignore" };
  }
}

export async function alterPlateFlag(formData: FormData) {
  console.log("Toggling plate flag");
  try {
    const plateNumber = formData.get("plateNumber");
    const flagged = formData.get("flagged") === "true";

    const result = await togglePlateFlag(plateNumber, flagged);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Failed to toggle plate flag:", error);
    return {
      success: false,
      error: "Failed to toggle plate flag",
    };
  }
}