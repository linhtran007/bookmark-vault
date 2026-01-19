# T-AUTH-05: Implement Sync API Route Skeletons

**Epic:** Vault Foundations (Auth + DB + API)
**Type:** Backend
**State:** pending
**Dependencies:** T-AUTH-04

---

## Action

Create protected push/pull endpoints with version checking

---

## Business Summary

Build foundation for bidirectional sync with conflict detection

---

## Logic

### POST /api/sync/push
1. Check Clerk authentication
2. Validate request payload with Zod
3. For each record:
   - Check if exists (query by record_id)
   - Compare baseVersion with currentVersion
   - Update if match, else return conflict
4. Return success or conflict response

### GET /api/sync/pull
1. Check Clerk authentication
2. Parse cursor from query params
3. Query records where updated_at > cursor
4. Return records with next cursor

---

## Technical Logic

**Push Version Checking:**
- Query: `SELECT id, version FROM records WHERE record_id = $1 AND user_id = $2`
- If not found: insert new record (version = 1)
- If found and version matches: update (version = version + 1)
- If found and version mismatch: return 409 Conflict

**Pull Cursor Pagination:**
- Query: `SELECT * FROM records WHERE user_id = $1 AND updated_at > $2 ORDER BY updated_at ASC LIMIT 100`
- Cursor is ISO timestamp string
- Return next cursor (last record's updated_at)

---

## Request/Response Schemas

### POST /api/sync/push Request
```typescript
{
  operations: Array<{
    recordId: string;
    baseVersion: number | null; // null for new records
    ciphertext: string; // base64 encoded
    deleted: boolean;
  }>;
}
```

### POST /api/sync/push Response (Success)
```typescript
{
  success: true;
  results: Array<{
    recordId: string;
    version: number;
  }>;
}
```

### POST /api/sync/push Response (Conflict)
```typescript
{
  success: false;
  conflicts: Array<{
    recordId: string;
    currentVersion: number;
    ciphertext: string;
  }>;
}
```

### GET /api/sync/pull Request
```
GET /api/sync/pull?cursor=2024-01-15T10:30:00Z&limit=100
```

### GET /api/sync/pull Response
```typescript
{
  records: Array<{
    recordId: string;
    ciphertext: string;
    version: number;
    deleted: boolean;
    updated_at: string;
  }>;
  nextCursor: string | null;
}
```

---

## Testing

**Unit Test:**
- Verify version checking logic
- Verify conflict detection on version mismatch
- Verify cursor pagination
- Verify authentication enforcement

---

## Files

**CREATE:**
- `app/api/sync/push/route.ts`
- `app/api/sync/pull/route.ts`
- `app/api/sync/__tests__/sync.test.ts`

**MODIFY:**
- `lib/validation.ts` (add sync schemas)
- `lib/types.ts` (add sync types)

---

## Patterns

- Follow existing API error handling patterns
- Use batch operations for efficiency
- Return consistent error format

---

## Example Implementation

```typescript
// app/api/sync/push/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  const userId = auth().userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { operations } = await req.json();
  const results = [];
  const conflicts = [];

  for (const op of operations) {
    const existing = await query(
      'SELECT id, version FROM records WHERE record_id = $1 AND user_id = $2',
      [op.recordId, userId]
    );

    if (existing.length === 0) {
      // New record
      const inserted = await query(
        `INSERT INTO records (user_id, record_id, ciphertext, version, deleted)
         VALUES ($1, $2, $3, 1, $4)
         RETURNING id, version`,
        [userId, op.recordId, op.ciphertext, op.deleted]
      );
      results.push({ recordId: op.recordId, version: 1 });
    } else if (existing[0].version === op.baseVersion) {
      // Version matches - update
      const updated = await query(
        `UPDATE records
         SET ciphertext = $1, version = version + 1, deleted = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING version`,
        [op.ciphertext, op.deleted, existing[0].id]
      );
      results.push({ recordId: op.recordId, version: updated[0].version });
    } else {
      // Conflict
      conflicts.push({
        recordId: op.recordId,
        currentVersion: existing[0].version,
      });
    }
  }

  if (conflicts.length > 0) {
    return NextResponse.json(
      { success: false, conflicts },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, results });
}
```

---

## Verification Checklist

- [ ] POST /api/sync/push route created
- [ ] GET /api/sync/pull route created
- [ ] Version checking implemented
- [ ] Conflict detection works (409 response)
- [ ] Cursor pagination implemented
- [ ] Zod validation schemas added
- [ ] Unit tests pass
- [ ] Handles batch operations correctly

---

## Notes

- Use transactions for atomic updates if needed
- Limit batch size to prevent timeouts (max 100 operations)
- Cursor format: ISO 8601 timestamp string
- Consider adding rate limiting
- Log conflicts for monitoring
- Version starts at 1 for new records
