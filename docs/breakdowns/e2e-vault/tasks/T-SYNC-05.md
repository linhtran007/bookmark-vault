# T-SYNC-05: Create Sync Engine Client

**Epic:** Vault Sync Engine + Encrypted Backup
**Type:** Frontend
**State:** pending
**Dependencies:** T-SYNC-04

---

## Action

Implement automatic sync orchestration

---

## Business Summary

Keep devices in sync transparently

---

## Logic

1. Create sync engine with push/pull coordination
2. Trigger sync on unlock, periodically, and on reconnect
3. Merge remote changes with local state
4. Handle sync errors gracefully
5. Show sync status to user
6. Process outbox queue
7. Resolve conflicts by keeping both

---

## Technical Logic

**Sync Cycle:**
1. Push outbox → upload local changes
2. Pull remote → download remote changes
3. Merge → combine local and remote
4. Resolve conflicts → create duplicates
5. Update UI → show new data

**Triggers:**
- On unlock (immediate)
- Periodic (every 5 minutes)
- On reconnect (online event)
- Manual (sync button)

**Merge Strategy:**
- Same recordId: keep higher version
- Conflicts: create "Conflict copy" record

---

## Implementation

```typescript
// lib/sync-engine.ts
import * as outbox from './sync-outbox';
import * as crypto from './crypto';
import { loadAndDecryptAllBookmarks, saveEncryptedRecord } from './encrypted-storage';

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

export interface SyncStatus {
  syncing: boolean;
  lastSync: Date | null;
  error: string | null;
}

let syncStatus: SyncStatus = {
  syncing: false,
  lastSync: null,
  error: null,
};

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

/**
 * Perform full sync cycle
 */
export async function performSync(vaultKey: Uint8Array): Promise<SyncResult> {
  if (syncStatus.syncing) {
    throw new Error('Sync already in progress');
  }

  syncStatus.syncing = true;
  syncStatus.error = null;

  const result: SyncResult = {
    pushed: 0,
    pulled: 0,
    conflicts: 0,
    errors: [],
  };

  try {
    // Step 1: Push outbox
    const pushResult = await pushOutbox(vaultKey);
    result.pushed = pushResult.pushed;
    result.conflicts += pushResult.conflicts;
    result.errors.push(...pushResult.errors);

    // Step 2: Pull remote changes
    const pullResult = await pullRemote(vaultKey);
    result.pulled = pullResult.pulled;
    result.conflicts += pullResult.conflicts;
    result.errors.push(...pullResult.errors);

    // Step 3: Update last sync time
    syncStatus.lastSync = new Date();

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    syncStatus.error = errorMessage;
    result.errors.push(errorMessage);
    throw error;
  } finally {
    syncStatus.syncing = false;
  }
}

/**
 * Push outbox to server
 */
async function pushOutbox(vaultKey: Uint8Array): Promise<{
  pushed: number;
  conflicts: number;
  errors: string[];
}> {
  const items = outbox.getRetryableItems();

  if (items.length === 0) {
    return { pushed: 0, conflicts: 0, errors: [] };
  }

  try {
    const operations = items.map((item) => ({
      recordId: item.recordId,
      baseVersion: null, // TODO: Track version
      ciphertext: item.payload.ciphertext,
      deleted: item.payload.deleted || false,
    }));

    const response = await fetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations }),
    });

    if (!response.ok) {
      throw new Error(`Push failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      // Handle conflicts
      for (const conflict of data.conflicts) {
        await handleConflict(conflict, vaultKey);
        outbox.removeFromOutbox(
          items.find((i) => i.recordId === conflict.recordId)!.id
        );
      }

      return {
        pushed: data.results?.length || 0,
        conflicts: data.conflicts.length,
        errors: [],
      };
    }

    // Remove successful items from outbox
    for (const result of data.results) {
      const item = items.find((i) => i.recordId === result.recordId);
      if (item) {
        outbox.removeFromOutbox(item.id);
      }
    }

    return {
      pushed: data.results.length,
      conflicts: 0,
      errors: [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Push failed';

    // Mark items as failed
    for (const item of items) {
      outbox.updateOutboxItem(item.id, false);
    }

    return {
      pushed: 0,
      conflicts: 0,
      errors: [errorMessage],
    };
  }
}

/**
 * Pull remote changes
 */
async function pullRemote(vaultKey: Uint8Array): Promise<{
  pulled: number;
  conflicts: number;
  errors: string[];
}> {
  try {
    const lastSync = syncStatus.lastSync
      ? syncStatus.lastSync.toISOString()
      : undefined;

    const response = await fetch(
      `/api/sync/pull?cursor=${lastSync || ''}&limit=1000`
    );

    if (!response.ok) {
      throw new Error(`Pull failed: ${response.status}`);
    }

    const data = await response.json();

    // Merge remote records
    let merged = 0;
    for (const record of data.records) {
      const mergedCount = await mergeRemoteRecord(record, vaultKey);
      merged += mergedCount;
    }

    return {
      pulled: data.records.length,
      conflicts: 0,
      errors: [],
    };
  } catch (error) {
    return {
      pulled: 0,
      conflicts: 0,
      errors: [error instanceof Error ? error.message : 'Pull failed'],
    };
  }
}

