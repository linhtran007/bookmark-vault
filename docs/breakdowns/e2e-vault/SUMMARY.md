# E2E Vault Feature - Task Breakdown Summary

## Overview

This document summarizes the complete task breakdown for implementing End-to-End (E2E) encrypted vault functionality for the Bookmark Vault application.

**Total Tasks:** 28 coarse-grained tasks (8+ hours each)
**Epics:** 4 (in dependency order)
**Estimated Timeline:** Foundation First approach

---

## Epic Dependency Graph

```
EPIC 1: Vault Foundations (Auth + DB + API)
├── BE: T-AUTH-01 → T-AUTH-02 → T-AUTH-03 → T-AUTH-04 → T-AUTH-05 → T-AUTH-06
└── FE: T-AUTH-07 → T-AUTH-08
                    ↓
EPIC 2: Crypto + Unlock (Client-side only)
└── FE: T-CRYPTO-01 → T-CRYPTO-02 → T-CRYPTO-03 → T-CRYPTO-04
                                        ↓       ↓
                                   T-CRYPTO-05 → T-CRYPTO-06
                                                    ↓
EPIC 3: Sync Engine
├── BE: T-SYNC-01 → T-SYNC-02 → T-SYNC-03
└── FE: T-SYNC-04 → T-SYNC-05 → T-SYNC-06 → T-SYNC-07 → T-SYNC-08
                                               ↓           ↓
EPIC 4: Complete Integration
├── BE: T-INT-01
└── FE: T-INT-02 → T-INT-03 → T-INT-04 → T-INT-05 → T-INT-06
```

---

## Epic 1: Vault Foundations (Auth + DB + API)

**File:** `docs/epics/e2e-vault-auth-neon.md`

**Goal:** Establish server-side foundation for Vault Mode

### Backend Tasks (6)

| ID | Task | State | Dependencies |
|----|------|-------|--------------|
| T-AUTH-01 | Install and Configure Clerk Authentication | pending | None |
| T-AUTH-02 | Create Neon Postgres Connection Layer | pending | T-AUTH-01 |
| T-AUTH-03 | Design and Implement Database Schema | pending | T-AUTH-02 |
| T-AUTH-04 | Implement Vault Configuration API Routes | pending | T-AUTH-03 |
| T-AUTH-05 | Implement Sync API Route Skeletons | pending | T-AUTH-04 |
| T-AUTH-06 | Add API Route Unit Tests | pending | T-AUTH-05 |

### Frontend Tasks (2)

| ID | Task | State | Dependencies |
|----|------|-------|--------------|
| T-AUTH-07 | Create Auth UI Components | pending | T-AUTH-01, T-AUTH-06 |
| T-AUTH-08 | Create Settings Screen Foundation | pending | T-AUTH-07 |

**Success Criteria:**
- User can sign in with Google
- Unauthenticated users cannot access vault/sync APIs
- Database schema supports vault and records
- API routes return proper responses

---

## Epic 2: Vault Crypto + Unlock UX

**File:** `docs/epics/e2e-vault-crypto-unlock.md`

**Goal:** Implement client-side encryption and unlock experience

### Frontend Tasks (6)

| ID | Task | State | Dependencies |
|----|------|-------|--------------|
| T-CRYPTO-01 | Implement WebCrypto Helper Functions | pending | None |
| T-CRYPTO-02 | Design Vault Key Envelope Model | pending | T-CRYPTO-01 |
| T-CRYPTO-03 | Create Full-Page Unlock Screen | pending | T-CRYPTO-02 |
| T-CRYPTO-04 | Implement Vault Enable Flow | pending | T-CRYPTO-03, T-AUTH-08 |
| T-CRYPTO-05 | Create Encrypted Local Storage Layer | pending | T-CRYPTO-02 |
| T-CRYPTO-06 | Add Settings Toggle for Vault Mode | pending | T-CRYPTO-04, T-CRYPTO-05 |

**Success Criteria:**
- User can enable vault mode with passphrase
- Vault remains locked until unlocked
- Unlock requires correct passphrase
- Local bookmarks are encrypted after enabling vault
- Settings toggle shows correct vault state

---

## Epic 3: Vault Sync Engine + Encrypted Backup

**File:** `docs/epics/e2e-vault-sync-backup.md`

**Goal:** Implement automatic sync with offline support and conflict resolution

### Backend Tasks (3)

| ID | Task | State | Dependencies |
|----|------|-------|--------------|
| T-SYNC-01 | Enhance Sync API with Cursor-Based Pagination | pending | T-AUTH-05 |
| T-SYNC-02 | Implement Conflict Detection on Server | pending | T-SYNC-01 |
| T-SYNC-03 | Add Encrypted Import/Export Endpoints | pending | T-SYNC-02 |

### Frontend Tasks (5)

| ID | Task | State | Dependencies |
|----|------|-------|--------------|
| T-SYNC-04 | Implement Local Outbox Queue | pending | T-CRYPTO-05 |
| T-SYNC-05 | Create Sync Engine Client | pending | T-SYNC-04 |
| T-SYNC-06 | Implement Conflict Resolution (Keep Both) | pending | T-SYNC-05 |
| T-SYNC-07 | Integrate Sync with Bookmark Hook | pending | T-SYNC-06 |
| T-SYNC-08 | Implement Encrypted Import/Export UI | pending | T-SYNC-03, T-CRYPTO-06 |

**Success Criteria:**
- Changes sync automatically to server
- Offline changes are queued and retried
- Conflicts create duplicate records
- Encrypted import/export works end-to-end
- Sync status is visible to users

---

## Epic 4: Complete E2E Cloud Sync Integration

**File:** `docs/epics/e2e-cloud-sync.md`

**Goal:** Complete polish with device management and UX improvements

