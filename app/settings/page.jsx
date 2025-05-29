import SettingsForm from "./SettingsForm";
import { getSettings } from "@/actions";
import { getAuthConfig } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const [settings, authConfig] = await Promise.all([
    getSettings(),
    getAuthConfig(),
  ]);

  if (!settings) {
    throw new Error("Failed to load settings");
  }

  return (
    <SettingsForm
      initialSettings={settings}
      initialApiKey={authConfig.apiKey}
    />
  );
}
