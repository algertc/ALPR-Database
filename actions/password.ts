"use server";

import {
  verifyPassword,
  hashPasswordBcrypt,
  getAuthConfig,
  updateAuthConfig
} from "@/lib/auth";

export async function updatePassword(formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

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