# T-SYNC-06: Implement Conflict Resolution (Keep Both)

**Epic:** Vault Sync Engine + Encrypted Backup
**Type:** Frontend
**State:** pending
**Dependencies:** T-SYNC-05

---

## Action

Create conflict handling UI and logic

---

## Business Summary

Preserve both versions when conflicts occur

---

## Logic

1. Detect conflict responses from push endpoint
2. Create duplicate record with "Conflict copy" suffix
3. Add conflict metadata to original record
4. Show conflict indicator in UI
5. Allow manual conflict resolution
6. Store `conflictWith` field on both records
7. Provide "Resolve" option in edit menu

---

## Technical Logic

**On 409 Conflict Response:**
1. Create new recordId (UUID)
2. Copy client's data to new record
3. Add "Conflict copy" suffix to title
4. Store `conflictWith` field linking both records
5. Show visual indicator in bookmark list

**Conflict Metadata:**
```typescript
{
  conflictWith: string;  // ID of conflicting record
  conflictReason: 'version_mismatch' | 'concurrent_edit';
  conflictAt: string;    // ISO timestamp
  resolved: boolean;
}
```

---

## Implementation

```typescript
// lib/sync-conflict.ts
import { v4 as uuidv4 } from 'uuid';
import * as crypto from './crypto';
import { loadAndDecryptBookmark, saveEncryptedRecord } from './encrypted-storage';

export interface ConflictMetadata {
  conflictWith: string;
  conflictReason: 'version_mismatch' | 'concurrent_edit';
  conflictAt: string;
  resolved: boolean;
}

export interface BookmarkWithConflict extends Bookmark {
  _conflict?: ConflictMetadata;
}

/**
 * Handle conflict by creating duplicate record
 */
export async function handleConflict(
  conflictResponse: {
    recordId: string;
    baseVersion: number;
    currentVersion: number;
    currentCiphertext: string;
  },
  clientBookmark: Bookmark,
  vaultKey: Uint8Array
): Promise<void> {
  // Create "Conflict copy" record
  const conflictRecord: Bookmark = {
    ...clientBookmark,
    id: uuidv4(),
    title: `${clientBookmark.title} (Conflict copy)`,
    createdAt: new Date().toISOString(),
  };

  // Add conflict metadata
  const conflictMetadata: ConflictMetadata = {
    conflictWith: conflictResponse.recordId,
    conflictReason: 'version_mismatch',
    conflictAt: new Date().toISOString(),
    resolved: false,
  };

  // Save both records with conflict metadata
  const encryptionKey = await crypto.importVaultKey(vaultKey);

  // Encrypt and save conflict copy
  await saveEncryptedRecord(
    {
      ...conflictRecord,
      _conflict: conflictMetadata,
    } as any,
    vaultKey
  );

  // Update original record with conflict metadata
  const originalRecord = await loadAndDecryptBookmark(
    conflictResponse.recordId,
    vaultKey
  );

  if (originalRecord) {
    await saveEncryptedRecord(
      {
        ...originalRecord,
        _conflict: {
          ...conflictMetadata,
          conflictWith: conflictRecord.id,
        },
      } as any,
      vaultKey
    );
  }
}

/**
 * Get conflicting record pair
 */
export async function getConflictPair(
  recordId: string,
  vaultKey: Uint8Array
): Promise<{
  record: BookmarkWithConflict;
  conflict: BookmarkWithConflict | null;
}> {
  const record = await loadAndDecryptBookmark(recordId, vaultKey);

  if (!record || !(record as any)._conflict) {
    return { record: record as BookmarkWithConflict, conflict: null };
  }

  const metadata = (record as any)._conflict as ConflictMetadata;
  const conflict = await loadAndDecryptBookmark(metadata.conflictWith, vaultKey);

  return {
    record: record as BookmarkWithConflict,
    conflict: conflict as BookmarkWithConflict | null,
  };
}

/**
 * Resolve conflict by keeping one record
 */
export async function resolveConflict(
  keepRecordId: string,
  deleteRecordId: string,
  vaultKey: Uint8Array
): Promise<void> {
  // Load both records
  const keepRecord = await loadAndDecryptBookmark(keepRecordId, vaultKey);
  const deleteRecord = await loadAndDecryptBookmark(deleteRecordId, vaultKey);

  if (!keepRecord || !deleteRecord) {
    throw new Error('One or both records not found');
  }

  // Remove conflict metadata from kept record
  const { _conflict, ...recordData } = keepRecord as any;
  await saveEncryptedRecord(recordData, vaultKey);

  // Mark deleted record as deleted
  await saveEncryptedRecord(
    {
      ...deleteRecord,
      deleted: true,
    } as any,
    vaultKey
  );
}

/**
 * Check if bookmark has conflict
 */
export function hasConflict(bookmark: Bookmark): boolean {
  return !!(bookmark as any)._conflict && !(bookmark as any)._conflict.resolved;
}

/**
 * Get conflict badge text
 */
export function getConflictBadge(bookmark: Bookmark): string | null {
  const metadata = (bookmark as any)._conflict as ConflictMetadata | undefined;

  if (!metadata || metadata.resolved) {
    return null;
  }

  const timeAgo = getTimeAgo(new Date(metadata.conflictAt));
  return `Conflict • ${timeAgo}`;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
```

