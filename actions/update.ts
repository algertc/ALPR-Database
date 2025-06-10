"use server";

import { markUpdateComplete } from "@/lib/db";

export async function completeUpdate() {
  try {
    await markUpdateComplete();
    return { success: true };
  } catch (error) {
    console.error("Error marking update complete:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Unknown error occurred" };
  }
}