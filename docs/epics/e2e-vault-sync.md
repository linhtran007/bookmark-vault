---
title: E2E Vault Sync Epic — Bookmark Vault
stack: Next.js (App Router) + TailwindCSS + TypeScript + Clerk + Neon Postgres
dependencies:
  - Plaintext cloud sync (already implemented)
scope:
  - Client-side end-to-end encryption (“vault”)
  - Encrypted cloud sync (push/pull) gated by unlock
  - Safe mode switching and cleanup between plaintext and E2E
non_goals:
  - No server-side decryption (server never sees plaintext)
  - No multi-user vault sharing (single-user vaults only)
  - No key recovery without passphrase
  - No offline-first “device pairing”
---

# EPIC: End-to-End Encrypted Vault Sync (Zero-Knowledge Cloud Sync)

## Goal
Enable signed-in users to sync bookmarks/spaces/pinned views to the cloud with **complete privacy**.

- In `syncMode='plaintext'`, the server stores JSON in `records.data`.
- In `syncMode='e2e'`, the server stores opaque ciphertext in `records.ciphertext` and **never sees plaintext**.

This epic is about making the encrypted path fully correct (push + pull + apply), and making mode switching safe and deterministic.

## Glossary
- **Vault envelope**: passphrase-wrapped vault key stored locally (safe to persist).
- **Vault key**: decrypted symmetric key stored **only in session** (sessionStorage) after unlock.
- **Outbox**: client-side queue of pending push operations.

## Current Status (Reality, From Repo)

### ✅ Already Implemented

**Server routes (Neon Postgres + Clerk auth)**
- Plaintext sync
  - `POST /api/sync/plaintext/push`
  - `GET /api/sync/plaintext/pull`
  - `GET /api/sync/plaintext/checksum`
- Encrypted sync
  - `POST /api/sync/push`
  - `GET /api/sync/pull`
- Sync settings
  - `GET/PUT /api/sync/settings` supports `syncMode: 'off' | 'plaintext' | 'e2e'`.
- Vault disable server workflow
  - `POST /api/vault/disable` supports: verify, delete encrypted records, delete vault.

**Client vault + sync plumbing**
- Vault enable: `hooks/useVaultEnable.ts`
  - Creates vault envelope, encrypts local data into encrypted local storage.
  - Switches to `syncMode='e2e'`, queues encrypted outbox, pushes to server.
  - Clears plaintext local storage.
- Vault unlock: `hooks/useVaultUnlock.ts` + UI (`components/vault/UnlockScreen.tsx`)
  - Unwraps `vaultKey` from envelope and stores it in `sessionStorage` via `stores/vault-store.ts`.
- Vault disable (E2E → plaintext revert): `hooks/useVaultDisable.ts`
  - Passphrase required.
  - Decrypts encrypted local storage → re-uploads plaintext → deletes encrypted server records → clears encrypted local storage → switches sync mode back to plaintext.
- Unified sync surface: `hooks/useSyncEngineUnified.ts`
  - Branches by `syncMode`:
    - plaintext uses `/api/sync/plaintext/*`
    - e2e uses `/api/sync/push` + `/api/sync/pull`

### ⚠️ Known Gaps / Bugs

**1) Server push endpoints do not enforce “mode invariants”**
- Plaintext push selects existing records without filtering `encrypted=false`, and updates `data` only.
- Encrypted push selects existing records without filtering `encrypted=true`, and updates `ciphertext` only.

This allows “hybrid rows” (encrypted flag + both columns populated) and breaks mode switching guarantees.

**2) Client E2E pull does not apply results to storage**
- `lib/sync-engine.ts` currently broadcasts pulled records to a `BroadcastChannel` and returns `records: []`.
- `hooks/useSyncEngineUnified.ts` calls encrypted pull, but does not persist/decrypt/apply pulled ciphertext.

## Locked Decisions

### 1) Endpoint naming (keep existing)
- Encrypted: `POST /api/sync/push`, `GET /api/sync/pull`
- Plaintext: `/api/sync/plaintext/*`

