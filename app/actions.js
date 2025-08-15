"use server";

//This is extremely sloppy. Should really clean up the actions.

import {
  getAvailableTags,
  createTag,
  updateTagColor,
  deleteTag,
  updateKnownPlate,
  removeKnownPlate,
  addTagToPlate,
  removeTagFromPlate,
  getPlateHistory,
  getPlateReads,
  getAllPlates,
  getPlateInsights,
  getKnownPlates,
  togglePlateFlag,
  getMetrics,
  getFlaggedPlates,
  removePlate,
  removePlateRead,
  getPool,
  resetPool,
  updateNotificationPriorityDB,
  getTagsForPlate,
  correctAllPlateReads,
  getDistinctCameraNames,
  updatePlateRead,
  updateAllPlateReads,
  togglePlateIgnore,
  getPlateImagePreviews,
  backfillOccurrenceCounts,
  clearImageDataWithPathVerification,
  updateImagePaths,
  getRecordsToMigrate,
  clearImageDataBatch,
  updateImagePathsBatch,
  getTotalRecordsToMigrate,
  getTotalPlatesCount,
  getEarliestPlateData,
  verifyImageMigration,
  checkUpdateStatus,
  markUpdateComplete,
  updateTagName,
  getTrainingRecordCount,
  confirmPlateRecord,
  getMqttBrokers,
  getMqttNotifications,
  addMqttNotification,
  editMqttNotification,
  toggleMqttNotificationEnabled,
  deleteMqttNotification,
  addUnseenPlate,
} from "@/lib/db";
import {
  getNotificationPlates as getNotificationPlatesDB,
  addNotificationPlate as addNotificationPlateDB,
  toggleNotification as toggleNotificationDB,
  deleteNotification as deleteNotificationDB,
} from "@/lib/db";

import { revalidatePath, revalidateTag, unstable_noStore } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { createHash } from "crypto";
import { execSync } from "child_process";
import { getConfig, saveConfig } from "@/lib/settings";
import {
  createSession,
  invalidateSession,
  verifyPassword, // The function that handles both old/new hashes
  hashPasswordBcrypt, // New export to create a bcrypt hash
  getAuthConfig, // Need this to update config
  updateAuthConfig, // Need this to save updated config
} from "@/lib/auth";
import { formatTimeRange } from "@/lib/utils";
import path from "path";
import os from "os";
import fs from "fs/promises";
import split2 from "split2";
import fileStorage from "@/lib/fileStorage";
import { getLocalVersionInfo } from "@/lib/version";
import TrainingDataGenerator from "@/lib/training";

export async function handleGetTags() {
  return await dbGetTags();
}

export async function handleCreateTag(tagName, color) {
  return await dbCreateTag(tagName, color);
}

export async function handleDeleteTag(tagName) {
  return await dbDeleteTag(tagName);
}

export async function getDashboardMetrics(
  timeZone,
  startDate,
  endDate,
  cameraName
) {
  console.log("Fetching dashboard metrics");
  try {
    const metrics = await getMetrics(startDate, endDate, cameraName);

    // Pre-initialize the hourCounts array
    const hourCounts = new Array(24).fill(0);

    // Single pass through the data to aggregate by hour
    if (metrics.time_data) {
      metrics.time_data.forEach((read) => {
        const timestamp = new Date(read.timestamp);
        const localTimestamp = new Date(
          timestamp.toLocaleString("en-US", { timeZone })
        );
        const localHour = localTimestamp.getHours();
        hourCounts[localHour] += read.frequency;
      });
    }

    // Convert to final format in one go
    const timeDistribution = hourCounts.map((frequency, hour_block) => ({
      hour_block,
      frequency,
    }));

    // Process tag stats
    const tagStats = metrics.tag_stats || [];
    const totalTaggedPlates = tagStats.reduce((sum, tag) => sum + tag.count, 0);

    // Process camera stats
    const cameraData = metrics.camera_counts || [];

    return {
      ...metrics,
      time_distribution: timeDistribution,
      camera_counts: cameraData,
      tag_stats: tagStats.map((tag) => ({
        ...tag,
        percentage: ((tag.count / totalTaggedPlates) * 100).toFixed(1),
      })),
    };
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return {
      time_distribution: [],
      camera_counts: [],
      total_plates_count: 0,
      total_reads: 0,
      unique_plates: 0,
      new_plates_count: 0,
      suspicious_count: 0,
      top_plates: [],
      tag_stats: [],
    };
  }
}

