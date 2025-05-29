// app/settings/SecuritySettings.jsx
"use client";

import { useState, useTransition } from "react"; // <--- IMPORTANT: Re-added useTransition
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Correctly import server actions. Note: UpdatePassword was named updatePassword in actions.js
import { updatePassword, regenerateApiKey } from "@/actions";

export function SecuritySettings({ initialApiKey }) {
  const [apiKey, setApiKey] = useState(initialApiKey); // State to display dynamically updated API Key
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDialog, setShowDialog] = useState(false); // Controls the regenerate API key dialog

  const [passwordData, setPasswordData] = useState({
    // Controlled inputs for password form
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordError, setPasswordError] = useState(""); // Specific error for password form
  const [passwordSuccess, setPasswordSuccess] = useState(""); // Specific success for password form

  const [apiKeyError, setApiKeyError] = useState(""); // Specific error for API key regeneration
  const [apiKeySuccess, setApiKeySuccess] = useState(""); // Specific success for API key regeneration

  const [isPasswordPending, startPasswordTransition] = useTransition(); // <--- Dedicated transition for password form
  const [isApiKeyPending, startApiKeyTransition] = useTransition(); // <--- Dedicated transition for API key regeneration

  async function handlePasswordChange(event) {
    // <--- Receive event object
    event.preventDefault(); // Prevent default browser form submission
    setPasswordError(""); // Clear previous errors
    setPasswordSuccess(""); // Clear previous success

    // <--- CRUCIAL FIX: Create FormData from the event.target (the form)
    const formData = new FormData(event.target);

    // Client-side validation for passwords
    if (formData.get("newPassword") !== formData.get("confirmPassword")) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (String(formData.get("newPassword")).length < 8) {
      // Ensure newPassword is string for .length
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    startPasswordTransition(async () => {
      // Use the dedicated password transition
      try {
        const result = await updatePassword(formData); // Pass the correct FormData object
        if (result.success) {
          setPasswordSuccess(
            result.message ||
              "Password updated successfully. All active sessions have been logged out."
          );
          // Reset form fields using the controlled input states
          setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        } else {
          setPasswordError(result.error || "Failed to update password.");
        }
      } catch (e) {
        setPasswordError(
          "An unexpected error occurred during password change."
        );
        console.error("Password change client-side error:", e);
      }
    });
  }

  async function handleRegenerateApiKey() {
    setApiKeyError(""); // Clear previous errors
    setApiKeySuccess(""); // Clear previous success
    setShowDialog(false); // Close the dialog immediately or after action

    startApiKeyTransition(async () => {
      // Use the dedicated API key transition
      try {
        const result = await regenerateApiKey(); // No formData needed here
        if (result.success) {
          setApiKey(result.apiKey); // Update the local state to display the new key
          setApiKeySuccess(
            result.message || "API Key regenerated successfully."
          );
        } else {
          setApiKeyError(result.error || "Failed to regenerate API key.");
        }
      } catch (e) {
        setApiKeyError(
          "An unexpected error occurred during API key regeneration."
        );
        console.error("API key regeneration client-side error:", e);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Display password specific error/success messages */}
      {passwordError && (
        <div className="p-4 text-red-600 bg-red-50 rounded-md">
          {passwordError}
        </div>
      )}
      {passwordSuccess && (
        <div className="p-4 text-green-600 bg-green-50 rounded-md">
          {passwordSuccess}
        </div>
      )}

      {/* Display API Key specific error/success messages */}
      {apiKeyError && (
        <div className="p-4 text-red-600 bg-red-50 rounded-md">
          {apiKeyError}
        </div>
      )}
      {apiKeySuccess && (
        <div className="p-4 text-green-600 bg-green-50 rounded-md">
          {apiKeySuccess}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Change Password</h3>
        {/* Form submits directly to handlePasswordChange */}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              name="currentPassword" // <--- Crucial for FormData
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  currentPassword: e.target.value,
                }))
              }
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword" // <--- Crucial for FormData
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  newPassword: e.target.value,
                }))
              }
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword" // <--- Crucial for FormData
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              required
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={isPasswordPending}>
            {isPasswordPending ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </div>

      {/* API Key Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">API Key Management</h3>
        <div className="space-y-4">
          <div>
            <Label>Current API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={apiKey} // Displays the local state for the key
                  type={showApiKey ? "text" : "password"}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowApiKey(!showApiKey)}
                size="icon"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive">Regenerate API Key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Regenerate API Key</DialogTitle>
                <DialogDescription>
                  Are you sure you want to regenerate the API key? This will
                  invalidate the current key and any systems using it will need
                  to be updated.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRegenerateApiKey} // Direct call to its own handler
                  disabled={isApiKeyPending}
                >
                  {isApiKeyPending ? "Regenerating..." : "Regenerate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
