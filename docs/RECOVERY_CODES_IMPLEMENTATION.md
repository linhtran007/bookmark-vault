# Recovery Codes Implementation Guide

## Overview

This document describes the complete implementation of recovery codes for Bookmark Vault E2EE. Recovery codes provide a backup unlock method when users forget their passphrase.

## What Was Implemented

### 1. Cryptographic Functions (lib/crypto.ts)

**New functions added:**

- `formatRecoveryCode(bytes)` - Converts 12 random bytes to `xxxx-xxxx-xxxx-xxxx` format
- `parseRecoveryCode(code)` - Normalizes user-entered code (removes dashes, uppercase)
- `hashRecoveryCode(code)` - SHA-256 hash of recovery code for secure lookup
- `generateRecoveryCodes(count)` - Generates N recovery codes (default 8)
- `wrapVaultKeyWithRecoveryCode(vaultKey, code)` - Wraps vault key with recovery code
- `unwrapVaultKeyWithRecoveryCode(wrappedKey, salt, code)` - Unwraps vault key with recovery code
- Updated `createKeyEnvelope()` - Now returns `{ envelope, recoveryCodes }` and optionally generates recovery codes

**Key Design:**
- Recovery codes use same PBKDF2 + AES-GCM as passphrase
- Each code can independently unwrap the vault key
- Codes are formatted as `xxxx-xxxx-xxxx-xxxx` for human readability
- SHA-256 hash of recovery codes stored (not plaintext)

### 2. Type System (lib/types.ts)

**New interfaces:**

```typescript
interface RecoveryCodeWrapper {
  id: string;              // Unique UUID for this wrapper
  wrappedKey: string;      // Base64-encoded AES-GCM encrypted vault key
  salt: string;            // Base64-encoded PBKDF2 salt
  codeHash: string;        // Base64-encoded SHA-256 hash of recovery code
  usedAt: string | null;   // ISO timestamp when code was used (null = unused)
}

// VaultKeyEnvelope extended to include optional recovery wrappers
interface VaultKeyEnvelope {
  wrappedKey: string;
  salt: string;
  kdfParams: KdfParams;
  version: number;
  recoveryWrappers?: RecoveryCodeWrapper[];  // NEW
}
```

### 3. State Management (stores/vault-store.ts)

**New method:**
- `updateEnvelope(envelope)` - Updates vault envelope in localStorage and state (used after recovery code operations)

### 4. Hooks

#### useRecoveryCodeUnlock.ts

Unlocks vault with recovery code and forces passphrase change:

```typescript
const { unlockWithRecoveryCode } = useRecoveryCodeUnlock();
await unlockWithRecoveryCode(recoveryCode, newPassphrase);
```

**Flow:**
1. User enters recovery code
2. Hash code and find matching wrapper
3. Verify code hasn't been used
4. Unwrap vault key with recovery code
5. Derive new wrapping key from new passphrase
6. Update envelope with new passphrase wrapper + mark code as used
7. Persist to server
8. Unlock vault

#### useRecoveryCodeRegenerate.ts

Regenerates all 8 recovery codes (marks old ones invalid):

```typescript
const { regenerateRecoveryCodes } = useRecoveryCodeRegenerate();
const newCodes = await regenerateRecoveryCodes(currentPassphrase);
```

**Flow:**
1. Verify passphrase
2. Generate 8 new recovery codes
3. Wrap vault key with each code
4. Update envelope with new wrappers
5. Persist to server
6. Return new codes for display

### 5. UI Components

#### RecoveryCodeDisplay.tsx

Shows recovery codes after vault enable with options to download/print:

- Displays 8 recovery codes in grid
- Copy-to-clipboard for each code
- Download as text file
- Print option
- Requires user confirmation before proceeding
- Emphasis on secure storage

#### RecoveryCodeUnlock.tsx

Two-step recovery flow:

1. **Step 1:** User enters recovery code
   - Validates code format
   - Finds matching wrapper
   - Checks if already used

2. **Step 2:** Set new passphrase
   - Verifies recovery code
   - Requires new passphrase (12+ chars)
   - Force passphrase change (not optional)
   - Shows used code for confirmation
   - Marks recovery code as used (one-time use)

#### RecoveryCodeSettings.tsx

Settings page component for managing recovery codes:

- Shows count of remaining codes
- Button to generate new codes
- Requires passphrase verification
- Opens modal for regeneration
- Shows warning when codes are low

