# T-CRYPTO-05: Create Encrypted Local Storage Layer

**Epic:** Vault Crypto + Unlock UX
**Type:** Frontend (Client-side only)
**State:** pending
**Dependencies:** T-CRYPTO-02

---

## Action

Build storage layer for encrypted bookmark data

---

## Business Summary

Persist encrypted data locally while maintaining localStorage patterns

---

## Logic

1. Create encrypted storage utilities
2. Add version tracking for encrypted records
3. Implement read/write operations with encryption
4. Add migration path from plaintext to encrypted storage
5. Keep old plaintext storage until migration confirmed
6. Support both encrypted and plaintext modes

---

## Technical Logic

- New storage key: `bookmark-vault-encrypted`
- Encrypt before writing to localStorage
- Decrypt after reading from localStorage
- Maintain version numbers per record
- Keep old plaintext storage until migration complete
- Support dual-mode operation (plaintext vs encrypted)

---

## Implementation

```typescript
// lib/encrypted-storage.ts
import * as crypto from "./crypto";

const ENCRYPTED_STORAGE_KEY = "bookmark-vault-encrypted";
const PLAINTEXT_STORAGE_KEY = "bookmark-vault-bookmarks"; // Existing

export interface StoredEncryptedRecord {
  recordId: string;
  ciphertext: string;  // base64
  iv: string;          // base64
  tag: string;         // base64
  version: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Save encrypted record to localStorage
 */
export async function saveEncryptedRecord(
  record: StoredEncryptedRecord
): Promise<void> {
  const records = loadAllEncryptedRecords();
  const index = records.findIndex((r) => r.recordId === record.recordId);

  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }

  localStorage.setItem(ENCRYPTED_STORAGE_KEY, JSON.stringify(records));
}

/**
 * Load all encrypted records from localStorage
 */
export function loadAllEncryptedRecords(): StoredEncryptedRecord[] {
  const raw = localStorage.getItem(ENCRYPTED_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Delete encrypted record
 */
export function deleteEncryptedRecord(recordId: string): void {
  const records = loadAllEncryptedRecords();
  const filtered = records.filter((r) => r.recordId !== recordId);
  localStorage.setItem(ENCRYPTED_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Encrypt and save a bookmark
 */
export async function encryptAndSaveBookmark(
  bookmark: Bookmark,
  vaultKey: Uint8Array
): Promise<void> {
  const encryptionKey = await crypto.importVaultKey(vaultKey);
  const plaintext = new TextEncoder().encode(JSON.stringify(bookmark));
  const encrypted = await crypto.encryptData(plaintext, encryptionKey);

  const existing = loadAllEncryptedRecords();
  const existingRecord = existing.find((r) => r.recordId === bookmark.id);
  const version = existingRecord ? existingRecord.version + 1 : 1;

  const record: StoredEncryptedRecord = {
    recordId: bookmark.id,
    ciphertext: crypto.arrayToBase64(encrypted.ciphertext),
    iv: crypto.arrayToBase64(encrypted.iv),
    tag: crypto.arrayToBase64(encrypted.tag),
    version,
    deleted: false,
    createdAt: bookmark.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await saveEncryptedRecord(record);
}

/**
 * Load and decrypt a bookmark
 */
export async function loadAndDecryptBookmark(
  recordId: string,
  vaultKey: Uint8Array
): Promise<Bookmark | null> {
  const records = loadAllEncryptedRecords();
  const record = records.find((r) => r.recordId === recordId);

  if (!record || record.deleted) return null;

  const encryptionKey = await crypto.importVaultKey(vaultKey);
  const ciphertext = crypto.base64ToArray(record.ciphertext);
  const iv = crypto.base64ToArray(record.iv);
  const tag = crypto.base64ToArray(record.tag);

  const decrypted = await crypto.decryptData(
    { ciphertext, iv, tag },
    encryptionKey
  );

  const plaintext = new TextDecoder().decode(decrypted);
  return JSON.parse(plaintext) as Bookmark;
}

/**
 * Load and decrypt all bookmarks
 */
export async function loadAndDecryptAllBookmarks(
  vaultKey: Uint8Array
): Promise<Bookmark[]> {
  const records = loadAllEncryptedRecords();
  const bookmarks: Bookmark[] = [];

  for (const record of records) {
    if (record.deleted) continue;

    const bookmark = await loadAndDecryptBookmark(record.recordId, vaultKey);
    if (bookmark) {
      bookmarks.push(bookmark);
    }
  }

  return bookmarks;
}

/**
 * Check if encrypted storage exists
 */
export function hasEncryptedStorage(): boolean {
  const raw = localStorage.getItem(ENCRYPTED_STORAGE_KEY);
  return raw !== null && raw !== "";
}

/**
 * Migrate plaintext bookmarks to encrypted storage
 */
export async function migrateToEncrypted(
  vaultKey: Uint8Array
): Promise<void> {
  // Load existing plaintext bookmarks
  const plaintextRaw = localStorage.getItem(PLAINTEXT_STORAGE_KEY);
  if (!plaintextRaw) return;

  const bookmarks = JSON.parse(plaintextRaw) as Bookmark[];

  // Encrypt each bookmark
  for (const bookmark of bookmarks) {
    await encryptAndSaveBookmark(bookmark, vaultKey);
  }

  // Note: We DON'T delete the plaintext storage yet
  // User can manually delete after confirming everything works
}

/**
 * Rollback migration (delete encrypted, restore plaintext)
 */
export function rollbackMigration(): void {
  localStorage.removeItem(ENCRYPTED_STORAGE_KEY);
  // Plaintext storage still exists
}
```

