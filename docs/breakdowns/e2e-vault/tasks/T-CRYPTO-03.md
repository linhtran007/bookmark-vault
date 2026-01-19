# T-CRYPTO-03: Create Full-Page Unlock Screen

**Epic:** Vault Crypto + Unlock UX
**Type:** Frontend (Client-side only)
**State:** pending
**Dependencies:** T-CRYPTO-02

---

## Action

Build immersive unlock UI that blocks access until unlocked

---

## Business Summary

Ensure vault data is never accessible without explicit user action

---

## Logic

1. Create full-page unlock overlay component
2. Build clean, centered unlock form
3. Add passphrase input with show/hide toggle
4. Implement unlock validation flow
5. Block all app functionality until unlocked
6. Handle unlock errors with clear feedback
7. Store unlocked state in memory only (session)

---

## Technical Logic

- Use client component with "use client"
- Store unlocked state in memory (useRef or context)
- Never persist unlock state to localStorage
- Derive key, unwrap vault key, decrypt test record
- Show full-page overlay over entire app
- Check unlock state on app mount

---

## Component Structure

### components/vault/UnlockScreen.tsx

```typescript
"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import { Button } from "@/components/ui";
import { useVaultUnlock } from "@/hooks/useVaultUnlock";

export function UnlockScreen() {
  const [passphrase, setPassphrase] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { unlock, isUnlocking } = useVaultUnlock();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await unlock(passphrase);
    } catch (err) {
      setError("Incorrect passphrase. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Unlock Your Vault</h1>
          <p className="text-gray-600 mt-2">Enter your passphrase to access your bookmarks</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type={showPassword ? "text" : "password"}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase"
              className="w-full"
              autoFocus
              disabled={isUnlocking}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded"
              />
              Show passphrase
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={!passphrase || isUnlocking}
          >
            {isUnlocking ? "Unlocking..." : "Unlock Vault"}
          </Button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          Your passphrase is never stored or transmitted. All encryption happens locally in your browser.
        </p>
      </div>
    </div>
  );
}
```

### hooks/useVaultUnlock.ts

```typescript
"use client";

import { useCallback } from "react";
import { useVaultStore } from "@/stores/vault-store";

export function useVaultUnlock() {
  const { setUnlocked, vaultEnvelope } = useVaultStore();

  const unlock = useCallback(async (passphrase: string) => {
    if (!vaultEnvelope) {
      throw new Error("No vault envelope found");
    }

    // Derive key and unwrap vault key
    const vaultKey = await unwrapVaultKeyFromEnvelope(vaultEnvelope, passphrase);

    // Test decryption by trying to decrypt first record
    const encryptedRecords = loadEncryptedRecords();
    if (encryptedRecords.length > 0) {
      const testRecord = encryptedRecords[0];
      const key = await importVaultKey(vaultKey);
      await decryptRecord(testRecord, key);
    }

    // Store vault key in memory only (NOT in localStorage)
    setUnlocked(true, vaultKey);
  }, [vaultEnvelope, setUnlocked]);

  return { unlock };
}
```

### stores/vault-store.ts

```typescript
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface VaultState {
  isUnlocked: boolean;
  vaultKey: Uint8Array | null;  // NOT persisted!
  vaultEnvelope: VaultKeyEnvelope | null;
  setUnlocked: (unlocked: boolean, key?: Uint8Array) => void;
  setEnvelope: (envelope: VaultKeyEnvelope) => void;
  lock: () => void;
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set) => ({
      isUnlocked: false,
      vaultKey: null,
      vaultEnvelope: null,

      setUnlocked: (unlocked, key) => set({
        isUnlocked: unlocked,
        vaultKey: key ?? null,
      }),

      setEnvelope: (envelope) => set({ vaultEnvelope: envelope }),

      lock: () => set({
        isUnlocked: false,
        vaultKey: null,
      }),
    }),
    {
      name: "vault-storage",
      partialize: (state) => ({
        // Only persist envelope, NOT vaultKey or isUnlocked
        vaultEnvelope: state.vaultEnvelope,
      }),
    }
  )
);
```

---

## Integration into App

```typescript
// app/page.tsx
import { useVaultStore } from "@/stores/vault-store";
import { UnlockScreen } from "@/components/vault/UnlockScreen";

export default function HomePage() {
  const { isUnlocked, vaultEnvelope } = useVaultStore();

  // Show unlock screen if vault is enabled but not unlocked
  if (vaultEnvelope && !isUnlocked) {
    return <UnlockScreen />;
  }

  // Normal app content
  return (
    <div>
      {/* Your app content */}
    </div>
  );
}
```

---

## Testing

**Integration Test:**
- Verify unlock screen shows when vault enabled
- Verify correct passphrase unlocks vault
- Verify incorrect passphrase shows error
- Verify unlock state clears on browser close

---

## Files

**CREATE:**
- `components/vault/UnlockScreen.tsx`
- `hooks/useVaultUnlock.ts`
- `stores/vault-store.ts`

**MODIFY:**
- `app/page.tsx` (add unlock gate)

---

## Patterns

- Follow `components/ui/Modal.tsx` overlay pattern
- Use Zustand for state management
- Never persist vault key to disk

---

## Verification Checklist

- [ ] UnlockScreen component created
- [ ] useVaultUnlock hook created
- [ ] Vault store created with Zustand
- [ ] Unlock gate added to app
- [ ] Passphrase input works
- [ ] Show/hide password toggle works
- [ ] Unlock validates correctly
- [ ] Error messages display
- [ ] Unlock state not persisted
- [ ] No hydration errors
- [ ] Responsive on mobile

---

## Notes

- Vault key MUST stay in memory only
- Use sessionStorage for unlock token (clears on close)
- Consider adding passphrase strength indicator
- Consider adding biometric unlock (WebAuthn)
- Add keyboard shortcut (Enter to submit)
- Show last unlock time in UI
- Consider auto-lock after inactivity
