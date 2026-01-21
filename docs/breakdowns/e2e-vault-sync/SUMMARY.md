# E2E Vault Sync - Epic Breakdown Summary

## Epic Overview
Enable signed-in users to sync bookmarks/spaces/pinned views to the cloud with complete privacy. In `syncMode='e2e'`, the server stores opaque ciphertext and never sees plaintext.

## Tech Context
- **Stack**: Next.js (App Router) + React 19 + TypeScript (strict) + TailwindCSS
- **Auth**: Clerk
- **Database**: Neon Postgres
- **API Style**: Next.js Route Handlers

## User Answers (Locked Decisions)

| Question | Answer |
|----------|--------|
| E2E Tests | **Backend only** - Unit/integration tests for server routes and sync logic |
| Pull Behavior | **Background pull** - Store ciphertext without unlock, decrypt when user unlocks (best practice) |
| Block Action | **Prompt user** - Always show dialog with revert/delete/cancel options |
| Row Conversion | **Auto-convert** - Push converts row in-place to desired mode |

## Task Tree (20 Tasks Maximum)

### Phase A: Server Correctness (Invariants + Auto-Conversion)

#### T001 - Fix Plaintext Push Mode Invariants
- **Type**: BE | **State**: pending
- **Business Summary**: Ensure plaintext push always writes plaintext rows (no mixed-mode columns)
- **Logic**: On insert/update in `POST /api/sync/plaintext/push`, enforce: `encrypted=false`, `data=...`, `ciphertext=NULL`
- **Technical Logic**:
  - INSERT: include `ciphertext = NULL`
  - UPDATE: set `encrypted=false`, `data=$1`, `ciphertext=NULL`
- **Testing**: Jest integration-style test for the route handler
- **Files**:
  - Modify: `app/api/sync/plaintext/push/route.ts`

#### T002 - Fix Encrypted Push Mode Invariants
- **Type**: BE | **State**: pending
- **Business Summary**: Ensure encrypted push always writes encrypted rows (no mixed-mode columns)
- **Logic**: On insert/update in `POST /api/sync/push`, enforce: `encrypted=true`, `ciphertext=...`, `data=NULL`
- **Technical Logic**:
  - INSERT: include `data = NULL`
  - UPDATE: set `encrypted=true`, `ciphertext=$1`, `data=NULL`
- **Testing**: Jest integration-style test for the route handler
- **Files**:
  - Modify: `app/api/sync/push/route.ts`

#### T003 - Add Row Auto-Conversion to Plaintext Push
- **Type**: BE | **State**: pending
- **Business Summary**: Allow mode switching by overwriting encrypted rows with plaintext when needed
- **Logic**: If a row already exists (even if encrypted), plaintext push should convert it in-place to plaintext
- **Technical Logic**: UPDATE clause must flip `encrypted=false` and clear ciphertext
- **Testing**: Jest test simulating existing encrypted row then pushing plaintext
- **Files**:
  - Modify: `app/api/sync/plaintext/push/route.ts`

#### T004 - Add Row Auto-Conversion to Encrypted Push
- **Type**: BE | **State**: pending
- **Business Summary**: Allow mode switching by overwriting plaintext rows with ciphertext when needed
- **Logic**: If a row already exists (even if plaintext), encrypted push should convert it in-place to encrypted
- **Technical Logic**: UPDATE clause must flip `encrypted=true` and clear data
- **Testing**: Jest test simulating existing plaintext row then pushing ciphertext
- **Files**:
  - Modify: `app/api/sync/push/route.ts`

#### T005 - Add Encrypted Record Presence Check (Reuse Existing Vault Verify)
- **Type**: BE | **State**: pending
- **Business Summary**: Allow the client to detect leftover encrypted cloud data while in plaintext mode
- **Logic**: Reuse `POST /api/vault/disable { action: 'verify' }` which already returns `encryptedRecordCount`
- **Technical Logic**: No new endpoint needed; wire client to call the existing route
- **Testing**: Jest test for `/api/vault/disable` verify response (already exercises `encryptedRecordCount`)
- **Files**:
  - Modify: `docs/breakdowns/e2e-vault-sync/tasks/T005.md` (doc-only change)

### Phase B: Client E2E Pull/Apply Pipeline (Two Engines Stay)

#### T006 - Return Pulled Records from `lib/sync-engine.ts`
- **Type**: FE | **State**: pending
- **Business Summary**: Make E2E pull usable by the app (not broadcast-only)
- **Logic**: Update `syncPull` to accumulate and return records instead of returning `records: []`
- **Technical Logic**:
  - Maintain pagination loop
  - Return `records: allRecords`
  - Decide: keep or remove BroadcastChannel usage (preferred: remove and handle centrally)
- **Testing**: Jest unit test mocking `fetch` and asserting returned records
- **Files**:
  - Modify: `lib/sync-engine.ts`

#### T007 - Persist Pulled Ciphertext Using Existing `lib/encrypted-storage.ts`
- **Type**: FE | **State**: pending
- **Business Summary**: Support background pull by storing ciphertext locally before unlock
- **Logic**: Extend/reuse the existing encrypted storage layer (do not create a new conflicting file)
- **Technical Logic**:
  - Add a dedicated storage key for "server pulled ciphertext records" (separate from migration/vault local records if needed)
  - Provide merge-by `(recordId, recordType)` + version
- **Testing**: Jest unit test for save/load/merge behavior
- **Files**:
  - Modify: `lib/encrypted-storage.ts`

