import mqtt from "mqtt";
import { getMqttBrokerInfo, getMqttNotifications } from "./db.js";
import { getKnownPlates } from "./db.js";

// Cache for MQTT clients to avoid creating multiple connections
const clientCache = new Map();

async function getMqttClient(brokerInfo) {
  const cacheKey = `${brokerInfo.broker}:${brokerInfo.port}`;

  if (clientCache.has(cacheKey)) {
    const cachedClient = clientCache.get(cacheKey);
    if (cachedClient.connected) {
      return cachedClient;
    } else {
      // Remove disconnected client from cache
      clientCache.delete(cacheKey);
    }
  }

  // Use TLS based on explicit broker configuration
  const protocol = brokerInfo.useTls ? "mqtts" : "mqtt";
  const brokerUrl = `${protocol}://${brokerInfo.broker}:${brokerInfo.port}`;

  const connectOptions = {
    connectTimeout: 10000,
    reconnectPeriod: 0, // Don't auto-reconnect for one-off messages
    keepalive: 60,
    clean: true,
  };

  // Add SSL/TLS options for secure connections
  if (brokerInfo.useTls) {
    connectOptions.rejectUnauthorized = true; // Set to false if using self-signed certificates
  }

  // Add authentication if provided
  if (brokerInfo.username && brokerInfo.password) {
    connectOptions.username = brokerInfo.username;
    connectOptions.password = brokerInfo.password;
  }

  try {
    console.log(`Attempting to connect to MQTT broker: ${brokerUrl}`);
    console.log(`Connection options:`, {
      ...connectOptions,
      password: connectOptions.password ? "[REDACTED]" : undefined,
    });

    const client = mqtt.connect(brokerUrl, connectOptions);

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`MQTT connection timeout after 15s to ${brokerUrl}`));
      }, 15000);

      client.on("connect", () => {
        clearTimeout(timeout);
        console.log(`✅ Successfully connected to MQTT broker: ${brokerUrl}`);
        resolve();
      });

      client.on("error", (error) => {
        clearTimeout(timeout);
        console.error(
          `❌ MQTT connection error to ${brokerUrl}:`,
          error.message
        );
        reject(new Error(`MQTT connection failed: ${error.message}`));
      });

      client.on("offline", () => {
        console.warn(`⚠️ MQTT client went offline: ${brokerUrl}`);
      });

      client.on("reconnect", () => {
        console.log(`🔄 MQTT client attempting to reconnect: ${brokerUrl}`);
      });
    });

    // Cache the client for reuse
    clientCache.set(cacheKey, client);

    // Clean up cache when client disconnects
    client.on("close", () => {
      clientCache.delete(cacheKey);
    });

    return client;
  } catch (error) {
    console.error(`Failed to connect to MQTT broker ${brokerUrl}:`, error);
    throw error;
  }
}

async function buildMqttPayload(
  plateNumber,
  notificationConfig,
  brokerInfo,
  plateData = null,
  isTest = false
) {
  if (isTest) {
    return JSON.stringify({
      plate_number: "TEST123",
      camera: "Test Camera",
      timestamp: new Date().toLocaleString(),
      message: "This is a test MQTT notification",
    });
  }

  // Get camera name and timestamp from plateData
  const cameraName =
    plateData?.camera_name || plateData?.camera || "Unknown Camera";
  const timestamp = plateData?.timestamp
    ? new Date(plateData.timestamp).toLocaleString()
    : new Date().toLocaleString();

  let plateDisplayName = plateNumber;
  let tags = [];

  // Fetch known plate info and tags
  try {
    const knownPlates = await getKnownPlates();
    const knownPlate = knownPlates.find(
      (kp) => kp.plate_number === plateNumber
    );

    if (knownPlate && knownPlate.name) {
      plateDisplayName = knownPlate.name;
    }

    if (knownPlate && knownPlate.tags && knownPlate.tags.length > 0) {
      tags = knownPlate.tags.map((tag) => tag.name || tag);
    }
  } catch (error) {
    console.error("Error fetching known plate info for MQTT:", error);
  }

  // Create JSON payload similar to Blue Iris format
  const payload = {
    plate_name: plateDisplayName !== plateNumber ? plateDisplayName : null,
    plate_number: plateNumber,
    camera: cameraName,
    timestamp: timestamp,
  };

  // Add tags if available
  if (tags.length > 0) {
    payload.tags = tags;
  }

  // Add custom message if provided
  if (notificationConfig.message && notificationConfig.message.trim()) {
    payload.message = notificationConfig.message.trim();
  }

  return JSON.stringify(payload);
}

