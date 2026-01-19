# T-AUTH-03: Design and Implement Database Schema

**Epic:** Vault Foundations (Auth + DB + API)
**Type:** Backend
**State:** pending
**Dependencies:** T-AUTH-02

---

## Action

Create vault and records tables with migrations

---

## Business Summary

Define data model for encrypted vault storage and per-record version tracking

---

## Logic

1. Design schema for `vaults` table:
   - Key envelope metadata (wrapped_key, salt, kdf_params)
   - Enabled flag and timestamp
   - Device fingerprint
2. Design schema for `records` table:
   - Encrypted ciphertext
   - Version tracking for optimistic concurrency
   - Tombstone (deleted) flag
3. Create migration files
4. Add indexes for user_id and record_id lookups
5. Add foreign key constraints
6. Create TypeScript types matching schema

---

## Technical Logic

### Vaults Table
```sql
CREATE TABLE vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE, -- clerk_user_id
  wrapped_key BYTEA NOT NULL,
  salt BYTEA NOT NULL,
  kdf_params JSONB NOT NULL,
  enabled_at TIMESTAMP DEFAULT NOW(),
  device_fingerprint TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vaults_user_id ON vaults(user_id);
```

### Records Table
```sql
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL, -- client-side bookmark ID
  ciphertext BYTEA NOT NULL,
  version INTEGER DEFAULT 1,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_records_user_id ON records(user_id);
CREATE INDEX idx_records_vault_id ON records(vault_id);
CREATE INDEX idx_records_record_id ON records(record_id);
CREATE INDEX idx_records_updated_at ON records(updated_at);
```

---

## Testing

**Integration Test:**
- Verify schema creation
- Verify foreign key constraints
- Verify indexes are created
- Verify cascading deletes work

---

## Files

**CREATE:**
- `lib/db/migrations/001_create_vaults.sql`
- `lib/db/migrations/002_create_records.sql`
- `lib/db/schema.ts` (TypeScript types)
- `lib/db/migrate.ts` (migration runner)

**MODIFY:**
- `lib/types.ts` (add vault and sync types)

---

## Patterns

- Follow `lib/types.ts` TypeScript patterns
- Use UUID for primary keys
- Use TIMESTAMP for audit trails
- Add indexes for all foreign keys

---

## TypeScript Schema Types

```typescript
// lib/db/schema.ts
export interface Vault {
  id: string;
  user_id: string;
  wrapped_key: Buffer;
  salt: Buffer;
  kdf_params: KdfParams;
  enabled_at: Date;
  device_fingerprint: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Record {
  id: string;
  user_id: string;
  vault_id: string;
  record_id: string;
  ciphertext: Buffer;
  version: number;
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface KdfParams {
  algorithm: 'PBKDF2';
  iterations: number;
  saltLength: number;
}
```

---

## Migration Runner

```typescript
// lib/db/migrate.ts
import { query } from '../db';
import fs from 'fs';
import path from 'path';

export async function runMigrations() {
  const migrationsDir = path.join(process.cwd(), 'lib/db/migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await query(sql);
    console.log(`Ran migration: ${file}`);
  }
}
```

---

## Verification Checklist

- [ ] Migration files created
- [ ] Vaults table schema defined
- [ ] Records table schema defined
- [ ] Indexes created on foreign keys
- [ ] TypeScript types match schema
- [ ] Migration runner implemented
- [ ] Integration tests pass
- [ ] Migrations run successfully on Neon

---

## Notes

- Use BYTEA for encrypted data (binary)
- Use JSONB for flexible KDF parameters
- Add ON DELETE CASCADE for clean vault removal
- Consider adding `updated_at` trigger
- Version field enables optimistic concurrency control
- Deleted flag enables soft deletes for sync