export async function deleteTagFromPlate(formData) {
  console.log("Deleting tag from plate");
  try {
    const plateNumber = formData.get("plateNumber");
    const tagName = formData.get("tagName");
    await removeTagFromPlate(plateNumber, tagName);
    return { success: true };
  } catch (error) {
    console.error("Error removing tag from plate:", error);
    return { success: false, error: "Failed to remove tag from plate" };
  }
}

export async function deletePlate(formData) {
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

export async function deletePlateFromDB(formData) {
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

export async function deletePlateRead(formData) {
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

export async function getKnownPlatesList() {
  console.log("Fetching known plates");
  try {
    console.log("known plates action run");
    return { success: true, data: await getKnownPlates() };
  } catch (error) {
    console.error("Error getting known plates:", error);
    return { success: false, error: "Failed to get known plates" };
  }
}

export async function getTags() {
  console.log("Fetching tags");
  try {
    return { success: true, data: await getAvailableTags() };
  } catch (error) {
    console.error("Error getting tags:", error);
    return { success: false, error: "Failed to get tags" };
  }
}

export async function addTag(formData) {
  console.log("Adding tag");
  try {
    const name = formData.get("name");
    const color = formData.get("color") || "#808080";
    const tag = await createTag(name, color);
    return { success: true, data: tag };
  } catch (error) {
    console.error("Error creating tag:", error);
    return { success: false, error: "Failed to create tag" };
  }
}

export async function updateTag(formData) {
  console.log("Updating tag");
  try {
    const newName = formData.get("name");
    const color = formData.get("color");
    const originalName = formData.get("originalName");

    let updatedTag;

    if (originalName !== newName) {
      updatedTag = await updateTagName(originalName, newName);
    }

    updatedTag = await updateTagColor(updatedTag?.name || originalName, color);

    return { success: true, data: updatedTag };
  } catch (error) {
    console.error("Error updating tag:", error);
    return { success: false, error: "Failed to update tag" };
  }
}

export async function removeTag(formData) {
  console.log("Deleting tag");
  try {
    const name = formData.get("name");
    await deleteTag(name);
    return { success: true };
  } catch (error) {
    console.error("Error deleting tag:", error);
    return { success: false, error: "Failed to delete tag" };
  }
}

export async function addKnownPlate(formData) {
  console.log("Adding known plate");
  try {
    const plateNumber = formData.get("plateNumber");
    const name = formData.get("name");
    const notes = formData.get("notes") || null;

    const plate = await updateKnownPlate(plateNumber, { name, notes });
    return { success: true, data: plate };
  } catch (error) {
    console.error("Error adding known plate:", error);
    return { success: false, error: "Failed to add known plate" };
  }
}

export async function tagPlate(formData) {
  console.log("Adding tag to plate");
  try {
    const plateNumber = formData.get("plateNumber");
    const tagName = formData.get("tagName");

    // Check if tag already exists on plate
    const existingTags = await getTagsForPlate(plateNumber);
    if (existingTags.includes(tagName)) {
      return {
        success: false,
        error: `Tag "${tagName}" is already added to this plate`,
      };
    }

    await addTagToPlate(plateNumber, tagName);
    return { success: true };
  } catch (error) {
    console.error("Error adding tag to plate:", error);
    return { success: false, error: "Failed to add tag to plate" };
  }
}

export async function untagPlate(formData) {
  console.log("Removing tag from plate");
  try {
    const plateNumber = formData.get("plateNumber");
    const tagName = formData.get("tagName");
    await removeTagFromPlate(plateNumber, tagName);
    return { success: true };
  } catch (error) {
    console.error("Error removing tag from plate:", error);
    return { success: false, error: "Failed to remove tag from plate" };
  }
}

export async function getPlateHistoryData(plateNumber) {
  console.log("Fetching plate history");
  try {
    return { success: true, data: await getPlateHistory(plateNumber) };
  } catch (error) {
    console.error("Error getting plate history:", error);
    return { success: false, error: "Failed to get plate history" };
  }
}

export async function getPlates(
  page = 1,
  pageSize = 25,
  sortConfig = { key: "last_seen_at", direction: "desc" },
  filters = {}
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

export async function fetchPlateInsights(formDataOrPlateNumber, timeZone) {
  console.log("Fetching plate insights");
  const config = await getConfig();
  try {
    let plateNumber;
    if (formDataOrPlateNumber instanceof FormData) {
      plateNumber = formDataOrPlateNumber.get("plateNumber");
    } else {
      plateNumber = formDataOrPlateNumber;
    }

    if (!plateNumber) {
      return { success: false, error: "Plate number is required" };
    }

    const insights = await getPlateInsights(plateNumber);

    // Create an array with all 24 hour blocks
    const hourCounts = new Array(24).fill(0);

    if (insights.time_data) {
      insights.time_data.forEach((read) => {
        const timestamp = new Date(read.timestamp);
        const localTimestamp = new Date(
          timestamp.toLocaleString("en-US", { timeZone: timeZone || "UTC" })
        );
        const localHour = localTimestamp.getHours();
        hourCounts[localHour] += read.frequency;
      });
    }

    const timeDistribution = hourCounts.map((frequency, hour) => ({
      hour_block: hour, // Pass the raw hour
      frequency,
    }));

    const mostActiveTime =
      timeDistribution.length > 0
        ? timeDistribution.reduce((max, current) =>
            current.frequency > max.frequency ? current : max
          ).hour_block
        : "No data available";

    return {
      success: true,
      data: {
        plateNumber: insights.plate_number,
        knownName: insights.known_name,
        notes: insights.notes,
        summary: {
          firstSeen: insights.first_seen_at,
          lastSeen: insights.last_seen_at,
          totalOccurrences: insights.total_occurrences,
        },
        tags: insights.tags || [],
        timeDistribution: timeDistribution,
        recentReads: insights.recent_reads || [],
        mostActiveTime: mostActiveTime,
      },
      timeFormat: config.general.timeFormat || 12,
    };
  } catch (error) {
    console.error("Failed to get plate insights:", error);
    return { success: false, error: "Failed to get plate insights" };
  }
}

export async function alterPlateFlag(formData) {
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

export async function addNotificationPlate(formData) {
  console.log("Adding notification plate");
  const plateNumber = formData.get("plateNumber");
  const result = await addNotificationPlateDB(plateNumber);
  revalidatePath("/notifications");
  return result;
}

export async function toggleNotification(formData) {
  console.log("Toggling notification");
  const plateNumber = formData.get("plateNumber");
  const enabled = formData.get("enabled") === "true";
  const result = await toggleNotificationDB(plateNumber, enabled);
  revalidatePath("/notifications");
  return result;
}

export async function deleteNotification(formData) {
  console.log("Deleting notification");
  try {
    const plateNumber = formData.get("plateNumber");
    console.log("Server action received plateNumber:", plateNumber);
    await deleteNotificationDB(plateNumber);
    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false, error: "Failed to delete notification" };
  }
}

// MQTT Notification Actions
export async function getMqttBrokersAction() {
  try {
    const brokers = await getMqttBrokers();
    return { success: true, data: brokers };
  } catch (error) {
    console.error("Error fetching MQTT brokers:", error);
    return { success: false, error: "Failed to fetch MQTT brokers" };
  }
}

export async function getMqttNotificationsAction() {
  try {
    const notifications = await getMqttNotifications();
    return { success: true, data: notifications };
  } catch (error) {
    console.error("Error fetching MQTT notifications:", error);
    return { success: false, error: "Failed to fetch MQTT notifications" };
  }
}

export async function addMqttNotificationAction(formData) {
  try {
    const plateNumber = formData.get("plateNumber");
    const name = formData.get("name");
    const brokerId = formData.get("brokerId");
    const message = formData.get("message");
    const includeKnownPlateInfo =
      formData.get("includeKnownPlateInfo") === "true";

    const result = await addMqttNotification(
      plateNumber,
      name,
      brokerId,
      message,
      includeKnownPlateInfo
    );
    revalidatePath("/notifications");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error adding MQTT notification:", error);
    return { success: false, error: "Failed to add MQTT notification" };
  }
}

export async function editMqttNotificationAction(formData) {
  try {
    const id = formData.get("id");
    const plateNumber = formData.get("plateNumber");
    const name = formData.get("name");
    const brokerId = formData.get("brokerId");
    const message = formData.get("message");
    const includeKnownPlateInfo =
      formData.get("includeKnownPlateInfo") === "true";

    const result = await editMqttNotification(
      id,
      plateNumber,
      name,
      brokerId,
      message,
      includeKnownPlateInfo
    );
    revalidatePath("/notifications");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error editing MQTT notification:", error);
    return { success: false, error: "Failed to edit MQTT notification" };
  }
}

export async function toggleMqttNotificationAction(formData) {
  try {
    const id = formData.get("id");
    const enabled = formData.get("enabled") === "true";

    const result = await toggleMqttNotificationEnabled(id, enabled);
    revalidatePath("/notifications");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error toggling MQTT notification:", error);
    return { success: false, error: "Failed to toggle MQTT notification" };
  }
}

export async function deleteMqttNotificationAction(formData) {
  try {
    const id = formData.get("id");
    await deleteMqttNotification(id);
    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    console.error("Error deleting MQTT notification:", error);
    return { success: false, error: "Failed to delete MQTT notification" };
  }
}

export async function testMqttNotificationAction(formData) {
  try {
    const { testMqttNotification } = await import("@/lib/mqtt-client");
    const id = formData.get("id");

    const result = await testMqttNotification(parseInt(id));
    return result;
  } catch (error) {
    console.error("Error testing MQTT notification:", error);
    return { success: false, error: "Failed to test MQTT notification" };
  }
}

export async function updateNotificationPriority(formData) {
  console.log("Updating notification priority");
  try {
    // When using Select component, the values come directly as arguments
    // not as FormData
    const plateNumber = formData.plateNumber;
    const priority = parseInt(formData.priority);

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

const SESSION_EXPIRATION_SECONDS = 24 * 60 * 60;

export async function loginAction(formData) {
  console.log("Attempting login...");
  const password = formData.get("password");

  if (!password) {
    return { error: "Password is required" };
  }

  try {
    const config = await getAuthConfig(); // Get current config to check hash type
    const storedHash = config.password;

    const isPasswordValid = await verifyPassword(password); // This verifies against whatever hash type is stored

    if (!isPasswordValid) {
      console.log("Invalid password attempt");
      return { error: "Invalid password" };
    }

    // --- Password Migration Logic ---
    // If the stored password is an old SHA256 hash (doesn't start with '$2'),
    // re-hash the provided plaintext password to bcrypt and save it.
    if (!storedHash.startsWith("$2")) {
      console.log("Old SHA256 password verified. Migrating to bcrypt...");
      const newBcryptHash = await hashPasswordBcrypt(password);
      config.password = newBcryptHash;
      await updateAuthConfig(config); // Save the updated config with the new hash
      console.log("Password successfully migrated to bcrypt.");
    }
    // --- End Password Migration Logic ---

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "Unknown Device";

    const sessionId = await createSession(userAgent);
    console.log("Created session ID:", sessionId);

    const cookieStore = await cookies();
    cookieStore.set("session", sessionId, {
      // httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: SESSION_EXPIRATION_SECONDS,
      path: "/",
    });

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);

    if (
      error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    return { error: "An unexpected error occurred during login" };
  }
}

export async function logoutAction() {
  "use server";

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  if (sessionId) {
    await invalidateSession(sessionId);
  }

  cookieStore.set("session", "", {
    // httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  redirect("/login");
}

export async function getSettings() {
  const config = await getConfig();
  return config;
}

export async function updateSettings(formData) {
  try {
    const currentConfig = await getConfig();

    const newConfig = { ...currentConfig };

    const updateIfExists = (key) => formData.get(key) !== null;

    //isolate sections so we don't erase other stuff
    if (updateIfExists("maxRecords") || updateIfExists("ignoreNonPlate")) {
      newConfig.general = {
        ...currentConfig.general,
        maxRecords: formData.get("maxRecords")
          ? parseInt(formData.get("maxRecords"))
          : currentConfig.general.maxRecords,
        retention: formData.get("retention")
          ? parseInt(formData.get("retention"))
          : currentConfig.general.retention,
        ignoreNonPlate: formData.get("ignoreNonPlate") === "true",
        timeFormat: formData.get("timeFormat")
          ? parseInt(formData.get("timeFormat"))
          : currentConfig.general.timeFormat,
      };
    }

    if (updateIfExists("mqttBroker") || updateIfExists("mqttTopic")) {
      newConfig.mqtt = {
        ...currentConfig.mqtt,
        broker: formData.get("mqttBroker") ?? currentConfig.mqtt.broker,
        topic: formData.get("mqttTopic") ?? currentConfig.mqtt.topic,
      };
    }

    if (
      updateIfExists("dbHost") ||
      updateIfExists("dbName") ||
      updateIfExists("dbUser") ||
      updateIfExists("dbPassword")
    ) {
      newConfig.database = {
        ...currentConfig.database,
        host: formData.get("dbHost") ?? currentConfig.database.host,
        name: formData.get("dbName") ?? currentConfig.database.name,
        user: formData.get("dbUser") ?? currentConfig.database.user,
        password:
          formData.get("dbPassword") === "••••••••"
            ? currentConfig.database.password
            : formData.get("dbPassword") ?? currentConfig.database.password,
      };
    }

    if (updateIfExists("pushoverEnabled")) {
      newConfig.notifications = {
        ...currentConfig.notifications,
        pushover: {
          ...currentConfig.notifications?.pushover,
          enabled: formData.get("pushoverEnabled") === "true",
          app_token:
            formData.get("pushoverAppToken") === "••••••••"
              ? currentConfig.notifications?.pushover?.app_token
              : formData.get("pushoverAppToken") ??
                currentConfig.notifications?.pushover?.app_token,
          user_key:
            formData.get("pushoverUserKey") === "••••••••"
              ? currentConfig.notifications?.pushover?.user_key
              : formData.get("pushoverUserKey") ??
                currentConfig.notifications?.pushover?.user_key,
          title:
            formData.get("pushoverTitle") ??
            currentConfig.notifications?.pushover?.title,
          priority: formData.get("pushoverPriority")
            ? parseInt(formData.get("pushoverPriority"))
            : currentConfig.notifications?.pushover?.priority,
          sound:
            formData.get("pushoverSound") ??
            currentConfig.notifications?.pushover?.sound,
        },
      };
    }

    if (updateIfExists("haEnabled") || updateIfExists("haWhitelist")) {
      newConfig.homeassistant = {
        ...currentConfig.homeassistant,
        enabled: formData.get("haEnabled") === "true",
        whitelist: formData.get("haWhitelist")
          ? JSON.parse(formData.get("haWhitelist"))
          : currentConfig.homeassistant?.whitelist || [],
      };
    }
    if (updateIfExists("metricsEnabled")) {
      newConfig.privacy = {
        ...currentConfig.privacy,
        metrics: formData.get("metricsEnabled") === "true",
      };
    }
    if (updateIfExists("bihost")) {
      newConfig.blueiris = {
        ...currentConfig.blueiris,
        host: formData.get("bihost"),
      };
    }
    if (updateIfExists("trainingEnabled") || updateIfExists("trainingName")) {
      newConfig.training = {
        ...currentConfig.training,
        enabled: formData.get("trainingEnabled") === "true",
        name: formData.get("trainingName"),
      };
    }
    const result = await saveConfig(newConfig);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating settings:", error);
    return { success: false, error: error.message };
  }
}

export async function updatePassword(formData) {
  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All password fields are required." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }

  if (newPassword.length < 8) {
    // Example: enforce minimum password length
    return { error: "New password must be at least 8 characters long." };
  }

  try {
    // 1. Verify the current password using the dedicated function
    const isCurrentPasswordValid = await verifyPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return { error: "Incorrect current password." };
    }

    // 2. Hash the new password using the dedicated function
    const newHashedPassword = await hashPasswordBcrypt(newPassword);

    // 3. Get the current auth config, update the password, and save it
    const config = await getAuthConfig();
    if (!config) {
      // This case should ideally not happen if getAuthConfig is robust
      return { error: "Authentication configuration could not be loaded." };
    }
    config.password = newHashedPassword;
    await updateAuthConfig(config); // Persist the change

    // 4. Invalidate all sessions for security after password change
    // This will force all existing users to re-login with the new password.
    const currentSessions = Object.keys(config.sessions); // Get session IDs before clearing
    // It's more efficient to clear the sessions in memory and then write once.
    config.sessions = {}; // Clear all sessions
    await updateAuthConfig(config); // Save the cleared sessions along with the new password

    console.log("Password updated successfully and all sessions invalidated.");
    return {
      success: true,
      message:
        "Password updated successfully. All active sessions have been logged out.",
    };
  } catch (error) {
    console.error("Error updating password:", error);
    return { error: "An error occurred while changing password." };
  }
}

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
    return { success: false, error: error.message };
  }
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

export async function correctPlateRead(formData) {
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

export async function getTimeFormat() {
  const config = await getConfig();
  return config.general.timeFormat;
}

export async function toggleIgnorePlate(formData) {
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

export async function fetchPlateImagePreviews(plateNumber, timeFrame) {
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

export async function getSystemLogs() {
  try {
    const logFile = path.join(process.cwd(), "logs", "app.log");
    const content = await fs.readFile(logFile, "utf8");

    return {
      success: true,
      data: content
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          try {
            // Try parsing as Winston JSON format
            const parsed = JSON.parse(line);
            return {
              timestamp: parsed.timestamp,
              level: parsed.level.toUpperCase(),
              // Strip ANSI color codes
              message: parsed.message.replace(/\u001b\[\d+m/g, ""),
            };
          } catch (e) {
            // Fall back to old format if it's not JSON
            const [timestamp, rest] = line.split(" [");
            const [level, ...messageParts] = rest.split("] ");
            return {
              timestamp,
              level,
              message: messageParts.join("] "),
            };
          }
        }),
    };
  } catch (error) {
    console.error("Error reading logs:", error);
    return { success: false, error: "Failed to read system logs" };
  }
}

export async function dbBackfill() {
  console.warn("Backfilling occurrence counts...");
  return await backfillOccurrenceCounts();
}

export async function migrateImageDataToFiles() {
  console.log("Starting image data migration...");

  try {
    const totalRecords = await getTotalRecordsToMigrate();
    console.log(`Total records to migrate: ${totalRecords}`);

    let processed = 0;
    let errors = 0;
    let lastId = 0;
    const BATCH_SIZE = 100;

    while (true) {
      const records = await getRecordsToMigrate(BATCH_SIZE, lastId);
      if (records.length === 0) break;

      const updates = [];

      for (const record of records) {
        try {
          const { imagePath, thumbnailPath } =
            await fileStorage.migrateBase64ToFile(
              record.image_data,
              record.plate_number,
              record.timestamp
            );

          updates.push({ id: record.id, imagePath, thumbnailPath });
          processed++;
        } catch (error) {
          console.error(`Error processing record ${record.id}:`, error);
          errors++;
        }

        lastId = record.id;
      }

      if (updates.length > 0) {
        try {
          await updateImagePathsBatch(updates);
        } catch (error) {
          console.error("Error updating batch:", error);
          errors += updates.length;
          processed -= updates.length;
        }
      }

      console.log(
        `Processed ${processed}/${totalRecords} records (${errors} errors)`
      );
    }

    return {
      success: true,
      processed,
      errors,
      totalRecords,
    };
  } catch (error) {
    console.error("Migration failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function clearImageData() {
  console.log("Starting image data cleanup...");

  try {
    let totalCleared = 0;
    let batchCount;

    do {
      batchCount = await clearImageDataBatch(1000);
      totalCleared += batchCount;
      console.log(`Cleared ${totalCleared} records...`);
    } while (batchCount > 0);

    return {
      success: true,
      clearedCount: totalCleared,
    };
  } catch (error) {
    console.error("Cleanup failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function sendMetricsUpdate() {
  console.log("[Metrics] Reporting usage metrics...");
  try {
    const [earliestPlate, totalPlates] = await Promise.all([
      getEarliestPlateData(),
      getTotalPlatesCount(),
    ]);

    if (!earliestPlate) return null;

    // Get system identifier that should be stable
    let systemId;
    try {
      systemId = execSync("cat /etc/machine-id").toString().trim();
    } catch {
      try {
        systemId = execSync("cat /etc/hostname").toString().trim();
      } catch {
        systemId = execSync("uname -a").toString().trim();
      }
    }

    const fingerprint = createHash("sha256")
      .update(
        `${earliestPlate.plate_number}:${earliestPlate.first_seen_at}:${systemId}`
      )
      .digest("hex");

    const payload = {
      fingerprint,
      totalPlates,
      version: await getLocalVersionInfo(),
    };

    const response = await fetch("https://alpr-metrics.algertc.workers.dev/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Error sending metrics:", error);
    return false;
  }
}

export async function checkUpdateRequired() {
  try {
    const updateStatus = await checkUpdateStatus();
    return !updateStatus;
  } catch (error) {
    console.error("Error checking update status:", error);
    return false;
  }
}

export async function completeUpdate() {
  try {
    await markUpdateComplete();
    return { success: true };
  } catch (error) {
    console.error("Error marking update complete:", error);
    return { success: false, error: error.message };
  }
}

export async function skipImageMigration() {
  try {
    const verificationResult = await verifyImageMigration();

    if (!verificationResult.success) {
      return {
        success: false,
        error: "Could not verify migration status",
      };
    }

    if (!verificationResult.isComplete) {
      return {
        success: false,
        error: `Cannot skip migration: ${verificationResult.incompleteCount} records still need migration`,
      };
    }

    await completeUpdate();
    return { success: true };
  } catch (error) {
    console.error("Error in skipImageMigration:", error);
    return { success: false, error: error.message };
  }
}

export async function generateTrainingData() {
  try {
    const config = await getConfig();

    console.log("Starting training data generation and upload process");
    const tmpDir = path.join(os.tmpdir(), "alpr-training-" + Date.now());
    const generator = new TrainingDataGenerator(tmpDir);
    await generator.generateAndUpload();

    return {
      success: true,
      ocrCount: generator.stats.ocr.totalCount,
      licensePlateCount: generator.stats.licensePlate.totalCount,
      message: "Training data generated and uploaded successfully",
    };
  } catch (error) {
    console.error("Error generating training data:", error);
    throw new Error(error.message || "Failed to generate training data");
  }
}

export async function processTrainingData() {
  try {
    // Check if training is enabled in settings
    const config = await getConfig();
    if (!config?.training?.enabled) {
      return { success: false, message: "Training not enabled" };
    }

    // Check if we have enough records
    const { newRecordsCount } = await getTrainingRecordCount();
    if (newRecordsCount < 500) {
      return { success: false, message: "Not enough new records" };
    }

    // Create temp directory
    const tempDir = path.join(os.tmpdir(), `alpr-training-${Date.now()}`);

    // Start the generator
    const generator = new TrainingDataGenerator(tempDir);
    await generator.generateAndUpload();

    return { success: true };
  } catch (error) {
    console.error("Error processing training data:", error);
    return { success: false, error: error.message };
  }
}

export async function validatePlateRecord(readId, value) {
  try {
    await confirmPlateRecord(readId, value);

    return { success: true };
  } catch (error) {
    console.error("Error validating plate record:", error);
    return { success: false, error: "Failed to validate plate record" };
  }
}

export async function addDBPlate(plate_number, flagged = false) {
  try {
    await addUnseenPlate(plate_number, flagged);
    revalidatePath("/flagged");
    return { success: true };
  } catch (error) {
    console.error("Error adding plate:", error);
    return { success: false, error: "Failed to add plate" };
  }
}
