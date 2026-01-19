# T-INT-05: Implement Vault Disable Flow

**Epic:** Complete E2E Cloud Sync Integration
**Type:** Frontend
**State:** pending
**Dependencies:** T-INT-04

---

## Action

Create safe vault disable process with user choice

---

## Business Summary

Allow users to leave E2E mode without losing data

---

## Logic

1. Show clear warning about disable action
2. Present two options: stop syncing vs decrypt to local
3. Handle "stop syncing" option (keep encrypted cloud data)
4. Handle "decrypt to local" option (remove cloud data)
5. Confirm action before executing
6. Update UI to reflect local-only mode
7. Show progress indicator during decryption

---

## Technical Logic

**Option A: Stop Syncing (Recommended)**
- Set `enabled = false` in database
- Keep encrypted records in cloud
- Can re-enable later with same passphrase
- Local data remains encrypted

**Option B: Decrypt to Local**
- Decrypt all records
- Delete cloud vault and records
- Switch to plaintext storage
- Cannot be undone

---

## Implementation

```typescript
// hooks/useVaultDisable.ts
"use client";

import { useState, useCallback } from "react";
import { useVaultStore } from "@/stores/vault-store";
import * as crypto from "@/lib/crypto";

export type DisableMode = "stop" | "decrypt";

export function useVaultDisable() {
  const { vaultEnvelope, vaultKey, setEnvelope, lock } = useVaultStore();
  const [disabling, setDisabling] = useState(false);
  const [progress, setProgress] = useState(0);

  const disableVault = useCallback(
    async (mode: DisableMode) => {
      if (!vaultKey || !vaultEnvelope) {
        throw new Error("Vault not unlocked");
      }

      setDisabling(true);
      setProgress(0);

      try {
        if (mode === "stop") {
          // Option A: Stop syncing, keep cloud data
          await disableVaultSync();
        } else {
          // Option B: Decrypt to local, delete cloud
          await disableVaultDecrypt();
        }

        // Clear local vault state
        setEnvelope(null as any);
        lock();

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Disable failed",
        };
      } finally {
        setDisabling(false);
        setProgress(0);
      }
    },
    [vaultKey, vaultEnvelope, setEnvelope, lock]
  );

  const disableVaultSync = async () => {
    // Set enabled = false on server
    const response = await fetch("/api/vault/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "stop" }),
    });

    if (!response.ok) {
      throw new Error("Failed to disable vault sync");
    }

    // Note: Local encrypted storage is kept
    // User can continue using vault in local-only mode
  };

  const disableVaultDecrypt = async () => {
    // Step 1: Decrypt all records
    const encryptedRecords = loadAllEncryptedRecords();
    const decryptedBookmarks: Bookmark[] = [];

    for (let i = 0; i < encryptedRecords.length; i++) {
      const record = encryptedRecords[i];
      setProgress(Math.round(((i + 1) / encryptedRecords.length) * 100));

      try {
        const bookmark = await loadAndDecryptBookmark(
          record.recordId,
          vaultKey!
        );
        if (bookmark && !record.deleted) {
          decryptedBookmarks.push(bookmark);
        }
      } catch (error) {
        console.error(`Failed to decrypt ${record.recordId}:`, error);
      }
    }

    // Step 2: Save to plaintext storage
    localStorage.setItem(
      "bookmark-vault-bookmarks",
      JSON.stringify(decryptedBookmarks)
    );

    // Step 3: Delete cloud vault
    const response = await fetch("/api/vault/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "decrypt" }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete cloud vault");
    }

    // Step 4: Delete local encrypted storage
    localStorage.removeItem("bookmark-vault-encrypted");
    localStorage.removeItem("bookmark-vault-envelope");
  };

  return {
    disableVault,
    disabling,
    progress,
  };
}
```

---

## UI Component