No `/api/sync/e2e/*` rename.

### 2) Storage model: single `records` table
One row per `(user_id, record_id, record_type)`.

Columns:
- `encrypted boolean`
- `data` (plaintext JSON) — only valid when `encrypted=false`
- `ciphertext` (opaque bytes) — only valid when `encrypted=true`

### 3) Mode invariants (must be enforced server-side)
For every row in `records`:
- If `encrypted = true`:
  - `ciphertext` MUST be set
  - `data` MUST be NULL
- If `encrypted = false`:
  - `data` MUST be set
  - `ciphertext` MUST be NULL

Push routes may “convert” a row in-place to the desired mode by flipping `encrypted` and clearing the other column.

### 4) Leftover encrypted cloud records while in plaintext mode: **BLOCK until resolved**
Decision (A): If the user is in `syncMode='plaintext'` but encrypted cloud records exist for the user, plaintext sync is considered **blocked** until the user resolves it.

**UX behavior**
- Show a dialog explaining:
  - “Encrypted cloud data exists from a previous vault session.”
  - “Plaintext sync is paused to avoid split-brain data.”
- Provide actions:
  1) **Revert (Recommended)**: prompt for passphrase and run the existing revert flow (`hooks/useVaultDisable.ts`).
  2) **Delete encrypted cloud data** (danger): delete encrypted server records without decrypting/re-uploading; continue in plaintext.
  3) **Cancel**: keep sync disabled for now.

(Delete option should require explicit confirmation; this is destructive.)

## Definition of Done
- E2E mode provides working **push + pull + apply**, resulting in consistent local state across devices after unlock.
- Server enforces record invariants for both push routes.
- Plaintext mode correctly blocks when leftover encrypted cloud data exists, with a clear recovery path.
- Unit/integration tests cover server routes + core sync logic.

## Implementation Map

### Phase A — Server correctness (invariants + conflicts)
- Update plaintext push to set `encrypted=false` and clear `ciphertext` on insert/update.
- Update encrypted push to set `encrypted=true` and clear `data` on insert/update.
- Ensure conflict responses include `recordId`, `recordType`, and server version (+ ciphertext when relevant).

### Phase B — Encrypted pull/apply pipeline
- Make `lib/sync-engine.ts` return pulled records (not broadcast-only).
- Add an apply step that:
  - writes pulled ciphertext into encrypted local storage
  - if vault is unlocked, decrypts and applies to normal local storages

### Phase C — Mode switching safety
- Add detection for leftover encrypted cloud records when in plaintext mode.
  - If found: block sync and show dialog.
  - Wire dialog actions to:
    - `useVaultDisable()` (revert)
    - `/api/vault/disable` with `{ action: 'delete-encrypted' }` (delete)

### Phase D — Tests (unit/integration)
- Route tests for:
  - `POST /api/sync/plaintext/push` (ensures `encrypted=false` + `ciphertext` cleared)
  - `POST /api/sync/push` (ensures `encrypted=true` + `data` cleared)
  - `GET /api/sync/plaintext/pull` and `GET /api/sync/pull` (mode filtering)
- Light unit tests around encrypted pull returning records.

## Key Files (Reality-Based)

### Server
- `app/api/sync/plaintext/push/route.ts`
- `app/api/sync/plaintext/pull/route.ts`
- `app/api/sync/plaintext/checksum/route.ts`
- `app/api/sync/push/route.ts`
- `app/api/sync/pull/route.ts`
- `app/api/sync/settings/route.ts`
- `app/api/vault/disable/route.ts`

### Client
- `hooks/useSyncEngineUnified.ts`
- `hooks/useVaultEnable.ts`
- `hooks/useVaultUnlock.ts`
- `hooks/useVaultDisable.ts`
- `stores/vault-store.ts`
- `lib/plaintext-sync-engine.ts`
- `lib/sync-engine.ts`
- `lib/encrypted-storage.ts`
