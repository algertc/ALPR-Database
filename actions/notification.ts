"use server";

import {
  updateNotificationPriorityDB,
  getNotificationPlates as getNotificationPlatesDB,
  addNotificationPlate as addNotificationPlateDB,
  toggleNotification as toggleNotificationDB,
  deleteNotification as deleteNotificationDB,
} from "@/lib/db";

export async function getNotificationPlates() {
  console.log("Checking notification plates");
  try {
    const plates = await getNotificationPlatesDB();
    return { success: true, data: plates };
  } catch (error) {
    console.error("Error in getNotificationPlates action:", error);
    return { success: false, error: "Failed to fetch notification plates" };
  }
}

export async function addNotificationPlate(formData: FormData) {
  console.log("Adding notification plate");
  const plateNumber = formData.get("plateNumber");
  return await addNotificationPlateDB(plateNumber);
}

export async function toggleNotification(formData: FormData) {
  console.log("Toggling notification");
  const plateNumber = formData.get("plateNumber");
  const enabled = formData.get("enabled") === "true";
  return await toggleNotificationDB(plateNumber, enabled);
}

export async function deleteNotification(formData: FormData) {
  console.log("Deleting notification");
  try {
    const plateNumber = formData.get("plateNumber");
    console.log("Server action received plateNumber:", plateNumber);
    await deleteNotificationDB(plateNumber);
    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false, error: "Failed to delete notification" };
  }
}

export async function updateNotificationPriority(formData: FormData) {
  console.log("Updating notification priority");
  try {
    // When using Select component, the values come directly as arguments
    // not as FormData
    const plateNumber = formData.get("plateNumber") as string
    const priority = parseInt(formData.get("priority") as string);

    if (isNaN(priority) || priority < -2 || priority > 2) {
      return { success: false, error: "Invalid priority value" };
    }

    const result = await updateNotificationPriorityDB(plateNumber, priority);
    if (!result) {
      return { success: false, error: "Notification not found" };
    }
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating notification priority:", error);
    return { success: false, error: "Failed to update notification priority" };
  }
}