### 6. API Routes

#### POST/PUT /api/vault/envelope

**GET** - Retrieve current vault envelope (with recovery wrappers):

```
GET /api/vault/envelope
Response: { envelope: VaultKeyEnvelope }
```

**PUT** - Update vault envelope (save recovery code changes):

```
PUT /api/vault/envelope
Body: VaultKeyEnvelope
Response: { success: true, envelopeUpdated: true }
```

**Security:**
- Requires authentication (Clerk)
- Only returns/modifies current user's envelope
- Converts base64 strings to/from database BYTEA columns

### 7. Integration Points

#### Vault Enable Flow (hooks/useVaultEnable.ts)

Modified to:
- Generate recovery codes during vault creation
- Return recovery codes in progress state
- Store in `progress.recoveryCodes`

#### Vault Enable Modal (components/vault/EnableVaultModal.tsx)

Updated to:
- Display recovery codes after encryption completes
- Use `RecoveryCodeDisplay` component
- Only proceed after user confirms codes saved
- Then reload to unlock flow

#### Unlock Screen (components/vault/UnlockScreen.tsx)

Added recovery code unlock option:
- "Forgot passphrase? Use recovery code" link
- Toggles to `RecoveryCodeUnlock` component
- After recovery unlock, vault is unlocked (success)

### 8. Database Migration

**New file:** `lib/db/migrations/005_add_recovery_codes.sql`

```sql
ALTER TABLE vaults
ADD COLUMN IF NOT EXISTS recovery_wrappers JSONB;
```

**Format of recovery_wrappers column:**

```json
[
  {
    "id": "uuid-string",
    "wrappedKey": "base64-encoded-wrapped-vault-key",
    "salt": "base64-encoded-salt",
    "codeHash": "base64-encoded-sha256-hash",
    "usedAt": "ISO-timestamp or null"
  },
  ...
]
```

## Implementation Features

### Security Properties

✅ **One-time use codes** - Each code can only be used once, then marked as `usedAt`

✅ **Force passphrase change** - After using recovery code, user must set new passphrase

✅ **Cryptographically strong** - Uses same PBKDF2 + AES-GCM as passphrase

✅ **Server never sees plaintext** - Only stores encrypted wrappers and code hashes

✅ **Backward compatible** - Old envelopes without recovery codes still work

✅ **Vault key unchanged** - Recovery codes don't change vault key, only unlock methods

### User Experience

✅ **Easy recovery** - User can regain access if passphrase forgotten

✅ **Clear instructions** - Recovery code display shows importance of saving

✅ **Multiple formats** - Download, print, or copy recovery codes

✅ **Code regeneration** - User can generate new codes anytime with passphrase

✅ **Settings integration** - View code status in vault settings

## What Still Needs to Be Done

### 1. Database Migration

Run the migration to add `recovery_wrappers` column:

```bash
# Option A: Automatic migration on app startup
# (if using migration runner in app initialization)

# Option B: Manual migration
psql -U user -d database -f lib/db/migrations/005_add_recovery_codes.sql
```

### 2. API Route Registration

The new route at `/api/vault/envelope/route.ts` should be automatically picked up by Next.js App Router.

Verify:
- `GET /api/vault/envelope` returns vault envelope with recovery wrappers
- `PUT /api/vault/envelope` updates recovery wrappers on server

### 3. Component Integration

**Optional: Add RecoveryCodeSettings to vault settings page**

If you have a vault settings/admin page, import and add:

```tsx
import { RecoveryCodeSettings } from '@/components/vault/RecoveryCodeSettings';

export function VaultSettings() {
  return (
    <div>
      {/* Other vault settings... */}
      <RecoveryCodeSettings />
    </div>
  );
}
```

### 4. Testing Scenarios

Test the following user flows:

**Scenario 1: Create vault with recovery codes**
1. Click "Enable E2EE"
2. Enter passphrase
3. Confirm recovery codes display
4. Verify codes can be downloaded/printed
5. Reload page
6. Should require unlock with passphrase

**Scenario 2: Unlock with recovery code**
1. While vault is locked, click "Forgot passphrase? Use recovery code"
2. Enter one of the recovery codes
3. Should proceed to set new passphrase step
4. Enter new passphrase (12+ chars)
5. Should unlock vault
6. Verify that recovery code is marked as used
7. Try using same code again - should fail

