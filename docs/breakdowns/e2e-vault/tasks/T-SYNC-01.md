# T-SYNC-01: Enhance Sync API with Cursor-Based Pagination

**Epic:** Vault Sync Engine + Encrypted Backup
**Type:** Backend
**State:** pending
**Dependencies:** T-AUTH-05 (Epic 1)

---

## Action

Implement efficient cursor-based sync pagination

---

## Business Summary

Enable scalable sync with large datasets and incremental updates

---

## Logic

1. Add cursor parameter to pull endpoint
2. Implement `updated_at` based cursor iteration
3. Return records sorted by timestamp
4. Add limit parameter for batch size control
5. Handle edge cases (empty cursor, last page)
6. Return next cursor in response

---

## Technical Logic

**Query:**
```sql
SELECT * FROM records
WHERE user_id = $1 AND updated_at > $2
ORDER BY updated_at ASC
LIMIT $3
```

**Cursor Format:** ISO 8601 timestamp string

**Response:**
```json
{
  "records": [...],
  "nextCursor": "2024-01-15T10:30:00Z",
  "hasMore": true
}
```

---

## Implementation

```typescript
// app/api/sync/pull/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { query } from '@/lib/db';

interface PullQuery {
  cursor?: string;
  limit?: string;
}

export async function GET(req: NextRequest) {
  const userId = auth().userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

  try {
    let queryText = `
      SELECT record_id, ciphertext, version, deleted, updated_at
      FROM records
      WHERE user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (cursor) {
      queryText += ` AND updated_at > $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    queryText += ` ORDER BY updated_at ASC LIMIT $${paramIndex}`;
    params.push(limit);

    const records = await query(queryText, params);

    // Determine next cursor
    const nextCursor = records.length > 0
      ? records[records.length - 1].updated_at
      : null;

    const hasMore = records.length === limit;

    return NextResponse.json({
      records: records.map((r: any) => ({
        recordId: r.record_id,
        ciphertext: r.ciphertext.toString('base64'),
        version: r.version,
        deleted: r.deleted,
        updatedAt: r.updated_at,
      })),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Sync pull error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch records' },
      { status: 500 }
    );
  }
}
```

---

## Testing

**Unit Test:**
- Verify cursor progression
- Verify empty cursor returns all records
- Verify limit parameter works
- Verify last page returns hasMore: false

```typescript
import { describe, it, expect } from 'vitest';
import { GET } from '../pull/route';

describe('GET /api/sync/pull', () => {
  it('returns records since cursor', async () => {
    // Mock implementation
    const cursor = '2024-01-15T10:00:00Z';
    const request = new Request(
      `http://localhost/api/sync/pull?cursor=${cursor}&limit=50`
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.records).toBeDefined();
    expect(data.nextCursor).toBeDefined();
  });

  it('handles last page correctly', async () => {
    // Verify hasMore is false on last page
  });
});
```

---

## Files

**MODIFY:**
- `app/api/sync/pull/route.ts`
- `lib/validation.ts` (add cursor validation)

---

## Patterns

- Follow existing pagination patterns
- Use ISO timestamps for cursors
- Limit max batch size

---

## Edge Cases

1. **Empty cursor:** Return all records from beginning
2. **Cursor beyond latest record:** Return empty array, hasMore: false
3. **Limit = 0:** Return empty array
4. **Limit > 1000:** Cap at 1000

---

## Verification Checklist

- [ ] Cursor parameter implemented
- [ ] Limit parameter implemented
- [ ] Records sorted by updated_at
- [ ] Next cursor returned correctly
- [ ] hasMore flag accurate
- [ ] Max limit enforced (1000)
- [ ] Empty cursor handled
- [ ] Invalid cursor handled gracefully
- [ ] Unit tests pass

---

## Notes

- Cursor uses server time (updated_at)
- Consider adding record count to response
- Consider adding compression for large payloads
- Monitor query performance with indexes
- Consider adding sync status endpoint
- Test with 0, 100, 10000 records
