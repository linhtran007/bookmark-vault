"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { SyncModeToggle } from "@/components/settings/SyncModeToggle";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { ApiSettings } from "@/components/settings/ApiSettings";
import { useIncomingSync } from "@/hooks/useIncomingSync";

export default function SettingsPage() {
  useIncomingSync();

  return (
    <div className="pt-24">
      <div className="mx-auto max-w-2xl p-4">
        <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>

        <SettingsSection
          title="Cloud Sync"
          description="Choose how your bookmarks are stored and synced"
        >
          <SyncModeToggle />
        </SettingsSection>

        <SettingsSection
          title="Appearance"
          description="Customize how Bookmark Vault looks"
        >
          <ThemeSettings />
        </SettingsSection>

        <SettingsSection
          title="API Configuration"
          description="Configure API tokens for AI-powered features"
        >
          <ApiSettings />
        </SettingsSection>

        <SettingsSection
          title="Account"
          description="Manage your account settings"
        >
          <div className="text-sm italic text-gray-500 dark:text-slate-400">
            Account controls coming soon...
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
