import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";

const CONFIG_FILE = path.join(process.cwd(), "config", "settings.yaml");

const DEFAULT_CONFIG = {
  general: {
    maxRecords: 100000,
    ignoreNonPlate: false,
    timeFormat: 12,
    retention: 3,
  },
  mqtt: {
    broker: "",
    topic: "alpr/plates",
  },
  database: {
    host: "db:5432",
    name: "postgres",
    user: "postgres",
    password: "password",
  },
  notifications: {
    pushover: {
      enabled: false,
      app_token: "",
      user_key: "",
      priority: 1,
      sound: "pushover", // Default Pushover sound
      title: "ALPR Alert",
    },
  },
  homeassistant: {
    enabled: false,
    whitelist: [],
  },
  blueiris: {
    host: "Your Blue Iris Hostname or IP address",
  },
  privacy: {
    metrics: true,
  },
  training: {
    enabled: true,
    name: "",
  },
};

function getInitialEnvConfig() {
  return {
    general: {
      maxRecords: process.env.MAX_RECORDS
        ? parseInt(process.env.MAX_RECORDS)
        : DEFAULT_CONFIG.general.maxRecords,
      ignoreNonPlate: process.env.IGNORE_NON_PLATE
        ? process.env.IGNORE_NON_PLATE === "true"
        : DEFAULT_CONFIG.general.ignoreNonPlate,
      timeFormat: DEFAULT_CONFIG.general.timeFormat,
      retention: DEFAULT_CONFIG.general.retention,
    },
    mqtt: {
      broker: process.env.MQTT_BROKER || DEFAULT_CONFIG.mqtt.broker,
      topic: process.env.MQTT_TOPIC || DEFAULT_CONFIG.mqtt.topic,
    },
    database: {
      host: process.env.DB_HOST || DEFAULT_CONFIG.database.host,
      name: process.env.DB_NAME || DEFAULT_CONFIG.database.name,
      user: process.env.DB_USER || DEFAULT_CONFIG.database.user,
      password: process.env.DB_PASSWORD || DEFAULT_CONFIG.database.password,
    },
    notifications: {
      pushover: {
        enabled: process.env.PUSHOVER_ENABLED === "true",
        app_token:
          process.env.PUSHOVER_APP_TOKEN ||
          DEFAULT_CONFIG.notifications.pushover.app_token,
        user_key:
          process.env.PUSHOVER_USER_KEY ||
          DEFAULT_CONFIG.notifications.pushover.user_key,
        priority: process.env.PUSHOVER_PRIORITY
          ? parseInt(process.env.PUSHOVER_PRIORITY)
          : DEFAULT_CONFIG.notifications.pushover.priority,
        sound:
          process.env.PUSHOVER_SOUND ||
          DEFAULT_CONFIG.notifications.pushover.sound,
        title:
          process.env.PUSHOVER_TITLE ||
          DEFAULT_CONFIG.notifications.pushover.title,
      },
    },
    homeassistant: {
      enabled: DEFAULT_CONFIG.homeassistant.enabled,
      whitelist: DEFAULT_CONFIG.homeassistant.whitelist,
    },
    blueiris: {
      host: DEFAULT_CONFIG.privacy.metrics,
    },
    privacy: {
      metrics: process.env.METRICS || DEFAULT_CONFIG.privacy.metrics,
    },
    training: {
      enabled: process.env.AI_TRAINING || DEFAULT_CONFIG.training.enabled,
      name: DEFAULT_CONFIG.training.name,
    },
  };
}

async function ensureConfigDir() {
  const configDir = path.dirname(CONFIG_FILE);
  try {
    await fs.access(configDir);
  } catch {
    await fs.mkdir(configDir, { recursive: true });
  }
}

async function readConfigFile() {
  try {
    const fileContents = await fs.readFile(CONFIG_FILE, "utf8");
    // console.log("Reading config file:", fileContents);
    const config = yaml.load(fileContents);
    // console.log("Parsed config:", config);
    return config;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("No config file found");
      return null;
    }
    throw error;
  }
}

async function initializeConfigFile() {
  console.log("Initializing config file with environment values");
  const initialConfig = getInitialEnvConfig();
  const yamlString = yaml.dump(initialConfig);
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, yamlString, "utf8");
  return initialConfig;
}

export async function getConfig() {
  try {
    let fileConfig = await readConfigFile();

    // If no config file exists, initialize it with environment/default values
    if (!fileConfig) {
      console.log("Creating initial config file from environment variables");
      fileConfig = await initializeConfigFile();
      return fileConfig;
    }

    // If config file exists, use it with defaults as fallback
    const finalConfig = {
      general: { ...DEFAULT_CONFIG.general, ...fileConfig.general },
      mqtt: { ...DEFAULT_CONFIG.mqtt, ...fileConfig.mqtt },
      database: { ...DEFAULT_CONFIG.database, ...fileConfig.database },
      notifications: {
        pushover: {
          ...DEFAULT_CONFIG.notifications.pushover,
          ...fileConfig.notifications?.pushover,
        },
      },
      homeassistant: {
        ...DEFAULT_CONFIG.homeassistant,
        ...fileConfig.homeassistant,
      },
      blueiris: {
        ...DEFAULT_CONFIG.blueiris,
        ...fileConfig.blueiris,
      },
      privacy: {
        ...DEFAULT_CONFIG.privacy,
        ...fileConfig.privacy,
      },
      training: {
        ...DEFAULT_CONFIG.training,
        ...fileConfig.training,
      },
    };

    // console.log("Using existing config file:", finalConfig);
    return finalConfig;
  } catch (error) {
    console.error("Error reading config:", error);
    return getInitialEnvConfig(); // Fallback to env/defaults only on error
  }
}

export async function isFirstRun() {
  try {
    await fs.access(CONFIG_FILE);
    return false;
  } catch {
    return true;
  }
}

export async function saveConfig(newConfig) {
  try {
    // Ensure all required fields exist by merging with defaults
    const configToSave = {
      general: {
        ...DEFAULT_CONFIG.general,
        ...newConfig.general,
      },
      mqtt: {
        ...DEFAULT_CONFIG.mqtt,
        ...newConfig.mqtt,
      },
      database: {
        ...DEFAULT_CONFIG.database,
        ...newConfig.database,
      },
      notifications: {
        pushover: {
          ...DEFAULT_CONFIG.notifications.pushover,
          ...newConfig.notifications?.pushover,
        },
      },
      homeassistant: {
        ...DEFAULT_CONFIG.homeassistant,
        ...newConfig.homeassistant,
      },
      blueiris: {
        ...DEFAULT_CONFIG.blueiris,
        ...newConfig.blueiris,
      },
      privacy: {
        ...DEFAULT_CONFIG.privacy,
        ...newConfig.privacy,
      },
      training: {
        ...DEFAULT_CONFIG.training,
        ...newConfig.training,
      },
    };

    await ensureConfigDir();
    const yamlString = yaml.dump(configToSave);
    await fs.writeFile(CONFIG_FILE, yamlString, "utf8");

    return { success: true, data: configToSave };
  } catch (error) {
    console.error("Error saving config:", error);
    return { success: false, error: "Failed to save configuration" };
  }
}
