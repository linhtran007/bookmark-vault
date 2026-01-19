# T-SYNC-07: Integrate Sync with Bookmark Hook

**Epic:** Vault Sync Engine + Encrypted Backup
**Type:** Frontend
**State:** pending
**Dependencies:** T-SYNC-06

---

## Action

Connect sync engine to bookmark CRUD operations

---

## Business Summary

Automatically sync all bookmark changes

---

## Logic

1. Add outbox operations on add/update/delete
2. Trigger sync after local changes
3. Update UI to show sync status
4. Handle sync failures gracefully
5. Queue failed operations for retry
6. Debounce sync triggers
7. Show sync indicator in toolbar

---

## Technical Logic

**CRUD Integration:**
- `addBookmark` → add to outbox → trigger sync
- `updateBookmark` → add to outbox → trigger sync
- `deleteBookmark` → add to outbox → trigger sync

**Sync Triggers:**
- Debounced (500ms after last change)
- Or immediate on explicit save
- Show sync status in UI

**Error Handling:**
- Failed sync stays in outbox
- Show error indicator
- Retry on next sync cycle

---

## Implementation

```typescript
// hooks/useBookmarks.ts (modified)
"use client";

import { useCallback, useEffect } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { useSyncEngine } from './useSyncEngine';
import * as outbox from '@/lib/sync-outbox';
import * as crypto from '@/lib/crypto';

export function useBookmarks() {
  const { isUnlocked, vaultKey } = useVaultStore();
  const { performSync, syncStatus } = useSyncEngine();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced sync trigger
  const triggerSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      if (isUnlocked && vaultKey) {
        performSync();
      }
    }, 500); // 500ms debounce
  }, [isUnlocked, vaultKey, performSync]);

  // Encrypt bookmark for sync
  const encryptBookmark = useCallback(async (
    bookmark: Bookmark
  ): Promise<string> => {
    if (!vaultKey) throw new Error('Vault not unlocked');

    const encryptionKey = await crypto.importVaultKey(vaultKey);
    const plaintext = new TextEncoder().encode(JSON.stringify(bookmark));
    const encrypted = await crypto.encryptData(plaintext, encryptionKey);

    return crypto.arrayToBase64(encrypted.ciphertext);
  }, [vaultKey]);

  // Add bookmark with sync
  const addBookmark = useCallback(async (
    bookmark: Omit<Bookmark, 'id' | 'createdAt'>
  ) => {
    // ... existing local add logic ...

    if (isUnlocked && vaultKey) {
      try {
        const ciphertext = await encryptBookmark(newBookmark);
        outbox.addToOutbox(newBookmark.id, 'create', { ciphertext });
        triggerSync();
      } catch (error) {
        console.error('Failed to queue sync:', error);
      }
    }

    return newBookmark;
  }, [isUnlocked, vaultKey, encryptBookmark, triggerSync]);

  // Update bookmark with sync
  const updateBookmark = useCallback(async (
    id: string,
    updates: Partial<Bookmark>
  ) => {
    // ... existing local update logic ...

    if (isUnlocked && vaultKey) {
      try {
        const ciphertext = await encryptBookmark(updatedBookmark);
        outbox.addToOutbox(id, 'update', { ciphertext });
        triggerSync();
      } catch (error) {
        console.error('Failed to queue sync:', error);
      }
    }

    return updatedBookmark;
  }, [isUnlocked, vaultKey, encryptBookmark, triggerSync]);

  // Delete bookmark with sync
  const deleteBookmark = useCallback((id: string) => {
    // ... existing local delete logic ...

    if (isUnlocked) {
      outbox.addToOutbox(id, 'delete', {
        ciphertext: '',
        deleted: true,
      });
      triggerSync();
    }
  }, [isUnlocked, triggerSync]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    // ... existing returns ...
    syncStatus,
    outboxCount: outbox.getOutboxCount(),
  };
}
```

---

## UI Updates

### components/bookmarks/BookmarkToolbar.tsx

```typescript
"use client";

import { useBookmarks } from "@/hooks/useBookmarks";

export function BookmarkToolbar() {
  const { syncStatus, outboxCount } = useBookmarks();

  return (
    <div className="flex items-center justify-between mb-4">
      {/* ... existing toolbar ... */}

      {/* Sync Status Indicator */}
      {syncStatus.syncing && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span>Syncing...</span>
        </div>
      )}

      {!syncStatus.syncing && syncStatus.lastSync && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Synced</span>
        </div>
      )}

      {!syncStatus.syncing && syncStatus.error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Sync error</span>
        </div>
      )}

      {outboxCount > 0 && !syncStatus.syncing && (
        <div className="text-sm text-gray-600">
          {outboxCount} pending
        </div>
      )}
    </div>
  );
}
```

---

## Bookmark Card Sync Status

```typescript
// components/bookmarks/BookmarkCard.tsx (modified)
import { useState, useEffect } from 'react';
import * as outbox from '@/lib/sync-outbox';

export function BookmarkCard({ bookmark }: Props) {
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Check if this bookmark is in outbox
    const checkStatus = () => {
      const outboxItems = outbox.loadOutbox();
      const isInOutbox = outboxItems.some(item => item.recordId === bookmark.id);
      setSyncing(isInOutbox);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, [bookmark.id]);

  return (
    <div className="border rounded p-4">
      <div className="flex justify-between items-start">
        {/* ... bookmark content ... */}

        {syncing && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <div className="animate-spin w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span>Syncing</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Testing

**Integration Test:**
- Verify add triggers sync
- Verify update triggers sync
- Verify delete triggers sync
- Verify sync status updates
- Verify debouncing works

---

## Files

**MODIFY:**
- `hooks/useBookmarks.ts` (add sync integration)
- `components/bookmarks/BookmarkToolbar.tsx` (add sync status)
- `components/bookmarks/BookmarkCard.tsx` (add per-record status)

**CREATE:**
- `components/bookmarks/SyncStatusBadge.tsx`

---

## Patterns

- Follow existing hook patterns
- Debounce sync triggers
- Show clear status indicators

---

## Verification Checklist

- [ ] Add bookmark queues sync
- [ ] Update bookmark queues sync
- [ ] Delete bookmark queues sync
- [ ] Sync debounced correctly
- [ ] Sync status shown in toolbar
- [ ] Per-record sync status shown
- [ ] Outbox count displayed
- [ ] Errors handled gracefully
- [ ] Cleanup on unmount
- [ ] Integration tests pass

---

## Notes

- Consider adding "force sync" button
- Consider adding sync settings (interval, etc.)
- Show sync progress for large batches
- Consider adding sync sound (optional)
- Handle offline mode gracefully
- Test with rapid changes
- Consider adding sync analytics
- Add sync to import/export flow