export async function sendMqttNotification(
  notificationId,
  plateData = null,
  isTest = false
) {
  let client = null;

  try {
    // Get notification configuration
    const notifications = await getMqttNotifications();
    const notificationConfig = notifications.find(
      (n) => n.id === notificationId
    );

    if (!notificationConfig) {
      throw new Error(`MQTT notification with ID ${notificationId} not found`);
    }

    if (!notificationConfig.enabled && !isTest) {
      throw new Error(
        `MQTT notification ${notificationConfig.name} is disabled`
      );
    }

    // Get broker information
    const brokerInfo = {
      broker: notificationConfig.broker_url,
      port: notificationConfig.broker_port,
      topic: notificationConfig.broker_topic,
      username: notificationConfig.broker_username,
      password: notificationConfig.broker_password,
      useTls: notificationConfig.broker_use_tls || false,
      name: notificationConfig.broker_name,
    };

    if (!brokerInfo.broker || !brokerInfo.topic) {
      throw new Error(
        `Invalid broker configuration for notification ${notificationConfig.name}`
      );
    }

    // Get MQTT client
    client = await getMqttClient(brokerInfo);

    // Build message payload
    const payload = await buildMqttPayload(
      notificationConfig.plate_number,
      notificationConfig,
      brokerInfo,
      plateData,
      isTest
    );

    // Publish message (payload is already a JSON string)
    await new Promise((resolve, reject) => {
      client.publish(brokerInfo.topic, payload, { qos: 1 }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    console.log(
      `MQTT notification sent to ${brokerInfo.broker}:${brokerInfo.port}/${brokerInfo.topic}`
    );

    return {
      success: true,
      message: `MQTT notification sent successfully to ${brokerInfo.name}`,
      payload,
    };
  } catch (error) {
    console.error("MQTT notification error:", error);
    return {
      success: false,
      error: error.message || "Failed to send MQTT notification",
    };
  } finally {
    // Don't close the client here since we're caching it
    // It will auto-close after some time of inactivity
  }
}

export async function sendMqttNotificationByPlate(
  plateNumber,
  plateData = null
) {
  try {
    // Get all MQTT notifications for this plate
    const notifications = await getMqttNotifications();
    const plateNotifications = notifications.filter(
      (n) => n.plate_number === plateNumber && n.enabled
    );

    if (plateNotifications.length === 0) {
      return {
        success: true,
        message: `No enabled MQTT notifications found for plate ${plateNumber}`,
        sent: 0,
      };
    }

    const results = [];
    let successCount = 0;

    // Send notification to each configured broker
    for (const notification of plateNotifications) {
      const result = await sendMqttNotification(
        notification.id,
        plateData,
        false
      );
      results.push({
        notification_name: notification.name,
        broker_name: notification.broker_name,
        ...result,
      });

      if (result.success) {
        successCount++;
      }
    }

    return {
      success: successCount > 0,
      message: `Sent ${successCount}/${plateNotifications.length} MQTT notifications for plate ${plateNumber}`,
      sent: successCount,
      total: plateNotifications.length,
      results,
    };
  } catch (error) {
    console.error("Error sending MQTT notifications by plate:", error);
    return {
      success: false,
      error: error.message || "Failed to send MQTT notifications",
    };
  }
}

export async function testMqttNotification(notificationId) {
  return await sendMqttNotification(notificationId, null, true);
}

// Cleanup function to close all cached connections
export function closeMqttConnections() {
  for (const [key, client] of clientCache.entries()) {
    try {
      if (client.connected) {
        client.end(true);
      }
    } catch (error) {
      console.error(`Error closing MQTT client ${key}:`, error);
    }
  }
  clientCache.clear();
}
