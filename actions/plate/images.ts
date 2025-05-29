"use server";

import { getPlateImagePreviews } from "@/lib/db";

export async function fetchPlateImagePreviews(plateNumber: string, timeFrame: string) {
  const endDate = new Date();
  const startDate = new Date();

  switch (timeFrame) {
    case "3d":
      startDate.setDate(endDate.getDate() - 3);
      break;
    case "7d":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(endDate.getDate() - 30);
      break;
    case "all":
      startDate.setFullYear(2000);
      break;
    default: // 24h
      startDate.setDate(endDate.getDate() - 1);
  }

  return await getPlateImagePreviews(plateNumber, startDate, endDate);
}