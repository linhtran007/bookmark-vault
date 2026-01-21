---
title: E2E Vault Sync Epic — Bookmark Vault
stack: Next.js (App Router) + TailwindCSS + TypeScript + PostgreSQL
scope: end-to-end encryption, vault sync, cloud storage
non_goals:
  - No server-side decryption (server never sees plaintext)
  - No multi-user vault sharing (single-user vaults only)
  - No key recovery without passphrase
---

# EPIC: End-to-End Encrypted Vault Sync (Wow: Private Cloud Sync)

## Epic Goal
Enable users to sync their bookmarks to the cloud with **complete privacy** — the server stores encrypted data and **never sees the plaintext**. Users maintain full control of their data through their vault passphrase.

## Definition of Done
- E2E sync APIs handle encrypted records (push/pull/checksum)
- Server stores only encrypted data (plaintext never transmitted)
- E2E sync engine integrates with existing sync infrastructure
- Users can migrate from plaintext to E2E mode seamlessly
- Vault unlock required for E2E sync operations
- Sync works reliably across devices with vault passphrase
- Rollback mechanism if E2E sync fails

## Key Decisions Needed

### 1. Server Storage Strategy
- **Option A (Recommended)**: Add `encrypted` boolean to existing `records` table
  - Single table, encrypted records have `encrypted=true`, `data` contains ciphertext
  - Simple migration path
  - Consistent indexing for both modes

- **Option B**: Separate `encrypted_records` table
  - Clean separation of concerns
  - More complex sync logic
  - Duplicate table structure

### 2. E2E Record Format
```typescript
// Server stores this (never decrypted)
interface EncryptedRecord {
  user_id: string;
  record_id: string;
  record_type: 'bookmark' | 'space' | 'pinned-view';
  ciphertext: string;        // AES-GCM-256 encrypted
  version: number;
  deleted: boolean;
  updated_at: string;
}

// Plaintext equivalent (for comparison)
interface PlaintextRecord {
  recordId: string;
  recordType: string;
  data: unknown;             // Actual bookmark/space/view data
  version: number;
  deleted: boolean;
  updatedAt: string;
}
```

### 3. Sync Mode Isolation
- **Option A (Recommended)**: Users choose ONE mode (plaintext OR E2E)
  - Simpler mental model
  - Clear UX boundaries
  - Server tracks user's sync mode in `sync_settings`

- **Option B**: Allow both modes simultaneously
  - More complex
  - Potential data confusion

### 4. Migration from Plaintext to E2E
- When user enables E2E:
  1. Client encrypts all local data
  2. Push encrypted records to server
  3. Server deletes old plaintext records
  4. User's sync mode updated to `e2e`
- Rollback: If migration fails, keep plaintext data

---

## Tasks (Agent-Friendly)

### Phase 1: Server Schema & API Foundation

#### 1.1 Update database schema
```sql
-- Add encrypted flag to records table
ALTER TABLE records ADD COLUMN encrypted BOOLEAN DEFAULT false;
ALTER TABLE records ADD COLUMN ciphertext TEXT;

-- Index for encrypted record queries
CREATE INDEX idx_records_user_encrypted ON records(user_id, encrypted);
```

#### 1.2 Create E2E push endpoint
- Route: `POST /api/sync/e2e/push`
- Accepts array of encrypted operations
- Stores `ciphertext` directly (no decryption)
- Returns sync results (conflicts, errors)
- **Important**: Server must NEVER attempt to decrypt

#### 1.3 Create E2E pull endpoint
- Route: `GET /api/sync/e2e/pull`
- Returns user's encrypted records
- Supports pagination (cursor-based)
- Returns only `encrypted=true` records
- Client decrypts after receiving

