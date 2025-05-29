"use server";

import { revalidatePath } from "next/cache";

export async function revalidatePlatesPage() {
  try {
    console.log("🔴 Starting revalidation");
    revalidatePath("/live_feed");
    console.log("🔴 Revalidation completed");
  } catch (error) {
    console.error("🔴 Revalidation failed:", error);
    throw error;
  }
}