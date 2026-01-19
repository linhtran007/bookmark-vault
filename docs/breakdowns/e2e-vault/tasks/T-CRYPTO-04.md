# T-CRYPTO-04: Implement Vault Enable Flow

**Epic:** Vault Crypto + Unlock UX
**Type:** Frontend (Client-side only)
**State:** pending
**Dependencies:** T-CRYPTO-03, T-AUTH-08

---

## Action

Create UX for enabling vault mode with passphrase setup

---

## Business Summary

Guide users through secure vault initialization

---

## Logic

1. Create vault enable modal/screen
2. Implement passphrase confirmation flow
3. Generate vault key and envelope
4. Migrate existing bookmarks to encrypted format
5. Upload initial encrypted records (stub for now)
6. Update vault state in UI
7. Show warning about passphrase importance

---

## Technical Logic

- Show warning about passphrase importance
- Require passphrase confirmation (must match)
- Validate passphrase strength
- On submit: derive key, generate vault key, create envelope
- Encrypt all existing bookmarks
- Call `/api/vault/enable` with envelope
- Store envelope in localStorage
- Transition to unlock screen
- Show progress indicator during migration

---

## Component Structure

### components/vault/EnableVaultModal.tsx

```typescript
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { Input } from "@/components/ui";
import { Button } from "@/components/ui";
import { useVaultEnable } from "@/hooks/useVaultEnable";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function EnableVaultModal({ isOpen, onClose, onComplete }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(true);

  const { enableVault, isEnabling } = useVaultEnable();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters");
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError("Passphrases do not match");
      return;
    }

    if (!agreed) {
      setError("Please acknowledge the warning");
      return;
    }

    try {
      await enableVault(passphrase);
      onComplete();
      onClose();
    } catch (err) {
      setError("Failed to enable vault. Please try again.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enable Vault Mode">
      <form onSubmit={handleSubmit} className="space-y-4">
        {showWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">
              Important: Your Passphrase Cannot Be Recovered
            </h3>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Your passphrase encrypts ALL your bookmarks</li>
              <li>If you forget it, your data is permanently lost</li>
              <li>Store it securely (password manager, safe deposit box)</li>
              <li>We cannot help you recover a lost passphrase</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowWarning(false)}
              className="mt-3 text-sm text-yellow-700 underline"
            >
              I understand, dismiss this warning
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Create Passphrase
          </label>
          <Input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Passphrase
          </label>
          <Input
            type="password"
            value={confirmPassphrase}
            onChange={(e) => setConfirmPassphrase(e.target.value)}
            placeholder="Re-enter passphrase"
            className="w-full"
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 rounded"
          />
          <span>
            I understand that my passphrase cannot be recovered and I am
            responsible for storing it safely
          </span>
        </label>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isEnabling}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={!agreed || isEnabling}
          >
            {isEnabling ? "Enabling..." : "Enable Vault Mode"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

### hooks/useVaultEnable.ts

```typescript
"use client";

import { useCallback } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useVaultStore } from "@/stores/vault-store";
import * as crypto from "@/lib/crypto";

export function useVaultEnable() {
  const { state } = useBookmarks();
  const { setEnvelope } = useVaultStore();

  const enableVault = useCallback(async (passphrase: string) => {
    // Step 1: Generate vault key and envelope
    const vaultKey = await crypto.generateVaultKey();
    const envelope = await crypto.createKeyEnvelope(passphrase, vaultKey);

    // Step 2: Encrypt existing bookmarks
    const encryptionKey = await crypto.importVaultKey(vaultKey);
    const encryptedRecords = await Promise.all(
      state.bookmarks.map(async (bookmark) => {
        const plaintext = new TextEncoder().encode(JSON.stringify(bookmark));
        const encrypted = await crypto.encryptData(plaintext, encryptionKey);
        return {
          recordId: bookmark.id,
          ciphertext: crypto.arrayToBase64(encrypted.ciphertext),
          iv: crypto.arrayToBase64(encrypted.iv),
          tag: crypto.arrayToBase64(encrypted.tag),
          version: 1,
        };
      })
    );

    // Step 3: Upload envelope to server
    const response = await fetch("/api/vault/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });

    if (!response.ok) {
      throw new Error("Failed to enable vault on server");
    }

    // Step 4: Store envelope locally
    setEnvelope(envelope);

    // Step 5: Store encrypted records (migration)
    localStorage.setItem(
      "bookmark-vault-encrypted",
      JSON.stringify(encryptedRecords)
    );

    // Step 6: Keep old storage as backup until confirmed working
    // User can manually delete after verification
  }, [state.bookmarks, setEnvelope]);

  return { enableVault };
}
```

### components/vault/VaultSettings.tsx

```typescript
"use client";

import { useState } from "react";
import { useVaultStore } from "@/stores/vault-store";
import { EnableVaultModal } from "./EnableVaultModal";

export function VaultSettings() {
  const { vaultEnvelope, isUnlocked, lock } = useVaultStore();
  const [showEnableModal, setShowEnableModal] = useState(false);

  const handleEnableComplete = () => {
    // Vault is now enabled but locked
    // Unlock screen will show automatically
  };

  if (vaultEnvelope) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-green-700">Vault Enabled</h3>
            <p className="text-sm text-gray-600">
              {isUnlocked ? "Vault is unlocked" : "Vault is locked"}
            </p>
          </div>
          <div className="flex gap-2">
            {isUnlocked && (
              <button
                onClick={lock}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
              >
                Lock
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Enable vault mode to encrypt your bookmarks end-to-end
      </p>
      <button
        onClick={() => setShowEnableModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Enable Vault Mode
      </button>

      <EnableVaultModal
        isOpen={showEnableModal}
        onClose={() => setShowEnableModal(false)}
        onComplete={handleEnableComplete}
      />
    </div>
  );
}
```

---

## Testing

**Integration Test:**
- Verify enable flow creates envelope
- Verify bookmarks are encrypted
- Verify envelope uploaded to server
- Verify unlock screen shows after enable

---

## Files

**CREATE:**
- `components/vault/EnableVaultModal.tsx`
- `hooks/useVaultEnable.ts`
- `components/vault/VaultSettings.tsx`

**MODIFY:**
- `app/settings/page.tsx` (add VaultSettings)
- `lib/crypto.ts` (add importVaultKey helper)

---

## Patterns

- Follow `hooks/useImportBookmarks.ts` flow pattern
- Use state machine for enable flow
- Show clear warnings before destructive actions

---

## Verification Checklist

- [ ] EnableVaultModal component created
- [ ] useVaultEnable hook created
- [ ] VaultSettings component created
- [ ] Passphrase confirmation works
- [ ] Warning displays correctly
- [ ] Envelope generation works
- [ ] Bookmarks encrypted
- [ ] Envelope uploaded to server
- [ ] Old bookmarks preserved as backup
- [ ] Unlock screen shows after enable
- [ ] Error handling works

---

## Notes

- Keep old plaintext storage as backup initially
- User can manually delete after confirming vault works
- Consider showing progress indicator for many bookmarks
- Consider adding passphrase strength meter
- Test with 0 bookmarks and 1000+ bookmarks
- Add migration rollback if enable fails
- Consider allowing passphrase hint (optional, insecure)