#### T008 - Add `decryptAndApplyPulledE2eRecords(vaultKey)` Utility
- **Type**: FE | **State**: pending
- **Business Summary**: Apply pulled E2E state to the normal local storages after unlock
- **Logic**: Read stored pulled ciphertext, decrypt with `vaultKey`, then write into bookmarks/spaces/pinned-views storage
- **Technical Logic**:
  - Decrypt via existing crypto helpers
  - Preserve `_syncVersion` and `updatedAt` (server is source of truth)
  - Respect `deleted=true`
- **Testing**: Jest unit test with fixture ciphertext (or crypto mock) verifying storage writes
- **Files**:
  - Create: `lib/decrypt-and-apply.ts`

#### T009 - Wire E2E Pull Apply into `hooks/useSyncEngineUnified.ts`
- **Type**: FE | **State**: pending
- **Business Summary**: Make Sync Pull actually update app state in E2E mode
- **Logic**: In E2E branch of `syncPull`:
  - pull ciphertext
  - persist ciphertext
  - if unlocked, decrypt+apply and trigger refresh
- **Testing**: Jest hook/unit test (lightweight) verifying apply called when unlocked
- **Files**:
  - Modify: `hooks/useSyncEngineUnified.ts`

#### T010 - Apply Background-Pulled Data Immediately After Vault Unlock
- **Type**: FE | **State**: pending
- **Business Summary**: When a user unlocks, they immediately see cloud data (pulled earlier)
- **Logic**: After successful unlock in `hooks/useVaultUnlock.ts`, run `decryptAndApplyPulledE2eRecords(vaultKey)`
- **Testing**: Jest test for unlock flow calling apply
- **Files**:
  - Modify: `hooks/useVaultUnlock.ts`

### Phase C: Plaintext Mode Blocking (Decision A)

#### T011 - Detect Leftover Encrypted Cloud Data in Plaintext Mode
- **Type**: FE | **State**: pending
- **Business Summary**: Prevent split-brain by pausing plaintext sync when encrypted cloud data exists
- **Logic**: Before plaintext push/pull, call `POST /api/vault/disable { action: 'verify' }` and check `encryptedRecordCount > 0`
- **Testing**: Jest test for decision logic (mock fetch)
- **Files**:
  - Modify: `hooks/useSyncEngineUnified.ts`

#### T012 - Add Blocked Sync Dialog (Revert / Delete / Cancel)
- **Type**: FE | **State**: pending
- **Business Summary**: Explain the problem and give the user recovery actions
- **Logic**: Modal dialog with:
  - Revert (passphrase) → uses `hooks/useVaultDisable.ts`
  - Delete encrypted (danger confirm) → calls `/api/vault/disable` delete-encrypted
  - Cancel → disables sync / closes dialog
- **Testing**: Jest component test for rendering + button callbacks
- **Files**:
  - Create: `components/sync/BlockedSyncDialog.tsx`

#### T013 - Wire Dialog into Settings/Sync UI + Unified Engine
- **Type**: FE | **State**: pending
- **Business Summary**: Make the blocking behavior actually visible and effective
- **Logic**: Add `isSyncBlocked` state and render `BlockedSyncDialog` when the blocked condition is detected
- **Testing**: Jest test verifying dialog appears on blocked condition
- **Files**:
  - Modify: `hooks/useSyncEngineUnified.ts`
  - Modify: sync UI component(s) that trigger sync (to be identified during implementation)

### Phase D: Tests (Keep Backend-First Where It Matters)

#### T014 - Route Handler Tests for Push Invariants + Auto-Conversion
- **Type**: BE-TEST | **State**: pending
- **Business Summary**: Prevent regressions that can corrupt records across modes
- **Logic**: Tests must cover:
  - plaintext push inserts/updates set `encrypted=false` and clear ciphertext
  - encrypted push inserts/updates set `encrypted=true` and clear data
  - conversion (existing opposite-mode row)
- **Technical Logic**: Jest tests mocking `@/lib/db` `query()` and calling route handlers directly
- **Files**:
  - Create: `app/api/sync/plaintext/push/route.test.ts`
  - Create: `app/api/sync/push/route.test.ts`

#### T015 - Route Handler Tests for Pull Mode Filtering
- **Type**: BE-TEST | **State**: pending
- **Business Summary**: Ensure plaintext pull and encrypted pull never leak the other mode
- **Logic**: Tests should assert the SQL includes the correct `encrypted = true/false` filters
- **Files**:
  - Create: `app/api/sync/plaintext/pull/route.test.ts`
  - Create: `app/api/sync/pull/route.test.ts`

#### T016 - Client Unit Tests for E2E Pull/Apply Utilities
- **Type**: FE-TEST | **State**: pending
- **Business Summary**: Validate the E2E apply pipeline without needing Playwright
- **Logic**: Tests for:
  - `lib/sync-engine.ts` returns records
  - encrypted storage merge/save/load
  - decrypt+apply writes to bookmark/space/pinned-view storages
- **Files**:
  - Create: `lib/sync-engine.test.ts`
  - Create: `lib/encrypted-storage.test.ts`
  - Create: `lib/decrypt-and-apply.test.ts`

---

## Dependency Graph

```
Phase A: T001–T004
  ↓
Phase B: T006–T010
  ↓
Phase C: T011–T013
  ↓
Phase D: T014–T016
```

## Progress Tracking

See `progress.md` for detailed status of each task.
