# T-AUTH-02: Create Neon Postgres Connection Layer

**Epic:** Vault Foundations (Auth + DB + API)
**Type:** Backend
**State:** pending
**Dependencies:** T-AUTH-01

---

## Action

Implement serverless-safe database connection pooling

---

## Business Summary

Establish reliable database connectivity that works on Vercel's serverless environment

---

## Logic

1. Install `@neondatabase/serverless` package
2. Create database connection utility in `lib/db.ts`
3. Implement connection pooling for Vercel compatibility
4. Add `DATABASE_URL` environment variable
5. Create database client singleton pattern
6. Add connection error handling
7. Export typed query helpers

---

## Technical Logic

- Use connection pooling to avoid exhaustion on serverless
- Lazy connection initialization (singleton pattern)
- Use `neon` library's `Pool` for connection management
- Export functions: `query()`, `transaction()`, `getConnection()`
- Handle connection errors gracefully
- Support both development and production environments

---

## Testing

**Unit Test:**
- Verify connection establishment
- Verify query execution
- Verify error handling for invalid queries
- Mock database for testing

---

## Files

**CREATE:**
- `lib/db.ts`
- `lib/db/__tests__/db.test.ts`

**MODIFY:**
- `.env.local` (add DATABASE_URL)

---

## Patterns

- Follow `lib/storage.ts` singleton pattern
- Use TypeScript for type safety
- Export clean, typed interfaces

---

## Database Connection Code Pattern

```typescript
// lib/db.ts
import { neon, neonConfig } from '@neondatabase/serverless';

neonConfig.fetchConnectionCache = true;

let pool: ReturnType<typeof neon> | null = null;

export function getPool() {
  if (!pool) {
    pool = neon(process.env.DATABASE_URL!);
  }
  return pool;
}

export async function query<T>(sql: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const result = await pool(sql, params);
  return result as T[];
}
```

---

## Environment Variables Required

```bash
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

---

## Verification Checklist

- [ ] Package installed: `@neondatabase/serverless`
- [ ] `DATABASE_URL` configured in `.env.local`
- [ ] `lib/db.ts` created with singleton pattern
- [ ] Connection pooling implemented
- [ ] Query helper functions exported
- [ ] Error handling implemented
- [ ] Unit tests pass
- [ ] Connection works from Next.js route handler

---

## Notes

- Neon provides free tier for development
- Use `sslmode=require` for secure connections
- Consider adding connection timeout configuration
- Test connection locally and on Vercel
- Monitor connection pool usage in production