```typescript
// components/vault/DisableVaultDialog.tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { Button } from "@/components/ui";
import { useVaultDisable } from "@/hooks/useVaultDisable";

type DisableMode = "stop" | "decrypt";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDisabled: () => void;
}

export function DisableVaultDialog({
  isOpen,
  onClose,
  onDisabled,
}: Props) {
  const { disableVault, disabling, progress } = useVaultDisable();
  const [mode, setMode] = useState<DisableMode>("stop");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisable = async () => {
    setError(null);

    try {
      const result = await disableVault(mode);

      if (result.success) {
        onDisabled();
        onClose();
      } else {
        setError(result.error || "Failed to disable vault");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disable failed");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Disable Vault Mode">
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            You are about to disable vault mode. Please choose how you want to
            handle your data.
          </p>
        </div>

        <div className="space-y-3">
          <label
            className={`
              flex items-start gap-3 p-3 border rounded cursor-pointer
              ${mode === "stop" ? "border-blue-500 bg-blue-50" : ""}
            `}
          >
            <input
              type="radio"
              name="mode"
              checked={mode === "stop"}
              onChange={() => setMode("stop")}
              className="mt-1"
            />
            <div>
              <p className="font-medium">Stop Syncing (Recommended)</p>
              <p className="text-sm text-gray-600">
                Keep your encrypted cloud data but stop syncing. You can
                re-enable vault mode later with the same passphrase. Local
                data remains encrypted.
              </p>
            </div>
          </label>

          <label
            className={`
              flex items-start gap-3 p-3 border rounded cursor-pointer
              ${mode === "decrypt" ? "border-blue-500 bg-blue-50" : ""}
            `}
          >
            <input
              type="radio"
              name="mode"
              checked={mode === "decrypt"}
              onChange={() => setMode("decrypt")}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-red-600">
                Decrypt to Local (Cannot Be Undone)
              </p>
              <p className="text-sm text-gray-600">
                Convert all bookmarks back to plaintext storage and permanently
                delete your encrypted cloud vault. Your data will no longer be
                encrypted.
              </p>
            </div>
          </label>
        </div>

        {mode === "decrypt" && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 rounded"
            />
            <span>
              I understand that decrypting to local storage cannot be undone
              and my cloud vault will be permanently deleted
            </span>
          </label>
        )}

        {disabling && progress > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Decrypting...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={disabling}>
            Cancel
          </Button>
          <Button
            variant={mode === "decrypt" ? "danger" : "primary"}
            onClick={handleDisable}
            disabled={(mode === "decrypt" && !confirmed) || disabling}
            className="flex-1"
          >
            {disabling ? "Disabling..." : "Disable Vault"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## API Endpoint

```typescript
// app/api/vault/disable/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const userId = auth().userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { mode } = await req.json();

  if (mode === 'stop') {
    // Just disable vault, keep data
    await query(
      'UPDATE vaults SET enabled = false WHERE user_id = $1',
      [userId]
    );
  } else if (mode === 'decrypt') {
    // Delete everything
    await query('DELETE FROM records WHERE user_id = $1', [userId]);
    await query('DELETE FROM vaults WHERE user_id = $1', [userId]);
  } else {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
```

---

## Testing

**Integration Test:**
- Verify stop mode keeps data
- Verify decrypt mode removes cloud data
- Verify progress indicator works
- Verify confirmation required

---

## Files

**CREATE:**
- `app/api/vault/disable/route.ts`
- `hooks/useVaultDisable.ts`
- `components/vault/DisableVaultDialog.tsx`

**MODIFY:**
- `lib/migration.ts` (add reverse migration)

---

## Patterns

- Follow existing migration patterns
- Show clear warnings
- Provide progress feedback

---

## Verification Checklist

- [ ] Stop mode implemented
- [ ] Decrypt mode implemented
- [ ] Confirmation required for decrypt
- [ ] Progress indicator works
- [ ] API endpoint created
- [ ] Error handling works
- [ ] UI updates after disable
- [ ] Cloud data handled correctly
- [ ] Local storage updated
- [ ] Integration tests pass

---

## Notes

- Stop mode is safer and recommended
- Decrypt mode is permanent - warn clearly
- Consider adding "disable for 24h" cooldown
- Show data size before confirming
- Test with large datasets (10000+ records)
- Consider adding disable analytics
- Add undo for "stop" mode (re-enable)
- Test re-enable after stop
