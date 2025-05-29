"use server";

import {
  removeKnownPlate,
  getAllPlates,
  removePlate,
  confirmPlateRecord
} from "@/lib/db";

export async function getPlates(
  page: number = 1,
  pageSize: number = 25,
  sortConfig = { key: "last_seen_at", direction: "desc" },
  filters: { tag?: string, search?: string, fuzzySearch?: string, dateRange?: string } = {}
) {
  console.log("Querying plate database");
  try {
    const result = await getAllPlates({
      page,
      pageSize,
      sortBy: sortConfig.key,
      sortDesc: sortConfig.direction === "desc",
      filters: {
        tag: filters.tag !== "all" ? filters.tag : undefined,
        dateRange: filters.dateRange,
        search: filters.search,
        fuzzySearch: filters.fuzzySearch,
      },
    });
    return { success: true, ...result };
  } catch (error) {
    console.error("Error getting plates database:", error);
    return {
      success: false,
      error: "Failed to get plates database",
      data: [],
      pagination: {
        total: 0,
        pageCount: 0,
        page: 1,
        pageSize: 25,
      },
    };
  }
}

export async function deletePlate(formData: FormData) {
  console.log("Deleting known plate");
  try {
    const plateNumber = formData.get("plateNumber");
    await removeKnownPlate(plateNumber);
    return { success: true };
  } catch (error) {
    console.error("Error removing known plate:", error);
    return { success: false, error: "Failed to remove plate" };
  }
}

export async function deletePlateFromDB(formData: FormData) {
  console.log("Deleting plate from database");
  try {
    const plateNumber = formData.get("plateNumber");
    await removePlate(plateNumber);
    return { success: true };
  } catch (error) {
    console.error("Error removing known plate:", error);
    return { success: false, error: "Failed to remove plate" };
  }
}

export async function validatePlateRecord(readId: number, value: boolean) {
  try {
    await confirmPlateRecord(readId, value);

    return { success: true };
  } catch (error) {
    console.error("Error validating plate record:", error);
    return { success: false, error: "Failed to validate plate record" };
  }
}