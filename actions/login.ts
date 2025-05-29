"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

interface NextRedirectError {
  digest: string;
}

function isNextRedirectError(err: unknown): err is NextRedirectError {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as any).digest === "string"
  );
}

import {
  createSession,
  verifyPassword, // The function that handles both old/new hashes
  hashPasswordBcrypt, // New export to create a bcrypt hash
  getAuthConfig, // Need this to update config
  updateAuthConfig, // Need this to save updated config
} from "@/lib/auth";

const SESSION_EXPIRATION_SECONDS = 24 * 60 * 60;

export async function loginAction(formData: FormData) {
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
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: SESSION_EXPIRATION_SECONDS,
      path: "/",
    });

    redirect("/");
  } catch (error) {
    console.error("Login error:", error);

    if (isNextRedirectError(error) && error.digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }

    return { error: "An unexpected error occurred during login" };
  }
}