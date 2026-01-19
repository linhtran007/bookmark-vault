# T-INT-02: Implement Session-Based Unlock Persistence

**Epic:** Complete E2E Cloud Sync Integration
**Type:** Frontend
**State:** pending
**Dependencies:** T-CRYPTO-03 (Epic 2)

---

## Action

Add session storage for unlocked vault state

---

## Business Summary

Improve UX by keeping vault unlocked during browser session

---

## Logic

1. Store unlock state in sessionStorage
2. Auto-lock on browser close
3. Add manual lock button
4. Implement idle timeout (optional)
5. Clear unlock state on sign-out
6. Check unlock state on app load
7. Show lock button in header when unlocked

---

## Technical Logic

- Use `sessionStorage` for unlock token (NOT localStorage)
- Session storage clears when browser/tab closes
- Store a temporary unlock token (NOT the vault key)
- Derive vault key from token + passphrase on unlock
- Clear token on Clerk `signOut` event
- Optional: Auto-lock after 30 minutes of inactivity

---

## Implementation

```typescript
// hooks/useVaultUnlock.ts (modified)
"use client";

import { useCallback, useEffect } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import * as crypto from '@/lib/crypto';

const UNLOCK_TOKEN_KEY = 'vault-unlock-token';
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useVaultUnlock() {
  const { setUnlocked, setVaultKey, vaultEnvelope, isUnlocked, lock } =
    useVaultStore();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check for existing unlock token on mount
  useEffect(() => {
    const token = sessionStorage.getItem(UNLOCK_TOKEN_KEY);

    if (token && vaultEnvelope) {
      // Token exists but we need passphrase to actually unlock
      // For now, just clear it since we don't have passphrase
      sessionStorage.removeItem(UNLOCK_TOKEN_KEY);
    }
  }, [vaultEnvelope]);

  // Reset idle timer on user activity
  useEffect(() => {
    if (!isUnlocked) return;

    const resetIdleTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        lock();
      }, IDLE_TIMEOUT);
    };

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetIdleTimer);
    });

    resetIdleTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [isUnlocked, lock]);

  // Clear unlock token on sign-out
  useEffect(() => {
    const handleSignOut = () => {
      sessionStorage.removeItem(UNLOCK_TOKEN_KEY);
      lock();
    };

    // Listen for Clerk sign-out event
    window.addEventListener('clerk:sign-out', handleSignOut);

    return () => {
      window.removeEventListener('clerk:sign-out', handleSignOut);
    };
  }, [lock]);

  const unlock = useCallback(
    async (passphrase: string) => {
      if (!vaultEnvelope) {
        throw new Error('No vault envelope found');
      }

      // Derive vault key
      const vaultKey = await crypto.unwrapVaultKeyFromEnvelope(
        vaultEnvelope,
        passphrase
      );

      // Store unlock token in sessionStorage (NOT the vault key)
      // The token could be a hash or timestamp to verify unlock
      sessionStorage.setItem(UNLOCK_TOKEN_KEY, Date.now().toString());

      // Store vault key in memory only
      setVaultKey(vaultKey);
      setUnlocked(true);
    },
    [vaultEnvelope, setVaultKey, setUnlocked]
  );

  return { unlock, isUnlocked };
}
```

---

## Lock Button Component

```typescript
// components/auth/LockButton.tsx
"use client";

import { useVaultStore } from '@/stores/vault-store';
import { useVaultUnlock } from '@/hooks/useVaultUnlock';

export function LockButton() {
  const { isUnlocked, lock } = useVaultStore();

  if (!isUnlocked) return null;

  return (
    <button
      onClick={lock}
      className="px-3 py-1 text-sm border rounded hover:bg-gray-50 flex items-center gap-2"
      title="Lock vault"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clipRule="evenodd"
        />
      </svg>
      <span>Lock</span>
    </button>
  );
}
```

---

## Integration into Header

```typescript
// app/layout.tsx or components/Header.tsx
import { AuthHeader } from '@/components/auth/AuthHeader';
import { LockButton } from '@/components/auth/LockButton';
import { useVaultStore } from '@/stores/vault-store';

export function Header() {
  const { isUnlocked } = useVaultStore();

  return (
    <header className="border-b px-4 py-2 flex justify-between items-center">
      <h1>Bookmark Vault</h1>

      <div className="flex items-center gap-4">
        {isUnlocked && <LockButton />}
        <AuthHeader />
      </div>
    </header>
  );
}
```

---

## Optional: Idle Timeout Warning

```typescript
// Add to useVaultUnlock hook
const [showIdleWarning, setShowIdleWarning] = useState(false);

// Update idle timer to show warning 1 minute before timeout
idleTimerRef.current = setTimeout(() => {
  setShowIdleWarning(true);
  // Then lock after 1 more minute
  setTimeout(() => {
    lock();
    setShowIdleWarning(false);
  }, 60 * 1000);
}, IDLE_TIMEOUT - 60 * 1000);

// Add warning dialog
{showIdleWarning && (
  <IdleWarningDialog
    onContinue={() => {
      setShowIdleWarning(false);
      resetIdleTimer();
    }}
    onLockNow={() => {
      lock();
      setShowIdleWarning(false);
    }}
  />
)}
```

---

## Testing

**Integration Test:**
- Verify unlock persists in session
- Verify lock clears session
- Verify lock button works
- Verify sign-out clears unlock

---

## Files

**CREATE:**
- `components/auth/LockButton.tsx`

**MODIFY:**
- `hooks/useVaultUnlock.ts`
- `app/layout.tsx` or `components/Header.tsx`

---

## Patterns

- Follow existing auth patterns
- Use sessionStorage for session-only data
- Clear on sign-out

---

## Verification Checklist

- [ ] Unlock token stored in sessionStorage
- [ ] Token cleared on browser close
- [ ] Manual lock button works
- [ ] Sign-out clears unlock
- [ ] Lock button shown when unlocked
- [ ] Idle timeout implemented (optional)
- [ ] Idle warning shows (optional)
- [ ] Integration tests pass

---

## Notes

- SessionStorage is tab-specific (not shared across tabs)
- Consider using BroadcastChannel for multi-tab sync
- Consider adding "Remember unlock" checkbox (less secure)
- Idle timeout improves security on shared computers
- Consider adding biometric re-auth (WebAuthn)
- Show lock indicator in UI when locked
- Test across multiple tabs
- Consider adding keyboard shortcut (Cmd+L to lock)
