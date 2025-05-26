import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const AUTH_FILE = path.join(process.cwd(), "auth", "auth.json");
const MAX_SESSIONS_PER_USER = 5;
const SESSION_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours

// wow this is dogshit
let authCache = null;
let lastFileRead = 0;
const CACHE_TTL = 5000; // 5 seconds cache TTL
let writeQueue = Promise.resolve();

export function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function sanitizeUserAgent(userAgent) {
  return userAgent ? userAgent.substring(0, 255) : "Unknown Device";
}

// Atomic file write with queue to prevent concurrent writes
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
  // Skip during build
  if (process.env.NEXT_PHASE === "build") {
    return null;
  }

  try {
    await fs.mkdir(path.dirname(AUTH_FILE), { recursive: true });

    let config;
    try {
      const data = await fs.readFile(AUTH_FILE, "utf-8");
      config = JSON.parse(data);

      // Initialize sessions if missing
      if (!config.sessions) {
        config.sessions = {};
      }

      authCache = config;
      lastFileRead = Date.now();
      return config;
    } catch (error) {
      // Only initialize if file doesn't exist
      if (error.code === "ENOENT") {
        const envPassword = process.env.ADMIN_PASSWORD;
        if (!envPassword) {
          throw new Error(
            "ADMIN_PASSWORD environment variable must be set for initial setup"
          );
        }

        config = {
          password: hashPassword(envPassword),
          apiKey: crypto.randomBytes(32).toString("hex"),
          sessions: {},
        };

        await atomicWrite(config);
        return config;
      }
      throw error;
    }
  } catch (error) {
    console.error("Error initializing auth:", error);
    throw error;
  }
}

export async function getAuthConfig() {
  // Skip during build
  if (process.env.NEXT_PHASE === "build") {
    return null;
  }

  const now = Date.now();

  // Use cache if it's fresh
  if (authCache && now - lastFileRead < CACHE_TTL) {
    return authCache;
  }

  try {
    const data = await fs.readFile(AUTH_FILE, "utf-8");
    const config = JSON.parse(data);

    // Initialize sessions if missing
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
    throw error;
  }
}

export async function updateAuthConfig(newConfig) {
  if (!newConfig) return;
  // Skip during build
  if (process.env.NEXT_PHASE === "build") {
    return;
  }

  await atomicWrite(newConfig);
}

// Clean expired sessions (run periodically, not on every request)
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
  if (!config) return null;

  // Clean up expired sessions
  const needsCleanup = await cleanExpiredSessions(config);

  // Check for session limit after cleanup
  const activeSessions = Object.keys(config.sessions).length;
  if (activeSessions >= MAX_SESSIONS_PER_USER) {
    const oldestSession = Object.entries(config.sessions).sort(
      ([, a], [, b]) => a.createdAt - b.createdAt
    )[0];
    if (oldestSession) {
      delete config.sessions[oldestSession[0]];
    }
  }

  // Create new session
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
    // Session expired - clean it up
    delete config.sessions[sessionId];
    await updateAuthConfig(config);
    return false;
  }

  // Update last used time (but don't write to file on every verification to reduce I/O)
  // Only update if it's been more than 5 minutes since last update
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

// Helper function for verifying credentials (used in login)
export async function verifyCredentials(password) {
  if (!password) return false;

  const config = await getAuthConfig();
  if (!config) return false;

  return config.password === hashPassword(password);
}

// Helper function to invalidate a specific session
export async function invalidateSession(sessionId) {
  if (!sessionId) return false;

  const config = await getAuthConfig();
  if (!config) return false;

  if (config.sessions[sessionId]) {
    delete config.sessions[sessionId];
    await updateAuthConfig(config);
    return true;
  }

  return false;
}

// Helper function to get all active sessions
export async function getActiveSessions() {
  const config = await getAuthConfig();
  if (!config) return [];

  const now = Date.now();
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