---

## UI Components

### components/bookmarks/ConflictBadge.tsx

```typescript
"use client";

import { hasConflict, getConflictBadge } from "@/lib/sync-conflict";
import { Bookmark } from "@/lib/types";

interface Props {
  bookmark: Bookmark;
}

export function ConflictBadge({ bookmark }: Props) {
  if (!hasConflict(bookmark)) {
    return null;
  }

  const badge = getConflictBadge(bookmark);

  return (
    <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span>{badge}</span>
    </div>
  );
}
```

### components/bookmarks/ConflictResolver.tsx

```typescript
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { Button } from "@/components/ui";
import { getConflictPair, resolveConflict } from "@/lib/sync-conflict";
import { Bookmark } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookmarkId: string;
  vaultKey: Uint8Array;
  onResolved: () => void;
}

export function ConflictResolver({
  isOpen,
  onClose,
  bookmarkId,
  vaultKey,
  onResolved,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pair, setPair] = useState<{
    record: Bookmark;
    conflict: Bookmark | null;
  } | null>(null);

  const handleResolve = async () => {
    if (!selected || !pair) return;

    setLoading(true);

    try {
      const keepId = selected === 'original' ? pair.record.id : pair.conflict!.id;
      const deleteId = selected === 'original' ? pair.conflict!.id : pair.record.id;

      await resolveConflict(keepId, deleteId, vaultKey);
      onResolved();
      onClose();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resolve Conflict">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Both versions of this bookmark were edited simultaneously. Choose which
          version to keep.
        </p>

        <div className="space-y-3">
          <label
            className={`
              block p-4 border rounded cursor-pointer
              ${selected === 'original' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
            `}
          >
            <input
              type="radio"
              name="conflict"
              checked={selected === 'original'}
              onChange={() => setSelected('original')}
              className="mr-3"
            />
            <div>
              <p className="font-medium">Your version</p>
              <p className="text-sm text-gray-600">
                {pair?.record.title} - {pair?.record.url}
              </p>
            </div>
          </label>

          {pair?.conflict && (
            <label
              className={`
                block p-4 border rounded cursor-pointer
                ${selected === 'conflict' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
              `}
            >
              <input
                type="radio"
                name="conflict"
                checked={selected === 'conflict'}
                onChange={() => setSelected('conflict')}
                className="mr-3"
              />
              <div>
                <p className="font-medium">Server version</p>
                <p className="text-sm text-gray-600">
                  {pair.conflict.title} - {pair.conflict.url}
                </p>
              </div>
            </label>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleResolve}
            disabled={!selected || loading}
            className="flex-1"
          >
            {loading ? 'Resolving...' : 'Keep Selected Version'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## Integration

```typescript
// In BookmarkCard component
import { ConflictBadge } from './ConflictBadge';

export function BookmarkCard({ bookmark }: Props) {
  return (
    <div className="border rounded p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3>{bookmark.title}</h3>
          <p>{bookmark.url}</p>
        </div>
        <ConflictBadge bookmark={bookmark} />
      </div>
    </div>
  );
}
```

---

## Testing

**Integration Test:**
- Verify conflict creates duplicate
- Verify conflict badge shows
- Verify resolver dialog works
- Verify resolution updates records

---

## Files

**CREATE:**
- `lib/sync-conflict.ts`
- `components/bookmarks/ConflictBadge.tsx`
- `components/bookmarks/ConflictResolver.tsx`

**MODIFY:**
- `components/bookmarks/BookmarkCard.tsx` (add badge)
- `lib/sync-engine.ts` (call handleConflict)

---

## Patterns

- Follow existing bookmark UI patterns
- Use clear visual indicators
- Provide easy resolution flow

---

## Verification Checklist

- [ ] Conflict handler creates duplicate
- [ ] Conflict metadata stored
- [ ] Conflict badge displays
- [ ] Resolver dialog works
- [ ] Resolution updates both records
- [ ] Badge removed after resolution
- [ ] Integrated with sync engine
- [ ] Unit tests pass
- [ ] UI shows conflicts clearly

---

## Notes

- Consider adding "keep both" option
- Consider adding "merge" option (manual edit)
- Show conflict count in settings
- Add conflict to activity log
- Consider auto-resolve with "keep newer"
- Test with multiple simultaneous conflicts
- Add conflict sound notification (optional)
