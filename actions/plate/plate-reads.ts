"use server";

import {
  getPlateReads,
  removePlate,
  removePlateRead,
  updateAllPlateReads,
  updatePlateRead
} from "@/lib/db";

export async function getLatestPlateReads({
  page = 1,
  pageSize = 25,
  search = "",
  fuzzySearch = false,
  tag = "all",
  dateRange = null,
  hourRange = null,
  cameraName = "",
  sortField = "",
  sortDirection = "",
} = {}) {
  console.log("Fetching latest plate reads");
  try {
    const result = await getPlateReads({
      page,
      pageSize,
      filters: {
        plateNumber: search,
        fuzzySearch,
        tag: tag !== "all" ? tag : undefined,
        dateRange,
        hourRange,
        cameraName: cameraName || undefined,
      },
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    });

    return {
      data: result.data,
      pagination: {
        page,
        pageSize,
        total: result.pagination.total,
        pageCount: result.pagination.pageCount,
      },
    };
  } catch (error) {
    console.error("Error fetching plate reads:", error);
    return {
      data: [],
      pagination: {
        page,
        pageSize,
        total: 0,
        pageCount: 0,
      },
    };
  }
}

export async function deletePlateRead(formData: FormData) {
  console.log("Deleting plate recognition");
  try {
    const id = formData.get("id"); // use ID
    await removePlateRead(id);
    return { success: true };
  } catch (error) {
    console.error("Error removing plate read:", error); // Clarified error message
    return { success: false, error: "Failed to remove plate read" };
  }
}

export async function correctPlateRead(formData: FormData) {
  try {
    const readId = formData.get("readId");
    const oldPlateNumber = formData.get("oldPlateNumber");
    const newPlateNumber = formData.get("newPlateNumber");
    const correctAll = formData.get("correctAll") === "true";
    const removePrevious = formData.get("removePrevious") === "true";

    if (correctAll) {
      await updateAllPlateReads(oldPlateNumber, newPlateNumber);
    } else {
      await updatePlateRead(readId, newPlateNumber);
    }

    if (removePrevious) {
      await removePlate(oldPlateNumber);
    }

    return { success: true };
  } catch (error) {
    console.error("Error correcting plate read:", error);
    return { success: false, error: "Failed to correct plate read" };
  }
}