/**
 * Merge a remote record with local state
 */
async function mergeRemoteRecord(
  remoteRecord: any,
  vaultKey: Uint8Array
): Promise<number> {
  // Check if local record exists
  const localRecords = await loadAndDecryptAllBookmarks(vaultKey);
  const localRecord = localRecords.find((b) => b.id === remoteRecord.recordId);

  if (!localRecord) {
    // New record from server - decrypt and save
    const encryptionKey = await crypto.importVaultKey(vaultKey);
    const ciphertext = crypto.base64ToArray(remoteRecord.ciphertext);
    // TODO: Need IV and tag from record
    // For now, assume record includes them
    await saveEncryptedRecord(remoteRecord, vaultKey);
    return 1;
  }

  // Record exists locally - version comparison
  // TODO: Implement version tracking
  // For now, just keep the remote version
  return 0;
}

/**
 * Handle conflict by creating duplicate
 */
async function handleConflict(
  conflict: any,
  vaultKey: Uint8Array
): Promise<void> {
  // Create "Conflict copy" record
  const encryptionKey = await crypto.importVaultKey(vaultKey);
  const serverCiphertext = crypto.base64ToArray(conflict.currentCiphertext);

  // Decrypt server version
  // const serverData = await crypto.decryptData(...);

  // Create new record with "Conflict copy" suffix
  // TODO: Implement full conflict handling
  console.log('Conflict detected for:', conflict.recordId);
}
```

---

## Hook

```typescript
// hooks/useSyncEngine.ts
"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import * as syncEngine from '@/lib/sync-engine';

export function useSyncEngine() {
  const { isUnlocked, vaultKey } = useVaultStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncInProgress = useRef(false);

  const performSync = useCallback(async () => {
    if (!isUnlocked || !vaultKey || syncInProgress.current) {
      return;
    }

    syncInProgress.current = true;

    try {
      const result = await syncEngine.performSync(vaultKey);
      console.log('Sync result:', result);
      // TODO: Update UI with result
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      syncInProgress.current = false;
    }
  }, [isUnlocked, vaultKey]);

  // Sync on unlock
  useEffect(() => {
    if (isUnlocked && vaultKey) {
      performSync();
    }
  }, [isUnlocked, vaultKey, performSync]);

  // Periodic sync (every 5 minutes)
  useEffect(() => {
    if (!isUnlocked) return;

    intervalRef.current = setInterval(() => {
      performSync();
    }, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isUnlocked, performSync]);

  // Sync on reconnect
  useEffect(() => {
    const handleOnline = () => {
      performSync();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [performSync]);

  return {
    performSync,
    syncStatus: syncEngine.getSyncStatus(),
  };
}
```

---

## Testing

**Integration Test:**
- Verify sync cycle completes
- Verify outbox is pushed
- Verify remote changes are pulled
- Verify conflicts are handled

```typescript
import { describe, it, expect } from 'vitest';
import { performSync } from '@/lib/sync-engine';

describe('Sync Engine', () => {
  it('performs full sync cycle', async () => {
    const vaultKey = new Uint8Array(32);
    const result = await performSync(vaultKey);

    expect(result).toHaveProperty('pushed');
    expect(result).toHaveProperty('pulled');
    expect(result).toHaveProperty('conflicts');
  });
});
```

---

## Files

**CREATE:**
- `lib/sync-engine.ts`
- `hooks/useSyncEngine.ts`
- `lib/sync-engine/__tests__/sync.test.ts`

**MODIFY:**
- `app/layout.tsx` (provide sync context)

---

## Patterns

- Follow `hooks/useBookmarks.ts` state management
- Use ref for interval cleanup
- Handle sync errors gracefully

---

## Verification Checklist

- [ ] Sync engine created
- [ ] Push outbox works
- [ ] Pull remote works
- [ ] Merge logic works
- [ ] Conflict handling works
- [ ] Sync on unlock works
- [ ] Periodic sync works
- [ ] Reconnect sync works
- [ ] Sync status tracked
- [ ] Errors handled gracefully
- [ ] Hook created

---

## Notes

- Consider adding sync progress indicator
- Consider adding manual sync button
- Show last sync time in UI
- Handle large datasets with batching
- Consider adding sync queue prioritization
- Monitor sync performance
- Add sync analytics tracking
- Test with flaky network conditions
