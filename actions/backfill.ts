"use server";

import { backfillOccurrenceCounts } from "@/lib/db";

export async function dbBackfill() {
  console.warn("Backfilling occurrence counts...");
  return await backfillOccurrenceCounts();
}