**Scenario 3: Regenerate recovery codes**
1. Go to vault settings (if settings page exists)
2. Click "Generate New Codes"
3. Enter passphrase
4. Should display 8 new codes
5. Verify recovery code count resets to 8

**Scenario 4: Change passphrase (future feature)**
- After implementing passphrase change, recovery codes should still work
- Old recovery codes should remain valid until regenerated

### 5. User Documentation

Consider documenting:
- What recovery codes are
- How to save them securely
- What happens if recovery code is lost
- How to regenerate recovery codes
- Recovery code vs passphrase security

## File Structure Summary

```
lib/
├── crypto.ts                                    # Recovery code crypto functions
├── types.ts                                     # RecoveryCodeWrapper type
├── db/migrations/005_add_recovery_codes.sql    # Database schema

hooks/
├── useRecoveryCodeUnlock.ts                    # Unlock with recovery code hook
├── useRecoveryCodeRegenerate.ts                # Regenerate codes hook
└── useVaultEnable.ts                           # Modified to return recovery codes

components/vault/
├── RecoveryCodeDisplay.tsx                     # Show codes after enable
├── RecoveryCodeUnlock.tsx                      # Unlock flow
├── RecoveryCodeSettings.tsx                    # Settings page component
├── EnableVaultModal.tsx                        # Modified to show recovery codes
└── UnlockScreen.tsx                            # Modified to support recovery code unlock

app/api/vault/
└── envelope/route.ts                           # GET/PUT recovery codes API

stores/
└── vault-store.ts                              # Added updateEnvelope method
```

## Database Schema

```sql
-- vaults table (existing, with NEW column)
CREATE TABLE vaults (
  id UUID PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  wrapped_key BYTEA NOT NULL,            -- Primary passphrase-wrapped key
  salt BYTEA NOT NULL,                   -- Primary PBKDF2 salt
  kdf_params JSONB NOT NULL,             -- Primary PBKDF2 parameters
  recovery_wrappers JSONB,               -- NEW: Array of RecoveryCodeWrapper
  enabled_at TIMESTAMP,
  device_fingerprint TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Security Considerations

### Threat Mitigations

| Threat | Mitigation |
|--------|-----------|
| Code brute force | Same PBKDF2 + AES-GCM work factor as passphrase |
| Code reuse after use | Marked as `usedAt`, client checks before unlock |
| Code compromise | One-time use limits exposure window |
| Multiple unused codes | User can regenerate at any time |
| Lost all codes | User can regenerate with passphrase |
| Server breach | Only code hashes stored, not plaintext codes |
| Lost passphrase + lost codes | Data is permanently inaccessible (by design) |

### Implementation Decisions

1. **One-time use**: Each code can only be used once to limit window of exposure if leaked
2. **Force passphrase change**: After recovery, users set new passphrase for additional security
3. **8 codes**: Enough backup options without overwhelming users with too many
4. **Format**: `xxxx-xxxx-xxxx-xxxx` is human-readable and easy to type
5. **Code hashing**: Server never sees plaintext codes, only SHA-256 hashes
6. **Backward compatible**: Old envelopes without recovery codes still work

## Future Enhancements

- [ ] WebAuthn/FIDO2 as alternative unlock method
- [ ] Passphrase change without recovery code
- [ ] Recovery code expiration (e.g., codes expire after 6 months)
- [ ] Email backup of recovery codes
- [ ] Threshold recovery (require 2-of-3 codes)
- [ ] Hardware key support
- [ ] Printable recovery code cards with QR code

## Testing Checklist

- [ ] Recovery codes generated on vault enable
- [ ] Recovery codes display after enable
- [ ] Recovery codes can be downloaded as file
- [ ] Recovery codes can be printed
- [ ] Can unlock with recovery code
- [ ] Recovery code marked as used after unlock
- [ ] Cannot reuse same recovery code
- [ ] Can regenerate recovery codes from settings
- [ ] Recovery codes persist to server
- [ ] Recovery codes synced across devices
- [ ] Recovery code unlock forces passphrase change
- [ ] New passphrase works after recovery
- [ ] Old recovery codes invalid after regeneration

## References

- E2EE Deep Dive: `docs/E2EE_DEEP_DIVE.md`
- Vault Store: `stores/vault-store.ts`
- Crypto Implementation: `lib/crypto.ts`