### Backend Tasks (1)

| ID | Task | State | Dependencies |
|----|------|-------|--------------|
| T-INT-01 | Add Device Management Table and API | pending | T-AUTH-05 |

### Frontend Tasks (5)

| ID | Task | State | Dependencies |
|----|------|-------|--------------|
| T-INT-02 | Implement Session-Based Unlock Persistence | pending | T-CRYPTO-03 |
| T-INT-03 | Implement Per-Record Optimistic Sync | pending | T-SYNC-07 |
| T-INT-04 | Create Vault Dashboard UI | pending | T-INT-01, T-INT-02 |
| T-INT-05 | Implement Vault Disable Flow | pending | T-INT-04 |
| T-INT-06 | Add Onboarding for E2E Vault Mode | pending | T-INT-05 |

**Success Criteria:**
- Vault unlock persists for browser session
- Per-record sync status is visible
- Device list shows all active devices
- Vault disable offers both options
- Onboarding explains E2E clearly

---

## File Structure

### New Files to Create (46 files)

**Backend (13 files):**
- `app/middleware.ts`
- `lib/db.ts`
- `lib/db/migrations/001_create_vaults.sql`
- `lib/db/migrations/002_create_records.sql`
- `lib/db/migrations/003_create_devices.sql`
- `lib/db/schema.ts`
- `app/api/vault/route.ts`
- `app/api/vault/enable/route.ts`
- `app/api/sync/push/route.ts`
- `app/api/sync/pull/route.ts`
- `app/api/devices/route.ts`
- `app/api/vault/export/route.ts`
- `app/api/vault/import/route.ts`

**Frontend Components (15 files):**
- `components/auth/SignInButton.tsx`
- `components/auth/UserMenu.tsx`
- `components/auth/LockButton.tsx`
- `components/vault/UnlockScreen.tsx`
- `components/vault/EnableVaultModal.tsx`
- `components/vault/VaultSettings.tsx`
- `components/vault/VaultToggle.tsx`
- `components/vault/VaultStatusIndicator.tsx`
- `components/vault/VaultDashboard.tsx`
- `components/vault/DeviceList.tsx`
- `components/vault/SyncStatus.tsx`
- `components/vault/DisableVaultDialog.tsx`
- `components/vault/VaultOnboarding.tsx`
- `components/bookmarks/ConflictBadge.tsx`
- `components/bookmarks/SyncStatusBadge.tsx`

**Libraries and Hooks (11 files):**
- `lib/crypto.ts`
- `lib/encrypted-storage.ts`
- `lib/sync-outbox.ts`
- `lib/sync-engine.ts`
- `lib/sync-conflict.ts`
- `hooks/useVaultUnlock.ts`
- `hooks/useVaultEnable.ts`
- `hooks/useVaultDisable.ts`
- `hooks/useSyncEngine.ts`
- `hooks/useEncryptedImportExport.ts`
- `lib/vault-onboarding.ts`

**Test Files (7 files):**
- `lib/crypto/__tests__/crypto.test.ts`
- `lib/encrypted-storage/__tests__/storage.test.ts`
- `lib/sync-outbox/__tests__/outbox.test.ts`
- `lib/sync-engine/__tests__/sync.test.ts`
- `app/api/vault/__tests__/vault.test.ts`
- `app/api/sync/__tests__/sync.test.ts`

### Modified Files (7 files)

- `app/layout.tsx` - Add ClerkProvider, auth UI, lock button
- `app/page.tsx` - Add unlock gate when vault enabled
- `app/settings/page.tsx` - Add vault controls and dashboard
- `hooks/useBookmarks.ts` - Integrate sync, add sync status
- `lib/storage.ts` - Reference for encrypted storage pattern
- `lib/validation.ts` - Add vault and sync schemas
- `lib/types.ts` - Add vault and sync types

---

## Critical Reference Patterns

| File | Pattern to Follow |
|------|-------------------|
| `hooks/useBookmarks.ts` | Context + Reducer, optimistic UI, pending states |
| `lib/storage.ts` | localStorage versioning, singleton pattern |
| `lib/validation.ts` | Zod schemas, typed validation |
| `app/api/link-preview/route.ts` | API route structure, error handling |
| `components/ui/Modal.tsx` | Client components, Framer Motion |
| `hooks/useImportBookmarks.ts` | State machine pattern, file handling |

---

## Implementation Phases

**Phase 1: Foundation (Epic 1)**
- Complete T-AUTH-01 through T-AUTH-08
- This enables auth, database, and basic API skeleton

**Phase 2: Encryption (Epic 2)**
- Complete T-CRYPTO-01 through T-CRYPTO-06
- This enables client-side encryption and vault management

**Phase 3: Sync (Epic 3)**
- Complete T-SYNC-01 through T-SYNC-08
- This enables automatic sync and conflict resolution

**Phase 4: Polish (Epic 4)**
- Complete T-INT-01 through T-INT-06
- This adds device management and UX improvements

---

## Testing Strategy

### Unit Tests
- Crypto helper functions (round-trip encryption/decryption)
- Storage layer (encrypted read/write)
- Outbox queue (persistence, retry logic)
- API routes (authentication, version checking)

### Integration Tests
- Auth flow (sign-in/sign-out)
- Vault enable flow
- Unlock flow
- Sync cycle (push/pull/merge)
- Conflict handling
- Encrypted import/export

### E2E Tests (Optional)
- Complete user journey from sign-in to sync
- Multi-device conflict scenario
- Offline to online sync recovery

---

## Progress Tracking

See `progress.md` for detailed task status and completion logs.

---

## Next Steps

1. Start with **T-AUTH-01** (Install and Configure Clerk Authentication)
2. Update task states in `progress.md` as work progresses
3. Mark tasks as `done` only after testing verification