#### 1.4 Create E2E checksum endpoint
- Route: `GET /api/sync/e2e/checksum`
- Calculates checksum from encrypted records
- Uses `ciphertext` for hash (server can't hash plaintext)
- Returns count, lastUpdate, checksum

#### 1.5 Update sync_settings schema
```sql
-- Track user's sync mode
ALTER TABLE sync_settings ADD COLUMN sync_mode VARCHAR(10) DEFAULT 'plaintext';
-- Values: 'off', 'plaintext', 'e2e'
```

---

### Phase 2: E2E Sync Engine Implementation

#### 2.1 Implement E2E sync push
- File: `lib/sync-engine.ts` (complete placeholder functions)
- Encrypt records before pushing
- Handle conflicts (last-write-wins based on version)
- Update local `_syncVersion` after successful push
- Queue operations in outbox

#### 2.2 Implement E2E sync pull
- Fetch encrypted records from server
- Decrypt using vault key
- Merge with local data
- Handle deletions (`deleted=true` records)
- Apply pulled records to localStorage

#### 2.3 Implement E2E checksum calculation
- Calculate from local encrypted data
- Match server's checksum logic
- Use for sync optimization

#### 2.4 Integrate with unified sync engine
- File: `hooks/useSyncEngineUnified.ts`
- Route to E2E functions when `syncMode === 'e2e'`
- Ensure vault is unlocked before E2E operations
- Show appropriate errors if vault locked

---

### Phase 3: Migration & UX

#### 3.1 Complete E2E enable flow
- File: `hooks/useVaultEnable.ts`
- After vault creation and local encryption:
  - Push all encrypted records to server
  - Wait for server confirmation
  - Delete old plaintext records from server
  - Update user's `sync_mode` to `e2e`
- Handle failures gracefully (keep plaintext fallback)

#### 3.2 Vault unlock for sync
- File: `hooks/useVaultUnlock.ts`
- When vault unlocks:
  - Trigger immediate sync if needed
  - Load E2E outbox operations
  - Clear any pending sync errors

#### 3.3 Sync mode UI
- File: `components/settings/SyncModeToggle.tsx`
- Show current mode clearly
- Explain E2E vs plaintext differences
- Warn before switching modes
- Mode switching requires confirmation

#### 3.4 Error handling
- Vault locked: "Unlock vault to sync"
- Server error: Retry with exponential backoff
- Decryption failed: "Corrupted data - contact support"
- Network error: Queue for retry

---

### Phase 4: Testing & Validation

#### 4.1 E2E sync tests
- Test push/pull with encrypted data
- Test conflict resolution
- Test checksum optimization
- Test offline queue (outbox)

#### 4.2 Migration tests
- Test plaintext → E2E migration
- Test rollback on failure
- Test re-migration (disable → enable)

#### 4.3 Cross-device sync
- Create vault on Device A
- Sync encrypted data
- Unlock vault on Device B
- Verify data matches

#### 4.4 Security validation
- Verify server never stores plaintext
- Verify transmission is HTTPS
- Verify vault key never leaves client
- Verify passphrase strength requirements

---

## Acceptance Criteria

### Functional
- [ ] E2E push successfully stores encrypted records
- [ ] E2E pull returns and decrypts records correctly
- [ ] Checksum optimization works for E2E mode
- [ ] Migration from plaintext to E2E completes successfully
- [ ] Vault unlock triggers sync if needed
- [ ] Sync errors are handled gracefully

### Security
- [ ] Server NEVER receives plaintext data in E2E mode
- [ ] Vault key never transmitted or stored on server
- [ ] Encrypted data is unreadable without vault key
- [ ] HTTPS enforced for all E2E sync calls

### UX
- [ ] Users understand E2E vs plaintext tradeoffs
- [ ] Vault unlock flow is clear and fast
- [ ] Sync status is visible and accurate
- [ ] Errors are actionable (e.g., "Unlock vault to sync")

### Performance
- [ ] E2E sync completes in < 5 seconds for 1000 records
- [ ] Checksum comparison skips unnecessary pulls
- [ ] Vault unlock doesn't block UI

---

## Architecture Notes

### Data Flow (E2E Sync)

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐ │
│  │  localStorage│─────▶│ Vault Store │─────▶│   Crypto    │ │
│  │ (Plaintext)  │      │ (Keys)      │      │ (AES-GCM)   │ │
│  └─────────────┘      └─────────────┘      └─────────────┘ │
│         │                                            │      │
│         ▼                                            ▼      │
│  ┌─────────────┐                              ┌─────────────┐│
│  │ Sync Engine │                              │   E2E Sync  ││
│  │ (Unified)   │                              │   (Push)    ││
│  └─────────────┘                              └─────────────┘│
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS (Encrypted Records)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        SERVER                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                     │   │
│  │  records:                                            │   │
│  │    - user_id                                          │   │
│  │    - encrypted = true                                 │   │
│  │    - ciphertext (NEVER decrypted)                     │   │
│  │    - version, deleted, updated_at                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Files to Modify/Create

**New Files:**
- `app/api/sync/e2e/push/route.ts`
- `app/api/sync/e2e/pull/route.ts`
- `app/api/sync/e2e/checksum/route.ts`

**Modify Files:**
- `lib/sync-engine.ts` (complete E2E functions)
- `hooks/useSyncEngineUnified.ts` (route to E2E APIs)
- `hooks/useVaultEnable.ts` (add server migration)
- `lib/db.ts` (add encrypted queries)

---

## Dependencies

### Must Complete First
- ✅ Plaintext cloud sync (currently in progress)
- ✅ Vault system (already implemented)
- ✅ Crypto utilities (already implemented)
- ✅ Encrypted local storage (already implemented)

### This Epic Enables
- Future: Multi-device E2E sync
- Future: Vault backup/recovery
- Future: Secure sharing (optional)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| User forgets passphrase | Data loss | Clear warnings during setup; optional backup key |
| Server stores plaintext accidentally | Security breach | Server validation; automated tests |
| Sync corruption | Data loss | Version conflict detection; rollback mechanism |
| Performance degradation | UX issues | Benchmark; optimize batch sizes |
| Migration fails | Stuck in intermediate state | Keep plaintext until E2E confirmed; atomic mode switch |

---

## Success Metrics

- **Adoption**: % of users with E2E enabled (target: 20%)
- **Reliability**: E2E sync success rate (target: > 99%)
- **Performance**: Average sync time (target: < 3s for 100 records)
- **Security**: Zero plaintext leaks in logs/monitoring
- **Support**: Vault-related support tickets (track trends)
