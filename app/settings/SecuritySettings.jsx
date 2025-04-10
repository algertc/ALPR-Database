// app/settings/SecuritySettings.jsx
"use client";

import { useState } from "react";
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
import { UpdatePassword, regenerateApiKey } from "@/app/actions";

export function SecuritySettings({ initialApiKey }) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handlePasswordChange(formData) {
    setError("");
    startTransition(async () => {
      const result = await updatePassword(formData);
      if (result.success) {
        setSuccess(true);
        // Reset form
        formData.target.reset();
      } else {
        setError(result.error);
      }
    });
  }

  async function handleRegenerateApiKey() {
    setError("");
    startTransition(async () => {
      const result = await updateApiKey();
      if (result.success) {
        setApiKey(result.apiKey);
        setShowApiKey(true);
        setShowDialog(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-md">{error}</div>
      )}
      {success && (
        <div className="p-4 text-green-600 bg-green-50 rounded-md">
          {success}
        </div>
      )}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  currentPassword: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  newPassword: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
            />
          </div>
          <Button type="submit">Change Password</Button>
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
                  value={apiKey}
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
                <Button variant="destructive" onClick={handleRegenerateApiKey}>
                  Regenerate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
