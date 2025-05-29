"use server";

import { revalidatePath } from "next/cache";
import { getConfig, saveConfig } from "@/lib/settings";

export async function getSettings() {
  const config = await getConfig();
  return config;
}

export async function updateSettings(formData: FormData) {
  try {
    const currentConfig = await getConfig();

    const newConfig = { ...currentConfig };

    const updateIfExists = (key: string) => formData.get(key) !== null;

    //isolate sections so we don't erase other stuff
    if (updateIfExists("maxRecords") || updateIfExists("ignoreNonPlate")) {
      newConfig.general = {
        ...currentConfig.general,
        maxRecords: formData.get("maxRecords")
          ? parseInt(formData.get("maxRecords") as string)
          : currentConfig.general.maxRecords,
        retention: formData.get("retention")
          ? parseInt(formData.get("retention") as string)
          : currentConfig.general.retention,
        ignoreNonPlate: formData.get("ignoreNonPlate") === "true",
        timeFormat: formData.get("timeFormat")
          ? parseInt(formData.get("timeFormat") as string)
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
            ? parseInt(formData.get("pushoverPriority") as string)
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
          ? JSON.parse(formData.get("haWhitelist") as string)
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
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Unknown error occurred" };
  }
}