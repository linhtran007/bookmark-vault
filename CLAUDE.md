## Bookmark Vault

A bookmark manager built with Next.js App Router, TailwindCSS, and TypeScript.

- Local data persists in `localStorage`.
- Optional cloud sync persists to Neon Postgres, authenticated via Clerk.
- Sync supports `plaintext` and `e2e` (end-to-end encrypted “vault”) modes.

## Stack

- Next.js (App Router)
- React 19
- TypeScript (strict)
- TailwindCSS
- Zod (validation)
- Clerk (auth)
- Neon Postgres (cloud sync storage)
- `localStorage` / `sessionStorage` (client persistence)
- Framer Motion (Modal/BottomSheet animation)
- Sonner (toasts)

## Conventions

- Functional components only.
- Any component/hook that touches `window`, `document`, `localStorage`, or `sessionStorage` must be a client component (`"use client"`).
- Prefer small components (< 100 lines): split UI into primitives + feature modules.
- Use UI primitives from `components/ui` (and the barrel `@/components/ui` where possible).

## Sync + Vault (Current Architecture)

### Modes
- `syncMode='off'`: no cloud sync.
- `syncMode='plaintext'`: server stores JSON in `records.data`.
- `syncMode='e2e'`: server stores ciphertext in `records.ciphertext` and never sees plaintext.

### Server Routes
**Plaintext**
- `POST /api/sync/plaintext/push`
- `GET /api/sync/plaintext/pull`
- `GET /api/sync/plaintext/checksum`

**E2E**
- `POST /api/sync/push`
- `GET /api/sync/pull`

**Settings**
- `GET/PUT /api/sync/settings` stores `syncEnabled`, `syncMode`, and `lastSyncAt`.

**Vault disable**
- `POST /api/vault/disable` supports verify + deleting encrypted records/vault.

### Client Engines
- Plaintext engine: `lib/plaintext-sync-engine.ts`
  - Outbox key: `plaintext-sync-outbox`
  - Talks to `/api/sync/plaintext/*`
- Encrypted engine: `lib/sync-engine.ts`
  - Outbox key: `vault-sync-outbox` (implemented in `lib/sync-outbox.ts`)
  - Talks to `/api/sync/push` + `/api/sync/pull`

### Vault State
- `stores/vault-store.ts`
  - Persists per-user vault envelope in `localStorage`.
  - Persists unlocked vault session (`vaultKey`) in `sessionStorage` (cleared on browser close).

## Key Hooks (What They Do)

- `hooks/useBookmarks.ts`
  - Source of truth for bookmark state (Context + reducer).
  - Loads bookmarks on the client after mount to avoid hydration mismatch.
  - Exposes CRUD (`addBookmark`, `updateBookmark`, `deleteBookmark`) and `importBookmarks`.
  - Handles optimistic UI + error toasts.

- `hooks/useBookmarkForm.ts`
  - Form state + Zod validation for create/edit.

- `hooks/useImportBookmarks.ts`
  - Import flow state machine (JSON file → validate → preview → merge/replace).

- `hooks/useKeyboardShortcuts.ts`
  - Keyboard shortcuts for focusing inputs, opening/closing modals, and clearing search.

- `hooks/useSyncEngineUnified.ts`
  - Unified client sync surface used by UI + providers.
  - Branches by `syncMode`:
    - `plaintext` uses `/api/sync/plaintext/*`
    - `e2e` uses `/api/sync/push` + `/api/sync/pull`
  - `e2e` requires vault to be unlocked (`vaultEnvelope` + `vaultKey`).

- `hooks/useVaultEnable.ts`
  - Creates a vault key envelope from passphrase, encrypts local data into encrypted storage.
  - Switches the app to `syncMode='e2e'`, queues encrypted outbox, pushes to server, then clears plaintext local storage.

- `hooks/useVaultUnlock.ts`
  - Unwraps vault key from envelope (passphrase), validates by decrypting a record, and unlocks vault session.

- `hooks/useVaultDisable.ts`
  - Implements E2E → plaintext revert:
    - verifies passphrase, decrypts encrypted local storage
    - uploads plaintext via plaintext sync engine
    - deletes encrypted server records via `/api/vault/disable`
    - clears local encrypted storage + switches mode to plaintext

## Happy Path (User Flow)

1. Click **Add bookmark** → modal opens → fill title/url/description/tags → **Save** → toast confirms.
2. Use **Search**, **Tag**, and **Sort** controls to filter the list.
3. Edit or delete a bookmark from the list (edit modal / delete sheet).
4. Click the **Import/Export** icon → modal opens:
   - Export downloads `bookmarks-YYYY-MM-DD.json`.
   - Import selects a JSON file → preview → choose mode/options → import.

## Folder Structure

```text
app/
  layout.tsx              # Providers (e.g. ToastProvider)
  page.tsx                # Home: toolbar + list + modals
app/api/
  sync/                   # Cloud sync routes (plaintext + e2e)
  vault/                  # Vault lifecycle routes
components/
  bookmarks/              # Feature UI modules
  settings/               # Sync/vault settings UI
  ui/                     # UI primitives (+ `components/ui/index.ts` barrel)
hooks/                    # State + behaviors
lib/                      # Storage + validation + sync engines
stores/                   # Zustand stores (vault, settings, etc.)
docs/
```

## Claude Code Skills

### bookmark-safety
**Location:** `~/.claude/skills/bookmark-safety/`

Protects bookmark vault data from accidental deletion using Claude Code PreToolUse hooks.

**What it does:**
- Intercepts `Edit` and `Write` tool calls on bookmark storage files
- Blocks dangerous operations: `localStorage.clear()`, `removeItem('bookmark-vault-*')`
- Allows safe operations to proceed normally
- Permits intentional deletions with explicit acknowledgment comments

**How to use:**
- Automatically active when editing storage-related files
- Add acknowledgment comments to perform intentional deletions: `// ACKNOWLEDGMENT: [reason]`

**Files:**
- `SKILL.md` - Skill configuration with PreToolUse hook
- `scripts/check-dangerous.sh` - Safety validation script
- `scripts/test-hook.sh` - Comprehensive test suite (10 tests)
- `README.md` - Full documentation

**Testing:**
```bash
bash ~/.claude/skills/bookmark-safety/scripts/test-hook.sh
```

### bookmark-validator
**Location:** `~/.claude/skills/bookmark-validator/`

Validates bookmark data quality and detects issues systematically.

**What it analyzes:**
- Schema violations (UUID format, field constraints)
- Duplicate URLs (normalized comparison)
- Missing descriptions and tags
- Generic/suspicious titles
- Invalid URLs (HTTP instead of HTTPS, localhost, etc.)
- Tag suggestions (domain-based pattern matching)

**How to use:**
```bash
# Export bookmarks from browser to JSON file
# Then validate:
claude validate my bookmarks for quality issues
```

**Output:**
- Structured report with summary statistics
- All issues listed with specific bookmark IDs
- Actionable recommendations for each issue
- Tag suggestions based on domain patterns