---

## Migration Helper

```typescript
// lib/migration.ts
import * as encryptedStorage from "./encrypted-storage";
import { loadAllEncryptedRecords } from "./encrypted-storage";

export async function migrateBookmarksToVault(vaultKey: Uint8Array) {
  await encryptedStorage.migrateToEncrypted(vaultKey);
}

export function isVaultMigrationComplete(): boolean {
  // Check if encrypted storage exists and has data
  const records = loadAllEncryptedRecords();
  return records.length > 0;
}

export function canRollbackMigration(): boolean {
  // Check if plaintext storage still exists
  const plaintext = localStorage.getItem("bookmark-vault-bookmarks");
  return plaintext !== null;
}

export function commitMigration(): void {
  // Delete plaintext storage after confirming vault works
  if (isVaultMigrationComplete()) {
    localStorage.removeItem("bookmark-vault-bookmarks");
  }
}
```

---

## Testing

**Unit Test:**
- Verify encryption/decryption round-trip
- Verify version tracking
- Verify persistence across page reloads
- Verify migration preserves data

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import * as storage from '@/lib/encrypted-storage';

describe('Encrypted Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads encrypted record', async () => {
    const vaultKey = new Uint8Array(32);
    const bookmark = {
      id: 'test-1',
      title: 'Test',
      url: 'https://test.com',
      createdAt: new Date().toISOString(),
    };

    await storage.encryptAndSaveBookmark(bookmark, vaultKey);
    const loaded = await storage.loadAndDecryptBookmark('test-1', vaultKey);

    expect(loaded).toEqual(bookmark);
  });

  it('tracks versions correctly', async () => {
    const vaultKey = new Uint8Array(32);
    const bookmark = {
      id: 'test-1',
      title: 'Test',
      url: 'https://test.com',
      createdAt: new Date().toISOString(),
    };

    await storage.encryptAndSaveBookmark(bookmark, vaultKey);
    await storage.encryptAndSaveBookmark(bookmark, vaultKey);

    const records = storage.loadAllEncryptedRecords();
    const record = records.find((r) => r.recordId === 'test-1');

    expect(record?.version).toBe(2);
  });
});
```

---

## Files

**CREATE:**
- `lib/encrypted-storage.ts`
- `lib/encrypted-storage/__tests__/storage.test.ts`
- `lib/migration.ts`

**MODIFY:**
- `lib/crypto.ts` (add importVaultKey helper)

---

## Patterns

- Follow `lib/storage.ts` structure
- Use existing storage keys
- Maintain backward compatibility

---

## Verification Checklist

- [ ] Encrypted storage utilities created
- [ ] Save/load operations work
- [ ] Version tracking implemented
- [ ] Migration helpers created
- [ ] Rollback function works
- [ ] Unit tests pass
- [ ] Works with existing storage
- [ ] No data loss during migration
- [ ] Plaintext storage preserved initially

---

## Notes

- Keep plaintext storage until user confirms
- Add migration status indicator in UI
- Consider adding migration progress for large datasets
- Test with 0, 100, 1000+ bookmarks
- Add compression for large payloads
- Consider using IndexedDB for large datasets
- Add storage quota error handling
