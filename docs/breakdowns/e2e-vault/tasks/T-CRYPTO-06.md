# T-CRYPTO-06: Add Settings Toggle for Vault Mode

**Epic:** Vault Crypto + Unlock UX
**Type:** Frontend (Client-side only)
**State:** pending
**Dependencies:** T-CRYPTO-04, T-CRYPTO-05

---

## Action

Implement vault enable/disable controls in settings

---

## Business Summary

Give users clear control over vault state

---

## Logic

1. Add toggle switch in settings for vault mode
2. Show current vault status (enabled/disabled)
3. Add lock/unlock controls when vault enabled
4. Implement disable flow with warning
5. Update UI based on vault state
6. Call vault API to check status
7. Show enable modal when toggled on
8. Show confirmation when toggled off

---

## Technical Logic

- Use switch component for toggle
- Call vault API to check status on mount
- Show enable modal when toggled on
- Show confirmation when toggled off
- Update bookmark hook to use encrypted storage
- Display vault status clearly
- Show last sync time (future)

---

## Components

### components/ui/ToggleSwitch.tsx

```typescript
"use client";

import { ReactNode } from "react";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  children?: ReactNode;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  children,
}: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${checked ? "bg-blue-600" : "bg-gray-200"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
      {label && <span className="sr-only">{label}</span>}
      {children}
    </button>
  );
}
```

### components/settings/VaultToggle.tsx

```typescript
"use client";

import { useState, useEffect } from "react";
import { ToggleSwitch } from "@/components/ui";
import { useVaultStore } from "@/stores/vault-store";
import { EnableVaultModal } from "@/components/vault/EnableVaultModal";
import { DisableVaultDialog } from "@/components/vault/DisableVaultDialog";

export function VaultToggle() {
  const { vaultEnvelope, isUnlocked, lock } = useVaultStore();
  const [serverEnabled, setServerEnabled] = useState(false);
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check server status on mount
  useEffect(() => {
    checkVaultStatus();
  }, []);

  const checkVaultStatus = async () => {
    try {
      const response = await fetch("/api/vault");
      const data = await response.json();
      setServerEnabled(data.enabled);
    } catch (error) {
      console.error("Failed to check vault status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      setShowEnableModal(true);
    } else {
      setShowDisableDialog(true);
    }
  };

  const handleEnableComplete = () => {
    setServerEnabled(true);
    setShowEnableModal(false);
  };

  const handleDisableConfirm = () => {
    setServerEnabled(false);
    setShowDisableDialog(false);
    // Vault disable flow handled in dialog
  };

  if (loading) {
    return <div className="animate-pulse h-6 w-20 bg-gray-200 rounded" />;
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-semibold text-gray-900">Vault Mode</h3>
        <p className="text-sm text-gray-600">
          {serverEnabled
            ? "End-to-end encryption enabled"
            : "Local storage only"}
        </p>
      </div>

      <ToggleSwitch
        checked={serverEnabled}
        onChange={handleToggle}
        label="Toggle vault mode"
      />

      {vaultEnvelope && isUnlocked && (
        <button
          onClick={lock}
          className="ml-4 px-3 py-1 text-sm border rounded hover:bg-gray-50"
        >
          Lock Vault
        </button>
      )}

      <EnableVaultModal
        isOpen={showEnableModal}
        onClose={() => setShowEnableModal(false)}
        onComplete={handleEnableComplete}
      />

      <DisableVaultDialog
        isOpen={showDisableDialog}
        onClose={() => setShowDisableDialog(false)}
        onConfirm={handleDisableConfirm}
      />
    </div>
  );
}
```

### components/vault/VaultStatusIndicator.tsx

```typescript
"use client";

import { useVaultStore } from "@/stores/vault-store";

export function VaultStatusIndicator() {
  const { vaultEnvelope, isUnlocked } = useVaultStore();

  if (!vaultEnvelope) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="w-2 h-2 rounded-full bg-gray-400" />
        <span>Vault Disabled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-2 h-2 rounded-full ${
          isUnlocked ? "bg-green-500" : "bg-yellow-500"
        }`}
      />
      <span>
        {isUnlocked ? "Vault Unlocked" : "Vault Locked"}
      </span>
    </div>
  );
}
```

### components/vault/DisableVaultDialog.tsx

```typescript
"use client";

import { Modal } from "@/components/ui";
import { Button } from "@/components/ui";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DisableVaultDialog({ isOpen, onClose, onConfirm }: Props) {
  const [option, setOption] = useState<"stop" | "decrypt">("stop");
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (!confirmed) return;
    onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Disable Vault Mode">
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            Warning: Disabling vault mode will affect how your data is stored.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="option"
              checked={option === "stop"}
              onChange={() => setOption("stop")}
              className="mt-1"
            />
            <div>
              <p className="font-medium">Stop Syncing (Recommended)</p>
              <p className="text-sm text-gray-600">
                Keep encrypted cloud data but stop syncing. You can re-enable
                vault later.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="option"
              checked={option === "decrypt"}
              onChange={() => setOption("decrypt")}
              className="mt-1"
            />
            <div>
              <p className="font-medium">Decrypt to Local</p>
              <p className="text-sm text-gray-600">
                Convert back to plaintext storage and delete cloud data. This
                cannot be undone.
              </p>
            </div>
          </label>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 rounded"
          />
          <span>
            I understand this action cannot be undone
          </span>
        </label>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!confirmed}
            className="flex-1"
          >
            Disable Vault
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## Integration into Settings Page

```typescript
// app/settings/page.tsx
import { SettingsSection } from "@/components/settings/SettingsSection";
import { VaultToggle } from "@/components/settings/VaultToggle";
import { VaultStatusIndicator } from "@/components/vault/VaultStatusIndicator";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <SettingsSection
        title="Vault Mode"
        description="End-to-end encrypt your bookmarks"
      >
        <VaultToggle />
        <div className="mt-4">
          <VaultStatusIndicator />
        </div>
      </SettingsSection>
    </div>
  );
}
```

---

## Testing

**Integration Test:**
- Verify toggle shows correct state
- Verify enable modal opens
- Verify disable dialog opens
- Verify status indicator updates

---

## Files

**CREATE:**
- `components/ui/ToggleSwitch.tsx`
- `components/settings/VaultToggle.tsx`
- `components/vault/VaultStatusIndicator.tsx`
- `components/vault/DisableVaultDialog.tsx`

**MODIFY:**
- `app/settings/page.tsx` (add vault section)
- `hooks/useBookmarks.ts` (use encrypted storage when vault enabled)

---

## Patterns

- Follow existing settings UI patterns
- Use consistent styling
- Clear visual feedback

---

## Verification Checklist

- [ ] ToggleSwitch component created
- [ ] VaultToggle component created
- [ ] VaultStatusIndicator created
- [ ] DisableVaultDialog created
- [ ] Toggle state syncs with server
- [ ] Enable modal opens correctly
- [ ] Disable dialog opens correctly
- [ ] Status indicator shows correct state
- [ ] Lock button works
- [ ] UI updates on state change
- [ ] Mobile responsive

---

## Notes

- Add loading state for server check
- Consider adding vault health indicator
- Show last sync time in future
- Add keyboard shortcuts
- Consider adding vault stats (record count, storage size)
- Test toggle rapid clicking
- Add error handling for API failures
