# T-SYNC-04: Implement Local Outbox Queue

**Epic:** Vault Sync Engine + Encrypted Backup
**Type:** Frontend
**State:** pending
**Dependencies:** T-CRYPTO-05 (Epic 2)

---

## Action

Create durable queue for offline sync operations

---

## Business Summary

Ensure no data is lost when offline or sync fails

---

## Logic

1. Create outbox data structure
2. Add operations to outbox on local changes
3. Persist outbox to localStorage
4. Implement retry logic with exponential backoff
5. Remove successful operations from outbox
6. Track retry count and timestamp

---

## Technical Logic

**Outbox Item:**
```typescript
{
  id: string;              // Unique outbox item ID
  recordId: string;        // Bookmark ID
  operation: 'create' | 'update' | 'delete';
  payload: {
    ciphertext: string;
    deleted?: boolean;
  };
  timestamp: string;       // ISO timestamp
  retryCount: number;
  lastAttempt?: string;
}
```

**Retry Backoff:**
1s, 2s, 4s, 8s, 16s, 32s, 60s max

---

## Implementation

```typescript
// lib/sync-outbox.ts
const OUTBOX_STORAGE_KEY = 'vault-sync-outbox';

export interface OutboxItem {
  id: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  payload: {
    ciphertext: string;
    deleted?: boolean;
  };
  timestamp: string;
  retryCount: number;
  lastAttempt?: string;
}

/**
 * Load all outbox items from localStorage
 */
export function loadOutbox(): OutboxItem[] {
  const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save outbox to localStorage
 */
function saveOutbox(outbox: OutboxItem[]): void {
  localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(outbox));
}

/**
 * Add an operation to the outbox
 */
export function addToOutbox(
  recordId: string,
  operation: OutboxItem['operation'],
  payload: OutboxItem['payload']
): void {
  const outbox = loadOutbox();

  // Remove any existing operation for this record
  const filtered = outbox.filter((item) => item.recordId !== recordId);

  // Add new operation
  filtered.push({
    id: `${recordId}-${Date.now()}`,
    recordId,
    operation,
    payload,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  });

  saveOutbox(filtered);
}

/**
 * Remove an item from the outbox
 */
export function removeFromOutbox(itemId: string): void {
  const outbox = loadOutbox();
  const filtered = outbox.filter((item) => item.id !== itemId);
  saveOutbox(filtered);
}

/**
 * Update item after sync attempt
 */
export function updateOutboxItem(
  itemId: string,
  success: boolean
): void {
  const outbox = loadOutbox();
  const index = outbox.findIndex((item) => item.id === itemId);

  if (index === -1) return;

  if (success) {
    // Remove successful items
    removeFromOutbox(itemId);
  } else {
    // Increment retry count and update timestamp
    outbox[index].retryCount += 1;
    outbox[index].lastAttempt = new Date().toISOString();
    saveOutbox(outbox);
  }
}

/**
 * Get items ready for retry
 */
export function getRetryableItems(): OutboxItem[] {
  const outbox = loadOutbox();
  const now = Date.now();

  return outbox.filter((item) => {
    // Calculate backoff delay
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 60 seconds
    const delay = Math.min(baseDelay * Math.pow(2, item.retryCount), maxDelay);

    const attemptTime = item.lastAttempt
      ? new Date(item.lastAttempt).getTime()
      : new Date(item.timestamp).getTime();

    return now - attemptTime >= delay;
  });
}

/**
 * Get pending outbox count
 */
export function getOutboxCount(): number {
  return loadOutbox().length;
}

/**
 * Clear all outbox items (use with caution)
 */
export function clearOutbox(): void {
  localStorage.removeItem(OUTBOX_STORAGE_KEY);
}

/**
 * Get outbox stats for UI
 */
export function getOutboxStats(): {
  total: number;
  pending: number;
  failed: number;
} {
  const outbox = loadOutbox();

  return {
    total: outbox.length,
    pending: outbox.filter((item) => item.retryCount === 0).length,
    failed: outbox.filter((item) => item.retryCount > 0).length,
  };
}
```

---

## Usage in useBookmarks Hook

```typescript
// hooks/useBookmarks.ts
import * as outbox from '@/lib/sync-outbox';

// In addBookmark:
const addBookmark = useCallback((bookmark: Omit<Bookmark, "id" | "createdAt">) => {
  // ... existing logic ...

  // Add to outbox if vault enabled
  if (isVaultEnabled) {
    const ciphertext = encryptBookmark(bookmark);
    outbox.addToOutbox(bookmark.id, 'create', { ciphertext });
    triggerSync();
  }
}, [isVaultEnabled, triggerSync]);

// In updateBookmark:
const updateBookmark = useCallback((id: string, updates: Partial<Bookmark>) => {
  // ... existing logic ...

  if (isVaultEnabled) {
    const ciphertext = encryptBookmark(updatedBookmark);
    outbox.addToOutbox(id, 'update', { ciphertext });
    triggerSync();
  }
}, [isVaultEnabled, triggerSync]);

// In deleteBookmark:
const deleteBookmark = useCallback((id: string) => {
  // ... existing logic ...

  if (isVaultEnabled) {
    outbox.addToOutbox(id, 'delete', { ciphertext: '', deleted: true });
    triggerSync();
  }
}, [isVaultEnabled, triggerSync]);
```

---

## Testing

**Unit Test:**
- Verify outbox persistence
- Verify retry logic
- Verify exponential backoff
- Verify items removed on success

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import * as outbox from '@/lib/sync-outbox';

describe('Sync Outbox', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists items to localStorage', () => {
    outbox.addToOutbox('bookmark-1', 'create', { ciphertext: 'encrypted' });

    const items = outbox.loadOutbox();
    expect(items).toHaveLength(1);
    expect(items[0].recordId).toBe('bookmark-1');
  });

  it('calculates retry delay correctly', async () => {
    outbox.addToOutbox('bookmark-1', 'create', { ciphertext: 'encrypted' });

    // Should not be retryable immediately
    expect(outbox.getRetryableItems()).toHaveLength(0);

    // Wait 1 second
    await new Promise((resolve) => setTimeout(resolve, 1100));

    expect(outbox.getRetryableItems()).toHaveLength(1);
  });

  it('removes items on success', () => {
    outbox.addToOutbox('bookmark-1', 'create', { ciphertext: 'encrypted' });
    const items = outbox.loadOutbox();

    outbox.updateOutboxItem(items[0].id, true);

    expect(outbox.loadOutbox()).toHaveLength(0);
  });
});
```

---

## Files

**CREATE:**
- `lib/sync-outbox.ts`
- `lib/sync-outbox/__tests__/outbox.test.ts`

**MODIFY:**
- `hooks/useBookmarks.ts` (add outbox operations)

---

## Patterns

- Follow `lib/storage.ts` persistence pattern
- Use exponential backoff for retries
- Track retry statistics

---

## Verification Checklist

- [ ] Outbox data structure defined
- [ ] Add to outbox function works
- [ ] Remove from outbox function works
- [ ] Retry logic implemented
- [ ] Exponential backoff works
- [ ] Persistence survives page reload
- [ ] Stats function works
- [ ] Integrated with bookmark hook
- [ ] Unit tests pass
- [ ] No data loss on page close

---

## Notes

- Outbox is client-side only
- Consider adding max retry limit
- Consider adding age limit (delete old failed items)
- Sync engine should process outbox periodically
- Show outbox status in UI
- Consider adding "force sync now" button
- Test offline scenario extensively
- Consider adding outbox to IndexedDB for larger datasets
