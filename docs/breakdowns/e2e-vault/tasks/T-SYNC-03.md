# T-SYNC-03: Add Encrypted Import/Export Endpoints

**Epic:** Vault Sync Engine + Encrypted Backup
**Type:** Backend
**State:** pending
**Dependencies:** T-SYNC-02

---

## Action

Create API endpoints for encrypted backup files

---

## Business Summary

Enable users to create and restore encrypted backups

---

## Logic

### GET /api/vault/export
1. Check Clerk authentication
2. Fetch all user's encrypted records
3. Include vault envelope
4. Stream response as downloadable file
5. Add rate limiting for large exports

### POST /api/vault/import
1. Check Clerk authentication
2. Validate backup format
3. Support merge vs replace modes
4. Insert/update records
5. Return success with record count

---

## Technical Logic

**Export Format:**
```json
{
  "version": 1,
  "exportedAt": "2024-01-15T10:30:00Z",
  "vaultEnvelope": {
    "wrappedKey": "base64...",
    "salt": "base64...",
    "kdfParams": {...}
  },
  "records": [
    {
      "recordId": "uuid",
      "ciphertext": "base64...",
      "iv": "base64...",
      "tag": "base64...",
      "version": 1,
      "deleted": false,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**Import Modes:**
- `merge`: Add new records, update existing by recordId
- `replace`: Delete all existing records, import all

---

## Implementation

```typescript
// app/api/vault/export/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { query } from '@/lib/db';

export async function GET() {
  const userId = auth().userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch vault envelope
    const vaults = await query(
      'SELECT wrapped_key, salt, kdf_params FROM vaults WHERE user_id = $1',
      [userId]
    );

    if (vaults.length === 0) {
      return NextResponse.json(
        { error: 'No vault found' },
        { status: 404 }
      );
    }

    const vault = vaults[0];

    // Fetch all records
    const records = await query(
      'SELECT record_id, ciphertext, version, deleted, created_at, updated_at FROM records WHERE user_id = $1',
      [userId]
    );

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      vaultEnvelope: {
        wrappedKey: vault.wrapped_key.toString('base64'),
        salt: vault.salt.toString('base64'),
        kdfParams: vault.kdf_params,
      },
      records: records.map((r: any) => ({
        recordId: r.record_id,
        ciphertext: r.ciphertext.toString('base64'),
        version: r.version,
        deleted: r.deleted,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };

    // Create downloadable file
    const filename = `vault-backup-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export vault' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/vault/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { query } from '@/lib/db';
import { z } from 'zod';

const ImportSchema = z.object({
  version: z.number(),
  vaultEnvelope: z.object({
    wrappedKey: z.string().base64(),
    salt: z.string().base64(),
    kdfParams: z.object({
      algorithm: z.literal('PBKDF2'),
      iterations: z.number(),
      saltLength: z.number(),
      keyLength: z.number(),
    }),
  }),
  records: z.array(z.object({
    recordId: z.string().uuid(),
    ciphertext: z.string().base64(),
    version: z.number(),
    deleted: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
});

export async function POST(req: NextRequest) {
  const userId = auth().userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = ImportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid backup format' },
        { status: 400 }
      );
    }

    const backup = parsed.data;
    const mode = req.nextUrl.searchParams.get('mode') || 'merge';

    // Check if user already has a vault
    const existingVault = await query(
      'SELECT id FROM vaults WHERE user_id = $1',
      [userId]
    );

    if (existingVault.length > 0 && mode === 'replace') {
      // Delete existing vault and records
      await query('DELETE FROM records WHERE user_id = $1', [userId]);
      await query('DELETE FROM vaults WHERE user_id = $1', [userId]);
    }

    // Create or update vault
    if (existingVault.length === 0) {
      await query(
        `INSERT INTO vaults (user_id, wrapped_key, salt, kdf_params)
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          Buffer.from(backup.vaultEnvelope.wrappedKey, 'base64'),
          Buffer.from(backup.vaultEnvelope.salt, 'base64'),
          JSON.stringify(backup.vaultEnvelope.kdfParams),
        ]
      );
    }

    // Import records
    let imported = 0;
    let updated = 0;

    for (const record of backup.records) {
      const existing = await query(
        'SELECT id FROM records WHERE record_id = $1 AND user_id = $2',
        [record.recordId, userId]
      );

      if (existing.length === 0) {
        // Insert new record
        await query(
          `INSERT INTO records (user_id, record_id, ciphertext, version, deleted, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId,
            record.recordId,
            Buffer.from(record.ciphertext, 'base64'),
            record.version,
            record.deleted,
            record.createdAt,
            record.updatedAt,
          ]
        );
        imported++;
      } else if (mode === 'merge') {
        // Update existing record
        await query(
          `UPDATE records
           SET ciphertext = $1, version = $2, deleted = $3, updated_at = $4
           WHERE id = $5`,
          [
            Buffer.from(record.ciphertext, 'base64'),
            record.version,
            record.deleted,
            record.updatedAt,
            existing[0].id,
          ]
        );
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      updated,
      total: backup.records.length,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import vault' },
      { status: 500 }
    );
  }
}
```

---

## Testing

**Integration Test:**
- Verify export creates valid backup
- Verify import restores data correctly
- Verify merge mode works
- Verify replace mode works

```typescript
import { describe, it, expect } from 'vitest';

describe('Vault Import/Export', () => {
  it('exports and imports correctly', async () => {
    // Export vault
    const exportResponse = await fetch('/api/vault/export');
    const backup = await exportResponse.json();

    // Import to new account
    const importResponse = await fetch('/api/vault/import?mode=merge', {
      method: 'POST',
      body: JSON.stringify(backup),
    });

    const result = await importResponse.json();
    expect(result.success).toBe(true);
  });
});
```

---

## Files

**CREATE:**
- `app/api/vault/export/route.ts`
- `app/api/vault/import/route.ts`

**MODIFY:**
- `lib/validation.ts` (add import schema)

---

## Patterns

- Follow existing import/export patterns
- Use streaming for large files
- Support both merge and replace

---

## Verification Checklist

- [ ] GET /api/vault/export created
- [ ] POST /api/vault/import created
- [ ] Export includes vault envelope
- [ ] Export includes all records
- [ ] Export is downloadable file
- [ ] Import validates format
- [ ] Merge mode works correctly
- [ ] Replace mode works correctly
- [ ] Authentication enforced
- [ ] Rate limiting considered
- [ ] Unit tests pass

---

## Notes

- Export may be large - consider compression
- Add file size limit for imports
- Consider adding progress indicator for large imports
- Import should validate passphrase (client-side)
- Consider adding encrypted file verification
- Add export rate limiting
- Monitor export/import sizes
- Consider incremental export (since date)
