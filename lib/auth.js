// lib/auth.js (refined initializeAuth)
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";

const AUTH_FILE = path.join(process.cwd(), "auth", "auth.json");
const MAX_SESSIONS_PER_USER = 5;
const SESSION_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours
const BCRYPT_SALT_ROUNDS = 10; // Recommended for bcrypt

let authCache = null;
let lastFileRead = 0;
const CACHE_TTL = 5000; // 5 seconds cache TTL
let writeQueue = Promise.resolve();

export async function hashPasswordBcrypt(password) {
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

function hashPasswordSha256(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function sanitizeUserAgent(userAgent) {
  return userAgent ? userAgent.substring(0, 255) : "Unknown Device";
}

async function atomicWrite(config) {
  writeQueue = writeQueue.then(async () => {
    try {
      const tempFile = AUTH_FILE + ".tmp";
      await fs.writeFile(tempFile, JSON.stringify(config, null, 2));
      await fs.rename(tempFile, AUTH_FILE);
      authCache = config;
      lastFileRead = Date.now();
    } catch (error) {
      console.error("Error writing auth file:", error);
      throw error;
    }
  });
  return writeQueue;
}

export async function initializeAuth() {
  if (process.env.NEXT_PHASE === "build") {
    return null;
  }

  try {
    await fs.mkdir(path.dirname(AUTH_FILE), { recursive: true });

    let config;
    try {
      const data = await fs.readFile(AUTH_FILE, "utf-8");
      config = JSON.parse(data);

      if (!config.sessions) {
        config.sessions = {};
        await atomicWrite(config);
      }

      // Check if password hash is SHA256 and log a warning.
      // No re-hashing can happen here, it must happen on user login.
      if (config.password && !config.password.startsWith("$2")) {
        console.warn(
          "Detected old SHA256 password hash. It will be migrated to bcrypt upon next successful login with the correct plaintext password."
        );
      }

      authCache = config;
      lastFileRead = Date.now();
      return config;
    } catch (error) {
      if (error.code === "ENOENT") {
        const envPassword = process.env.ADMIN_PASSWORD;
        if (!envPassword) {
          throw new Error(
            "ADMIN_PASSWORD environment variable must be set for initial setup"
          );
        }

        const hashedPassword = await hashPasswordBcrypt(envPassword);

        config = {
          password: hashedPassword,
          apiKey: crypto.randomBytes(32).toString("hex"),
          sessions: {},
        };

        await atomicWrite(config);
        return config;
      }
      console.error("Error reading auth file during initialization:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error initializing auth system:", error);
    throw error;
  }
}

export async function getAuthConfig() {
  if (process.env.NEXT_PHASE === "build") {
    return null;
  }

  const now = Date.now();

  if (authCache && now - lastFileRead < CACHE_TTL) {
    return authCache;
  }

  try {
    const data = await fs.readFile(AUTH_FILE, "utf-8");
    const config = JSON.parse(data);

    if (!config.sessions) {
      config.sessions = {};
    }

    authCache = config;
    lastFileRead = now;
    return config;
  } catch (error) {
    if (error.code === "ENOENT") {
      return await initializeAuth();
    }
    console.error("Error reading auth file:", error);
    throw error;
  }
}

export async function updateAuthConfig(newConfig) {
  if (!newConfig) return;
  if (process.env.NEXT_PHASE === "build") {
    return;
  }

  await atomicWrite(newConfig);
}

async function cleanExpiredSessions(config) {
  const now = Date.now();
  let hasChanges = false;

  Object.entries(config.sessions).forEach(([id, session]) => {
    if (now > session.expiresAt) {
      delete config.sessions[id];
      hasChanges = true;
    }
  });

  return hasChanges;
}

export async function createSession(userAgent) {
  const config = await getAuthConfig();
  if (!config) throw new Error("Auth configuration not available.");

  const needsCleanup = await cleanExpiredSessions(config);

  const activeSessions = Object.keys(config.sessions).length;
  if (activeSessions >= MAX_SESSIONS_PER_USER) {
    const oldestSession = Object.entries(config.sessions).sort(
      ([, a], [, b]) => a.createdAt - b.createdAt
    )[0];
    if (oldestSession) {
      delete config.sessions[oldestSession[0]];
      console.log(
        `Session limit reached. Removing oldest session: ${oldestSession[0]}`
      );
    }
  }

  const sessionId = crypto.randomBytes(32).toString("hex");
  config.sessions[sessionId] = {
    id: sessionId,
    userAgent: sanitizeUserAgent(userAgent),
    createdAt: Date.now(),
    lastUsed: Date.now(),
    expiresAt: Date.now() + SESSION_EXPIRATION_TIME,
  };

  await updateAuthConfig(config);
  return sessionId;
}

export async function verifySession(sessionId) {
  if (!sessionId) return false;

  const config = await getAuthConfig();
  if (!config) return false;

  const session = config.sessions[sessionId];
  if (!session) return false;

  const now = Date.now();
  if (now > session.expiresAt) {
    delete config.sessions[sessionId];
    await updateAuthConfig(config);
    return false;
  }

  if (now - session.lastUsed > 5 * 60 * 1000) {
    session.lastUsed = now;
    await updateAuthConfig(config);
  }

  return true;
}

export async function getSessionInfo(sessionId) {
  if (!sessionId) return null;

  const config = await getAuthConfig();
  if (!config) return null;

  const session = config.sessions[sessionId];
  if (!session) return null;

  return {
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    lastUsed: session.lastUsed,
    expiresAt: session.expiresAt,
  };
}

export async function verifyApiKey(apiKey) {
  if (!apiKey) return false;

  const config = await getAuthConfig();
  if (!config) return false;

  return apiKey === config.apiKey;
}

export async function verifyPassword(plainPassword) {
  if (!plainPassword) return false;

  const config = await getAuthConfig();
  if (!config) return false;

  const storedHash = config.password;

  if (
    storedHash.startsWith("$2a$") ||
    storedHash.startsWith("$2b$") ||
    storedHash.startsWith("$2y$")
  ) {
    return await bcrypt.compare(plainPassword, storedHash);
  } else {
    // This is where we verify old SHA256 hashes
    console.warn(
      "Verifying against old SHA256 hash. This will be migrated to bcrypt upon successful login."
    );
    return storedHash === hashPasswordSha256(plainPassword);
  }
}

export async function invalidateSession(sessionId) {
  if (!sessionId) return false;

  const config = await getAuthConfig();
  if (!config) return false;

  if (config.sessions[sessionId]) {
    delete config.sessions[sessionId];
    await updateAuthConfig(config);
    console.log(`Session invalidated: ${sessionId}`);
    return true;
  }

  return false;
}

export async function getActiveSessions() {
  const config = await getAuthConfig();
  if (!config) return [];

  const now = Date.now();
  await cleanExpiredSessions(config);

  return Object.values(config.sessions)
    .filter((session) => now <= session.expiresAt)
    .map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastUsed: session.lastUsed,
      expiresAt: session.expiresAt,
    }));
}
