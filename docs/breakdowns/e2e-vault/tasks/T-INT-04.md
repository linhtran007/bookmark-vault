# T-INT-04: Create Vault Dashboard UI

**Epic:** Complete E2E Cloud Sync Integration
**Type:** Frontend
**State:** pending
**Dependencies:** T-INT-01, T-INT-02

---

## Action

Build comprehensive vault management interface

---

## Business Summary

Provide complete vault overview and controls

---

## Logic

1. Create vault dashboard section in settings
2. Show vault status, sync status, device list
3. Add manual sync button
4. Show storage usage statistics
5. Add vault disable flow with warnings
6. Poll sync status every 30 seconds
7. Show last sync time
8. List all devices with last seen dates
9. Implement two-option disable flow

---

## Technical Logic

- Use dashboard layout with cards
- Poll sync status periodically
- Show last sync time
- List all devices with last seen dates
- Implement two-option disable flow
- Provide clear visual feedback

---

## Components

### components/vault/VaultDashboard.tsx

```typescript
"use client";

import { useEffect, useState } from "react";
import { useVaultStore } from "@/stores/vault-store";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { VaultStatusCard } from "./VaultStatusCard";
import { SyncStatusCard } from "./SyncStatusCard";
import { DeviceList } from "./DeviceList";
import { DisableVaultButton } from "./DisableVaultButton";

export function VaultDashboard() {
  const { vaultEnvelope, isUnlocked } = useVaultStore();
  const { performSync, syncStatus } = useSyncEngine();
  const [devices, setDevices] = useState<any[]>([]);

  // Poll devices and sync status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devicesResponse] = await Promise.all([
          fetch('/api/devices'),
        ]);

        if (devicesResponse.ok) {
          const devicesData = await devicesResponse.json();
          setDevices(devicesData.devices || []);
        }
      } catch (error) {
        console.error('Failed to fetch vault data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    try {
      await performSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  if (!vaultEnvelope) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>Vault mode is not enabled.</p>
        <p className="text-sm mt-2">
          Enable vault mode to encrypt and sync your bookmarks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vault Status */}
      <VaultStatusCard isUnlocked={isUnlocked} />

      {/* Sync Status */}
      <SyncStatusCard
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
      />

      {/* Devices */}
      <DeviceList devices={devices} />

      {/* Disable Vault */}
      <DisableVaultButton />
    </div>
  );
}
```

### components/vault/VaultStatusCard.tsx

```typescript
"use client";

interface Props {
  isUnlocked: boolean;
}

export function VaultStatusCard({ isUnlocked }: Props) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Vault Status</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Status</span>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isUnlocked ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <span className="font-medium">
              {isUnlocked ? "Unlocked" : "Locked"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Encryption</span>
          <span className="font-medium">End-to-End (AES-256)</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Storage</span>
          <span className="font-medium">Encrypted</span>
        </div>
      </div>
    </div>
  );
}
```

### components/vault/SyncStatusCard.tsx

```typescript
"use client";

import { SyncStatus as SyncStatusType } from "@/lib/sync-engine";

interface Props {
  syncStatus: SyncStatusType;
  onManualSync: () => void;
}

export function SyncStatusCard({ syncStatus, onManualSync }: Props) {
  const formatLastSync = () => {
    if (!syncStatus.lastSync) return "Never";
    return new Date(syncStatus.lastSync).toLocaleString();
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sync Status</h3>
        <button
          onClick={onManualSync}
          disabled={syncStatus.syncing}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
        >
          {syncStatus.syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      <div className="space-y-3">
        {syncStatus.syncing && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Sync in progress...</span>
          </div>
        )}

        {!syncStatus.syncing && syncStatus.error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{syncStatus.error}</span>
          </div>
        )}

        {!syncStatus.syncing && !syncStatus.error && (
          <div className="flex items-center gap-2 text-green-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>All synced</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Last sync</span>
          <span className="font-medium">{formatLastSync()}</span>
        </div>
      </div>
    </div>
  );
}
```

### components/vault/DeviceList.tsx

```typescript
"use client";

interface Props {
  devices: Array<{
    id: string;
    name: string;
    last_seen_at: string;
    created_at: string;
  }>;
}

export function DeviceList({ devices }: Props) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!confirm("Are you sure you want to remove this device?")) {
      return;
    }

    try {
      const response = await fetch(`/api/devices?id=${deviceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove device");
      }

      // Refresh devices
      window.location.reload();
    } catch (error) {
      console.error("Failed to remove device:", error);
      alert("Failed to remove device. Please try again.");
    }
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">
        Devices ({devices.length})
      </h3>

      {devices.length === 0 ? (
        <p className="text-gray-500 text-sm">No devices registered yet.</p>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-3 border rounded"
            >
              <div>
                <p className="font-medium">{device.name}</p>
                <p className="text-xs text-gray-600">
                  Last seen: {formatTimeAgo(device.last_seen_at)}
                </p>
              </div>
              <button
                onClick={() => handleRemoveDevice(device.id)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### components/vault/DisableVaultButton.tsx

```typescript
"use client";

import { useState } from "react";
import { DisableVaultDialog } from "./DisableVaultDialog";

export function DisableVaultButton() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Danger Zone
        </h3>
        <p className="text-sm text-yellow-800 mb-4">
          Disabling vault mode will affect how your data is stored and synced.
        </p>
        <button
          onClick={() => setShowDialog(true)}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Disable Vault Mode
        </button>
      </div>

      <DisableVaultDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </>
  );
}
```

---

## Integration into Settings

```typescript
// app/settings/page.tsx (modified)
import { VaultDashboard } from "@/components/vault/VaultDashboard";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <SettingsSection title="Vault Dashboard">
        <VaultDashboard />
      </SettingsSection>
    </div>
  );
}
```

---

## Testing

**Integration Test:**
- Verify dashboard displays correctly
- Verify sync status updates
- Verify device list loads
- Verify manual sync works

---

## Files

**CREATE:**
- `components/vault/VaultDashboard.tsx`
- `components/vault/VaultStatusCard.tsx`
- `components/vault/SyncStatusCard.tsx`
- `components/vault/DeviceList.tsx`
- `components/vault/DisableVaultButton.tsx`

**MODIFY:**
- `app/settings/page.tsx`

---

## Patterns

- Follow existing settings UI patterns
- Use card-based layout
- Clear visual hierarchy

---

## Verification Checklist

- [ ] Vault status displays
- [ ] Sync status displays
- [ ] Manual sync button works
- [ ] Device list loads
- [ ] Device removal works
- [ ] Last sync time shown
- [ ] Status polls every 30s
- [ ] Disable button shows dialog
- [ ] Mobile responsive
- [ ] Integration tests pass

---

## Notes

- Consider adding storage usage meter
- Consider adding sync statistics (total records, etc.)
- Show current device indicator
- Consider adding device nickname editing
- Add device limit indicator
- Consider adding push notification settings
- Add export/import shortcuts
- Test with multiple devices
- Consider adding vault health indicator
