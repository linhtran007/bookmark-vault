# T-SYNC-02: Implement Conflict Detection on Server

**Epic:** Vault Sync Engine + Encrypted Backup
**Type:** Backend
**State:** pending
**Dependencies:** T-SYNC-01

---

## Action

Add robust version comparison and conflict response

---

## Business Summary

Prevent silent data loss during concurrent edits

---

## Logic

1. Enhance push endpoint with version validation
2. Return detailed conflict response with current state
3. Add conflict metadata (conflicting_record_id, current_version)
4. Log conflicts for monitoring
5. Compare baseVersion with currentVersion in database
6. Return 409 Conflict on mismatch

---

## Technical Logic

**Version Comparison:**
- Client sends `baseVersion` (version they last saw)
- Server compares with `currentVersion` (version in database)
- If match: update and increment version
- If mismatch: return 409 with current state

**Conflict Response:**
```json
{
  "success": false,
  "conflicts": [
    {
      "recordId": "bookmark-123",
      "baseVersion": 3,
      "currentVersion": 5,
      "currentCiphertext": "base64...",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Implementation

```typescript
// app/api/sync/push/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { query } from '@/lib/db';

interface PushOperation {
  recordId: string;
  baseVersion: number | null;
  ciphertext: string;
  deleted: boolean;
}

export async function POST(req: NextRequest) {
  const userId = auth().userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const operations: PushOperation[] = body.operations || [];

  if (!Array.isArray(operations)) {
    return NextResponse.json(
      { error: 'Invalid operations format' },
      { status: 400 }
    );
  }

  const results: Array<{ recordId: string; version: number }> = [];
  const conflicts: Array<{
    recordId: string;
    baseVersion: number;
    currentVersion: number;
    currentCiphertext: string;
    updatedAt: string;
  }> = [];

  for (const op of operations) {
    try {
      // Check if record exists
      const existing = await query(
        'SELECT id, version, ciphertext, updated_at FROM records WHERE record_id = $1 AND user_id = $2',
        [op.recordId, userId]
      );

      if (existing.length === 0) {
        // New record (baseVersion should be null)
        if (op.baseVersion !== null) {
          conflicts.push({
            recordId: op.recordId,
            baseVersion: op.baseVersion,
            currentVersion: 0,
            currentCiphertext: '',
            updatedAt: new Date().toISOString(),
          });
          continue;
        }

        // Insert new record
        const inserted = await query(
          `INSERT INTO records (user_id, record_id, ciphertext, version, deleted)
           VALUES ($1, $2, $3, 1, $4)
           RETURNING id, version`,
          [userId, op.recordId, Buffer.from(op.ciphertext, 'base64'), op.deleted]
        );

        results.push({
          recordId: op.recordId,
          version: inserted[0].version,
        });
      } else {
        const record = existing[0];

        // Version check for conflict
        if (record.version !== op.baseVersion) {
          conflicts.push({
            recordId: op.recordId,
            baseVersion: op.baseVersion!,
            currentVersion: record.version,
            currentCiphertext: record.ciphertext.toString('base64'),
            updatedAt: record.updated_at,
          });
          continue;
        }

        // Update record (version matches)
        const updated = await query(
          `UPDATE records
           SET ciphertext = $1, version = version + 1, deleted = $2, updated_at = NOW()
           WHERE id = $3
           RETURNING version`,
          [Buffer.from(op.ciphertext, 'base64'), op.deleted, record.id]
        );

        results.push({
          recordId: op.recordId,
          version: updated[0].version,
        });
      }
    } catch (error) {
      console.error(`Error processing record ${op.recordId}:`, error);
      return NextResponse.json(
        { error: 'Failed to process operations' },
        { status: 500 }
      );
    }
  }

  // If there were conflicts, return them
  if (conflicts.length > 0) {
    // Log conflicts for monitoring
    console.log(`Sync conflicts for user ${userId}:`, conflicts.length);

    return NextResponse.json(
      {
        success: false,
        conflicts,
        results, // Include successful results
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    results,
  });
}
```

---

## Testing

**Unit Test:**
- Verify version checking
- Verify conflict detection
- Verify 409 status code
- Verify conflict response includes current state

```typescript
import { describe, it, expect } from 'vitest';

describe('Conflict Detection', () => {
  it('detects version mismatch', async () => {
    const operations = [{
      recordId: 'bookmark-123',
      baseVersion: 3,  // Client has version 3
      ciphertext: 'encrypted_data',
      deleted: false,
    }];

    // Database has version 5
    // Should return conflict
  });

  it('updates when version matches', async () => {
    const operations = [{
      recordId: 'bookmark-123',
      baseVersion: 5,  // Client has version 5
      ciphertext: 'encrypted_data',
      deleted: false,
    }];

    // Database has version 5
    // Should update to version 6
  });
});
```

---

## Files

**MODIFY:**
- `app/api/sync/push/route.ts`
- `lib/types.ts` (add conflict types)
- `lib/validation.ts` (add conflict schemas)

---

## Patterns

- Follow existing error response patterns
- Return detailed conflict information
- Log conflicts for monitoring

---

## Conflict Response Format

```typescript
interface ConflictResponse {
  success: false;
  conflicts: Array<{
    recordId: string;
    baseVersion: number;      // Version client had
    currentVersion: number;    // Version server has
    currentCiphertext: string; // Server's encrypted data
    updatedAt: string;         // When server version was created
  }>;
  results?: Array<{            // Successfully processed
    recordId: string;
    version: number;
  }>;
}
```

---

## Verification Checklist

- [ ] Version checking implemented
- [ ] Conflict detection works
- [ ] 409 status code returned
- [ ] Conflict response includes current state
- [ ] Successful results included in conflict response
- [ ] New records handled correctly (baseVersion = null)
- [ ] Conflicts logged for monitoring
- [ ] Unit tests pass
- [ ] Error handling works

---

## Notes

- Client should create "Conflict copy" on 409
- Include both client and server versions
- Server's ciphertext is encrypted, can't be read by server
- Consider adding conflict reason enum
- Consider rate limiting sync endpoint
- Monitor conflict rate in production
- Test with multiple concurrent clients
- Consider adding conflict resolution API
