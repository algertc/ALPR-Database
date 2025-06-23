"use client";

import { useState } from "react";
import { useTransition, useOptimistic } from "react";
import {
  Eye,
  EyeOff,
  Settings2,
  X,
  Database,
  Wifi,
  Bell,
  Home,
  Shield,
  Lock,
  Share,
  Cpu,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DashboardLayout from "@/components/layout/MainLayout";
import {
  updateSettings,
  updatePassword,
  regenerateApiKey,
} from "@/app/actions";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ToggleSwitch from "@/components/ui/toggle-switch";
import { SecuritySettings } from "./SecuritySettings";

const navigationSections = [
  {
    title: "System",
    items: [
      { title: "General", id: "general", icon: Settings2 },
      { title: "Database", id: "database", icon: Database },
      { title: "Security", id: "security", icon: Lock },
      { title: "Sharing & Privacy", id: "privacy", icon: Share },
    ],
  },
  {
    title: "Integrations",
    items: [
      { title: "Push Notifications", id: "push", icon: Bell },
      { title: "AI Training", id: "training", icon: Cpu },
      { title: "Blue Iris", id: "blueiris", icon: Server },
      { title: "HomeAssistant", id: "homeassistant", icon: Home },
      { title: "MQTT/HTTP", id: "mqtt", icon: Wifi },
    ],
  },
];

export default function SettingsForm({ initialSettings, initialApiKey }) {
  const [isPending, startTransition] = useTransition(); // For general settings
  const [error, setError] = useState(""); // General error for main form
  const [success, setSuccess] = useState(false); // General success for main form
  const [activeSection, setActiveSection] = useState("general");
  const [showApiKey, setShowApiKey] = useState(false); // This is local state for general form (will be managed by SecuritySettings itself now)
  const [showDialog, setShowDialog] = useState(false); // This is local state for general form (will be managed by SecuritySettings itself now)

  // `handlePasswordSubmit` and `handleRegenerateApiKey` in THIS component (`SettingsForm`)
  // are the ones directly attached to the form in the `renderSecuritySection` function
  // of the original code you provided.
  // We need to keep these handlers exactly as they were, but ensure they call the
  // `updatePassword` and `regenerateApiKey` server actions correctly.

  const handleSettingsSubmit = async (formData) => {
    setError("");
    setSuccess(false);

    // Only include the fields from the current section in the form data
    const newFormData = new FormData();

    switch (activeSection) {
      case "general":
        newFormData.append("maxRecords", formData.get("maxRecords"));
        newFormData.append("retention", formData.get("retention"));
        newFormData.append("ignoreNonPlate", formData.get("ignoreNonPlate"));
        newFormData.append("timeFormat", Number(formData.get("timeFormat")));
        break;
      case "mqtt":
        newFormData.append("mqttBroker", formData.get("mqttBroker"));
        newFormData.append("mqttTopic", formData.get("mqttTopic"));
        break;
      case "database":
        newFormData.append("dbHost", formData.get("dbHost"));
        newFormData.append("dbName", formData.get("dbName"));
        newFormData.append("dbUser", formData.get("dbUser"));
        newFormData.append("dbPassword", formData.get("dbPassword"));
        break;
      case "push":
        newFormData.append(
          "pushoverEnabled",
          formData.get("pushoverEnabled") === "on"
        );
        newFormData.append(
          "pushoverAppToken",
          formData.get("pushoverAppToken")
        );
        newFormData.append("pushoverUserKey", formData.get("pushoverUserKey"));
        newFormData.append("pushoverTitle", formData.get("pushoverTitle"));
        newFormData.append(
          "pushoverPriority",
          formData.get("pushoverPriority")
        );
        newFormData.append("pushoverSound", formData.get("pushoverSound"));
        break;
      case "homeassistant":
        newFormData.append("haEnabled", formData.get("haEnabled") === "on");
        if (formData.get("haWhitelist")) {
          newFormData.append("haWhitelist", formData.get("haWhitelist"));
        }
        break;
      case "blueiris":
        newFormData.append("bihost", formData.get("bihost"));
        break;
      case "privacy":
        newFormData.append(
          "metricsEnabled",
          formData.get("metricsEnabled") === "on"
        );
        break;
      case "training":
        newFormData.append(
          "trainingEnabled",
          formData.get("trainingEnabled") === "on"
        );
        if (formData.get("trainingName")) {
          newFormData.append("trainingName", formData.get("trainingName"));
        }
        break;
    }

    startTransition(async () => {
      const result = await updateSettings(newFormData);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error);
      }
    });
  };

  const handlePasswordSubmit = async (event) => {
    // This handler is local to SettingsForm.jsx
    event.preventDefault(); // Prevent default form submission
    setError(""); // Use parent's error state
    setSuccess(false); // Use parent's success state

    const formData = new FormData(event.target); // Correctly create FormData from event.target

    if (formData.get("newPassword") !== formData.get("confirmPassword")) {
      setError("Passwords do not match"); // Set parent's error state
      return;
    }

    // Use the main `startTransition` from `SettingsForm` for password changes.
    // This implies `isPending` will cover both general settings and security.
    // If you need separate loading states, you would add a new `useTransition` here.
    startTransition(async () => {
      // <--- CRUCIAL FIX: Pass the entire formData object
      const result = await updatePassword(formData);
      if (result.success) {
        setSuccess(true); // Set parent's success state
        event.target.reset(); // Reset the form in SecuritySettings via this event
      } else {
        setError(result.error); // Set parent's error state
      }
    });
  };

  const handleRegenerateApiKey = async () => {
    // This handler is local to SettingsForm.jsx
    setError(""); // Use parent's error state
    setSuccess(false); // Use parent's success state

    // Use the main `startTransition` from `SettingsForm` for API key regeneration.
    startTransition(async () => {
      const result = await regenerateApiKey();
      if (result.success) {
        setShowDialog(false); // This local state needs to be managed for this dialog
        setSuccess(true); // Set parent's success state
        // The SecuritySettings component would need to receive the new API key
        // to update its display. This means initialApiKey should be `currentApiKey`
        // and updated here. See renderSecuritySection below.
      } else {
        setError(result.error); // Set parent's error state
      }
    });
  };

  // State to manage API key display in SecuritySettings, updated by regenerateApiKey
  const [currentApiKeyInForm, setCurrentApiKeyInForm] = useState(initialApiKey);

  // When API key is regenerated in handleRegenerateApiKey:
  // - result.apiKey should be set to currentApiKeyInForm
  // - setShowDialog(false) to close the dialog

  // Re-write handleRegenerateApiKey to update currentApiKeyInForm
  const handleRegenerateApiKeyInSettingsForm = async () => {
    setError("");
    setSuccess(false); // Clear general success
    const dialogWasOpen = showDialog; // Capture dialog state before action

    startTransition(async () => {
      try {
        const result = await regenerateApiKey();
        if (result.success) {
          setCurrentApiKeyInForm(result.apiKey); // Update state for SecuritySettings
          if (dialogWasOpen) setShowDialog(false); // Close dialog if it was open
          setSuccess(true); // Set general success
          setTimeout(() => setSuccess(false), 3000); // Clear after 3 seconds
        } else {
          setError(result.error); // Set general error
        }
      } catch (e) {
        setError("An unexpected error occurred during API key regeneration.");
        console.error("API key regeneration client-side error:", e);
      }
    });
  };

  const renderGeneralSection = () => (
    <div key="general-section" className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          General Settings
        </h2>
        <p className="text-muted-foreground">
          Configure basic application settings and preferences.
        </p>
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="maxRecords" className="text-sm font-medium">
            Maximum number of records to keep in live feed
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            100k records = &lt;100 MB
          </p>
          <Input
            id="maxRecords"
            name="maxRecords"
            type="number"
            defaultValue={initialSettings.general.maxRecords}
            autoComplete="off"
            className="max-w-xs"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="retention" className="text-sm font-medium">
            Image Retention Period (Months)
          </Label>
          <Input
            id="retention"
            name="retention"
            type="number"
            defaultValue={initialSettings.general.retention}
            autoComplete="off"
            className="max-w-xs"
          />
        </div>
        <div className="space-y-2 w-fit">
          <Label htmlFor="timeFormat" className="text-sm font-medium">
            Time Format
          </Label>
          <ToggleSwitch
            id="timeFormat"
            options={[
              { value: 12, label: "12h" },
              { value: 24, label: "24h" },
            ]}
            name="timeFormat"
            defaultValue={initialSettings.general.timeFormat}
          />
        </div>
      </div>
    </div>
  );

  const renderMqttSection = () => (
    <div key="mqtt-section" className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          MQTT Configuration
        </h2>
        <p className="text-muted-foreground">
          Configure MQTT broker settings for plate detection events.
          (Deprecated)
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
        <div className="space-y-2">
          <Label htmlFor="mqttBroker" className="text-sm font-medium">
            MQTT Broker URL/IP
          </Label>
          <Input
            id="mqttBroker"
            name="mqttBroker"
            defaultValue={initialSettings.mqtt.broker}
            placeholder="mqtt://example.com"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mqttTopic" className="text-sm font-medium">
            MQTT Topic
          </Label>
          <Input
            id="mqttTopic"
            name="mqttTopic"
            defaultValue={initialSettings.mqtt.topic}
            placeholder="alpr/plates"
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );

  const renderDatabaseSection = () => (
    <div key="database-section" className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Database Configuration
        </h2>
        <p className="text-muted-foreground">
          Configure your database connection settings.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
        <div className="space-y-2">
          <Label htmlFor="dbHost" className="text-sm font-medium">
            Database Host & Port
          </Label>
          <Input
            id="dbHost"
            name="dbHost"
            defaultValue={initialSettings.database.host}
            placeholder="localhost:5432"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dbName" className="text-sm font-medium">
            Database Name
          </Label>
          <Input
            id="dbName"
            name="dbName"
            defaultValue={initialSettings.database.name}
            placeholder="alpr_db"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dbUser" className="text-sm font-medium">
            Database User
          </Label>
          <Input
            id="dbUser"
            name="dbUser"
            defaultValue={initialSettings.database.user}
            placeholder="username"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dbPassword" className="text-sm font-medium">
            Database Password
          </Label>
          <Input
            id="dbPassword"
            name="dbPassword"
            type="password"
            defaultValue={initialSettings.database.password}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
      </div>
    </div>
  );

  const renderPushSection = () => (
    <div key="push-section" className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Pushover Configuration
        </h2>
        <p className="text-muted-foreground">
          Configure push notifications for plate detection events.
        </p>
      </div>
      <div className="space-y-6">
        <div className="max-w-4xl px-4 border rounded-lg">
          <div className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <Label htmlFor="pushoverEnabled" className="text-sm font-medium">
                Enable Pushover
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications when plates are detected
              </p>
            </div>
            <Switch
              id="pushoverEnabled"
              name="pushoverEnabled"
              defaultChecked={initialSettings.notifications?.pushover?.enabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl ml-2">
          <div className="space-y-2">
            <Label htmlFor="pushoverAppToken" className="text-sm font-medium">
              Application Token (APP_TOKEN)
            </Label>
            <Input
              id="pushoverAppToken"
              name="pushoverAppToken"
              type="token"
              defaultValue={initialSettings.notifications?.pushover?.app_token}
              placeholder="Your Pushover application token"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              {...{ "data-lpignore": "true" }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pushoverUserKey" className="text-sm font-medium">
              User Key (USER_KEY)
            </Label>
            <Input
              id="pushoverUserKey"
              name="pushoverUserKey"
              type="token"
              defaultValue={initialSettings.notifications?.pushover?.user_key}
              placeholder="Your Pushover user key"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              {...{ "data-lpignore": "true" }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pushoverTitle" className="text-sm font-medium">
              Notification Title
            </Label>
            <Input
              id="pushoverTitle"
              name="pushoverTitle"
              defaultValue={initialSettings.notifications?.pushover?.title}
              placeholder="ALPR Alert"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              {...{ "data-lpignore": "true" }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pushoverPriority" className="text-sm font-medium">
              Priority (-2 to 2)
            </Label>
            <Input
              id="pushoverPriority"
              name="pushoverPriority"
              type="number"
              min="-2"
              max="2"
              defaultValue={initialSettings.notifications?.pushover?.priority}
              autoComplete="off"
              {...{ "data-lpignore": "true" }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pushoverSound" className="text-sm font-medium">
              Notification Sound
            </Label>
            <Input
              id="pushoverSound"
              name="pushoverSound"
              defaultValue={initialSettings.notifications?.pushover?.sound}
              placeholder="pushover"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              {...{ "data-lpignore": "true" }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderHomeAssistantSection = () => (
    <div key="homeassistant-section" className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          HomeAssistant iframe Login Bypass
        </h2>
        <p className="text-muted-foreground">
          Configure access for HomeAssistant iframe integration.
        </p>
      </div>
      <div className="space-y-6">
        <div className="max-w-2xl">
          <div className="flex items-center justify-between py-4 border-b">
            <div className="space-y-1">
              <Label htmlFor="haEnabled" className="text-sm font-medium">
                Enable Whitelist
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow specific devices to bypass authentication when accessing
                the app via HomeAssistant iframe.
              </p>
            </div>
            <Switch
              id="haEnabled"
              name="haEnabled"
              defaultChecked={initialSettings.homeassistant?.enabled}
            />
          </div>
        </div>

        {initialSettings.homeassistant?.enabled && (
          <IPWhitelistManager
            initialIPs={initialSettings.homeassistant?.whitelist || []}
            onUpdate={(newIPs) => {
              const formData = new FormData();
              formData.append("haWhitelist", JSON.stringify(newIPs));
              handleSettingsSubmit(formData);
            }}
          />
        )}
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div key="security-section" className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Security Settings
        </h2>
        <p className="text-muted-foreground">
          Manage your security settings and API keys.
        </p>
      </div>
      <SecuritySettings
        initialApiKey={currentApiKeyInForm} // Pass the dynamically updated API key
      />
    </div>
  );

  const renderPrivacySection = () => (
    <div key="privacy-section" className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Sharing &amp; Privacy
        </h2>
        <p className="text-muted-foreground">
          Control what data is shared and how your privacy is protected.
        </p>
      </div>
      <div className="space-y-6">
        <div className="max-w-3xl border rounded-lg p-4">
          <div className="flex items-center justify-between py-4  space-x-12">
            <div className="space-y-1">
              <Label htmlFor="metricsEnabled" className="text-sm font-medium">
                Participate in Anonymous System Reporting
              </Label>
              <p className="text-sm text-muted-foreground">
                Reporting is 100% optional, but greatly encouraged. This helps
                me understand how people use the app and improve the code.
              </p>
            </div>
            <Switch
              id="metricsEnabled"
              name="metricsEnabled"
              defaultChecked={initialSettings.privacy?.metrics}
            />
          </div>
        </div>
        <div className="space-y-4 ml-2">
          <h4 className="text-lg font-semibold">Data sent in reports:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Release version
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Earliest date recorded in database
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Total records in database
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>A
              hashed unique identifier for your installation
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderTrainingSection = () => (
    <div key="training-section" className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          AI Training
        </h2>
        <p className="text-muted-foreground">
          Help improve the ALPR model by sharing training data.
        </p>
      </div>
      <div className="space-y-6">
        <div className="max-w-2xl">
          <div className="flex items-center justify-between py-4 border-b">
            <div className="space-y-1">
              <Label htmlFor="trainingEnabled" className="text-sm font-medium">
                Generate and Share Training Data to Improve the ALPR Model
              </Label>
              <p className="text-sm text-muted-foreground">
                Enabling this setting will generate annotated training image
                sets from your recognitions. This data is collected from
                deployments to create a more diverse and comprehensive dataset
                which will improve the accuracy of the ALPR model. Your
                recognitions do not become public.
              </p>
            </div>
            <Switch
              id="trainingEnabled"
              name="trainingEnabled"
              defaultChecked={initialSettings.training?.enabled}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trainingName" className="text-sm font-medium">
              Optional Name / Username
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              By default, your training data will be shared anonymously. If you
              would like to be recognized for your contribution, you can provide
              a name or username.
            </p>
            <Input
              id="trainingName"
              name="trainingName"
              defaultValue={initialSettings.training.name}
              placeholder="@username"
              autoComplete="off"
              className="max-w-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderBlueirisSection = () => (
    <div key="blueiris-section" className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Blue Iris Configuration
        </h2>
        <p className="text-muted-foreground">
          Configure integration with Blue Iris camera system.
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bihost" className="text-sm font-medium">
            Blue Iris Hostname or IP address
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Include :port if not port 80
          </p>
          <Input
            id="bihost"
            name="bihost"
            defaultValue={initialSettings.blueiris.host}
            placeholder="192.168.1.68"
            autoComplete="off"
            className="max-w-sm"
          />
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralSection();
      case "mqtt":
        return renderMqttSection();
      case "database":
        return renderDatabaseSection();
      case "push":
        return renderPushSection();
      case "homeassistant":
        return renderHomeAssistantSection();
      case "security":
        return renderSecuritySection();
      case "privacy":
        return renderPrivacySection();
      case "blueiris":
        return renderBlueirisSection();
      case "training":
        return renderTrainingSection();
      default:
        return null;
    }
  };

  const currentNavItem = navigationSections
    .flatMap((section) => section.items)
    .find((item) => item.id === activeSection);

  return (
    <DashboardLayout>
      <div className="flex h-full bg-background">
        {/* Left Sidebar Navigation */}
        <div className="w-64 bg-background border-r border-border flex-shrink-0">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Settings2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">
                Settings
              </h1>
            </div>
          </div>
          <nav className="p-4">
            <div className="space-y-6">
              {navigationSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                            item.id === activeSection
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {item.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Content Header */}
          <div className="border-b border-border bg-background px-8 py-6">
            <div className="flex items-center gap-3">
              {currentNavItem && (
                <currentNavItem.icon className="h-5 w-5 text-muted-foreground" />
              )}
              <h2 className="text-lg font-medium text-foreground">
                {currentNavItem?.title}
              </h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              {/* Error/Success Messages */}
              {error && (
                <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive max-w-2xl">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-600 max-w-2xl">
                  Settings updated successfully!
                </div>
              )}

              {/* Form Content */}
              {activeSection !== "security" ? (
                <form action={handleSettingsSubmit}>
                  <div className="space-y-8">
                    {renderSection()}

                    {/* Save Button */}
                    <div className="flex justify-start pt-6 border-t border-border">
                      <Button
                        type="submit"
                        disabled={isPending}
                        className="min-w-[120px]"
                      >
                        {isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                renderSection()
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

const IPWhitelistManager = ({ initialIPs = [], onUpdate }) => {
  const [newIP, setNewIP] = useState("");
  const [error, setError] = useState("");

  const isValidIP = (ip) => {
    // Basic IP validation (IPv4 and IPv6)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex =
      /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  };

  const handleAddIP = () => {
    setError("");
    if (!newIP) {
      setError("Please enter an IP address");
      return;
    }

    if (!isValidIP(newIP)) {
      setError("Please enter a valid IP address");
      return;
    }

    if (initialIPs.includes(newIP)) {
      setError("This IP is already in the whitelist");
      return;
    }

    onUpdate([...initialIPs, newIP]);
    setNewIP("");
  };

  const handleRemoveIP = (ipToRemove) => {
    onUpdate(initialIPs.filter((ip) => ip !== ipToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label htmlFor="ipInput" className="text-sm font-medium">
          IP Address Whitelist
        </Label>
        <div className="flex gap-3 max-w-md">
          <Input
            id="ipInput"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
            placeholder="Enter IP address"
            className="flex-1"
          />
          <Button onClick={handleAddIP} size="sm">
            Add IP
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {initialIPs.map((ip) => (
          <Badge
            key={ip}
            variant="secondary"
            className="flex items-center gap-2 px-3 py-1"
          >
            {ip}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => handleRemoveIP(ip)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
};
