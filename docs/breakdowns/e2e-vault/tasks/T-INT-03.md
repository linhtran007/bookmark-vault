# T-INT-03: Implement Per-Record Optimistic Sync

**Epic:** Complete E2E Cloud Sync Integration
**Type:** Frontend
**State:** pending
**Dependencies:** T-SYNC-07 (Epic 3)

---

## Action

Add real-time sync indicators per bookmark

---

## Business Summary

Show users sync status for individual bookmarks

---

## Logic

1. Add sync status field to bookmark state
2. Show loading indicators during sync
3. Add error indicators for failed sync
4. Implement retry button for failed records
5. Update outbox to track per-record status
6. Use optimistic UI pattern
7. Update status based on outbox state

---

## Technical Logic

**Sync Status:**
- `pending` - Added to outbox, waiting to sync
- `syncing` - Currently syncing
- `synced` - Successfully synced
- `error` - Sync failed, needs retry

**Status Tracking:**
- Check outbox for record ID
- Display appropriate icon/badge
- Show error message on hover
- Retry on click

---

## Implementation

```typescript
// hooks/useBookmarks.ts (modified)
import * as outbox from '@/lib/sync-outbox';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

// Add sync status to bookmark interface
interface BookmarkWithSync extends Bookmark {
  _syncStatus?: SyncStatus;
  _syncError?: string;
}

// Get sync status for a record
const getSyncStatus = useCallback((recordId: string): SyncStatus => {
  const outboxItems = outbox.loadOutbox();
  const item = outboxItems.find((i) => i.recordId === recordId);

  if (!item) return 'synced';
  if (item.retryCount > 0) return 'error';
  return 'pending';
}, []);

// Enhanced bookmark return with sync status
const bookmarksWithSync = useMemo(() => {
  return state.bookmarks.map((bookmark) => ({
    ...bookmark,
    _syncStatus: getSyncStatus(bookmark.id),
  }));
}, [state.bookmarks, getSyncStatus]);

return {
  // ... existing returns ...
  bookmarks: bookmarksWithSync,
  syncStatus: getSyncStatus,
  retrySync: async (recordId: string) => {
    // Force retry by resetting retry count
    const items = outbox.loadOutbox();
    const item = items.find((i) => i.recordId === recordId);
    if (item) {
      item.retryCount = 0;
      outbox.saveOutbox(items);
      performSync();
    }
  },
};
```

---

## UI Components

### components/bookmarks/SyncStatusBadge.tsx

```typescript
"use client";

import { SyncStatus } from "@/hooks/useBookmarks";

interface Props {
  status: SyncStatus;
  error?: string;
  onRetry?: () => void;
}

export function SyncStatusBadge({ status, error, onRetry }: Props) {
  if (status === 'synced') {
    return null;
  }

  const variants = {
    pending: {
      icon: (
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
      ),
      text: 'Syncing...',
      className: 'text-blue-600 bg-blue-50',
    },
    syncing: {
      icon: (
        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      ),
      text: 'Syncing...',
      className: 'text-blue-600 bg-blue-50',
    },
    error: {
      icon: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
      text: 'Sync failed',
      className: 'text-red-600 bg-red-50 cursor-pointer hover:bg-red-100',
      onClick: onRetry,
    },
  };

  const variant = variants[status];

  return (
    <div
      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${variant.className}`}
      onClick={variant.onClick}
      title={error || variant.text}
    >
      {variant.icon}
      <span>{variant.text}</span>
      {status === 'error' && (
        <span className="ml-1 underline">Retry</span>
      )}
    </div>
  );
}
```

### components/bookmarks/BookmarkCard.tsx (modified)

```typescript
import { SyncStatusBadge } from './SyncStatusBadge';

export function BookmarkCard({ bookmark, syncStatus, syncError, onRetrySync }: Props) {
  return (
    <div className="border rounded p-4">
      <div className="flex justify-between items-start">
        {/* ... bookmark content ... */}

        <div className="flex flex-col gap-2">
          {/* ... other actions ... */}

          <SyncStatusBadge
            status={syncStatus}
            error={syncError}
            onRetry={onRetrySync}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Sync Status in List View

```typescript
// In bookmark list component
{bookmarks.map((bookmark) => (
  <BookmarkCard
    key={bookmark.id}
    bookmark={bookmark}
    syncStatus={getSyncStatus(bookmark.id)}
    onRetrySync={() => retrySync(bookmark.id)}
  />
))}
```

---

## Enhanced Outbox Tracking

```typescript
// lib/sync-outbox.ts (enhanced)

// Add timestamp for UI
export interface OutboxItem {
  // ... existing fields ...
  status?: SyncStatus;
  lastError?: string;
}

// Update status when processing
export function updateOutboxStatus(
  itemId: string,
  status: SyncStatus,
  error?: string
): void {
  const outbox = loadOutbox();
  const index = outbox.findIndex((item) => item.id === itemId);

  if (index !== -1) {
    outbox[index].status = status;
    outbox[index].lastError = error;
    saveOutbox(outbox);
  }
}
```

---

## Sync Engine Updates

```typescript
// lib/sync-engine.ts (modified)

// Update item status when processing
for (const item of items) {
  outbox.updateOutboxStatus(item.id, 'syncing');

  try {
    // ... sync logic ...
    outbox.updateOutboxStatus(item.id, 'synced');
  } catch (error) {
    outbox.updateOutboxStatus(item.id, 'error', error.message);
  }
}
```

---

## Testing

**Integration Test:**
- Verify status shows correctly
- Verify error status displays
- Verify retry button works
- Verify status updates on sync

---

## Files

**CREATE:**
- `components/bookmarks/SyncStatusBadge.tsx`

**MODIFY:**
- `hooks/useBookmarks.ts`
- `components/bookmarks/BookmarkCard.tsx`
- `lib/sync-outbox.ts`
- `lib/sync-engine.ts`

---

## Patterns

- Follow existing optimistic UI patterns
- Use clear visual indicators
- Provide easy retry mechanism

---

## Verification Checklist

- [ ] Sync status tracked per record
- [ ] Pending status shows
- [ ] Syncing status shows
- [ ] Error status shows
- [ ] Retry button works
- [ ] Status updates on sync
- [ ] Error messages display
- [ ] Optimistic UI maintained
- [ ] Performance acceptable
- [ ] Integration tests pass

---

## Notes

- Consider adding bulk retry (all failed)
- Consider adding sync progress bar
- Show sync status in list view too
- Consider adding keyboard shortcut for retry
- Limit status update frequency (debounce)
- Test with many pending records
- Consider adding sync sound effects (optional)
- Add sync analytics tracking
