"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { getAuthConfig, updateAuthConfig } from "@/lib/auth";

export async function regenerateApiKey() {
  try {
    const config = await getAuthConfig();
    const newApiKey = crypto.randomBytes(32).toString("hex");

    await updateAuthConfig({
      ...config,
      apiKey: newApiKey,
    });

    revalidatePath("/settings");
    return { success: true, apiKey: newApiKey };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Unknown error occurred" };
  }
}