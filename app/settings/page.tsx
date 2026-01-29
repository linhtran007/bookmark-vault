"use client";

import Link from "next/link";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SyncModeToggle } from "@/components/settings/SyncModeToggle";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { ApiSettings } from "@/components/settings/ApiSettings";
import { useIncomingSync } from "@/hooks/useIncomingSync";
import { Tag } from "lucide-react";

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
          title="Tags"
          description="Rename or delete tags across all your bookmarks"
        >
          <Link
            href="/settings/tags"
            className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
          >
            <Tag className="w-4 h-4" />
            Manage tags
          </Link>
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
