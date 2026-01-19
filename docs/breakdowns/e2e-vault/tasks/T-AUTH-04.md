# T-AUTH-04: Implement Vault Configuration API Routes

**Epic:** Vault Foundations (Auth + DB + API)
**Type:** Backend
**State:** pending
**Dependencies:** T-AUTH-03

---

## Action

Create protected API endpoints for vault CRUD operations

---

## Business Summary

Enable users to enable, configure, and query vault status from the client

---

## Logic

### GET /api/vault
1. Check Clerk authentication
2. Get user_id from auth()
3. Query vaults table by user_id
4. Return vault status (enabled/disabled) with envelope metadata

### POST /api/vault/enable
1. Check Clerk authentication
2. Validate request payload with Zod
3. Insert wrapped key, salt, kdf_params into vaults table
4. Return success response
5. Handle duplicate vault errors

---

## Technical Logic

- Use `currentUser()` from Clerk to get user_id
- Query: `SELECT * FROM vaults WHERE user_id = $1`
- Insert: `INSERT INTO vaults (user_id, wrapped_key, salt, kdf_params) VALUES ($1, $2, $3, $4)`
- Return 401 if not authenticated
- Return 409 if vault already exists
- Return proper error responses

---

## Request/Response Schemas

### GET /api/vault Response
```typescript
{
  enabled: boolean;
  vault?: {
    id: string;
    enabled_at: string;
    device_fingerprint: string | null;
  };
}
```

### POST /api/vault/enable Request
```typescript
{
  wrappedKey: string; // base64 encoded
  salt: string; // base64 encoded
  kdfParams: {
    algorithm: 'PBKDF2';
    iterations: number;
    saltLength: number;
  };
}
```

### POST /api/vault/enable Response
```typescript
{
  success: true;
  vaultId: string;
}
```

---

## Testing

**Unit Test:**
- Verify authentication enforcement (401 on unauthenticated)
- Verify vault status returned correctly
- Verify vault enable creates record
- Verify duplicate vault returns 409

---

## Files

**CREATE:**
- `app/api/vault/route.ts` (GET handler)
- `app/api/vault/enable/route.ts` (POST handler)
- `app/api/vault/__tests__/vault.test.ts`

**MODIFY:**
- `lib/validation.ts` (add vault schemas)

---

## Patterns

- Follow `app/api/link-preview/route.ts` structure
- Use consistent error response format
- Validate all inputs with Zod

---

## Example Implementation

```typescript
// app/api/vault/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { query } from '@/lib/db';

export async function GET() {
  const userId = auth().userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query(
    'SELECT id, enabled_at, device_fingerprint FROM vaults WHERE user_id = $1',
    [userId]
  );

  if (result.length === 0) {
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({
    enabled: true,
    vault: result[0],
  });
}
```

```typescript
// app/api/vault/enable/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { query } from '@/lib/db';
import { VaultEnableSchema } from '@/lib/validation';

export async function POST(req: Request) {
  const userId = auth().userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = VaultEnableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { wrappedKey, salt, kdfParams } = parsed.data;

  try {
    const result = await query(
      `INSERT INTO vaults (user_id, wrapped_key, salt, kdf_params)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, wrappedKey, salt, JSON.stringify(kdfParams)]
    );

    return NextResponse.json({
      success: true,
      vaultId: result[0].id,
    });
  } catch (error: any) {
    if (error.code === '23505') { // unique violation
      return NextResponse.json({ error: 'Vault already exists' }, { status: 409 });
    }
    throw error;
  }
}
```

---

## Verification Checklist

- [ ] GET /api/vault route created
- [ ] POST /api/vault/enable route created
- [ ] Clerk authentication implemented
- [ ] Zod validation schemas added
- [ ] Error handling for 401, 409 status codes
- [ ] Unit tests pass
- [ ] Routes work with Clerk auth
- [ ] Database queries execute correctly

---

## Notes

- Use base64 encoding for binary data in JSON
- Wrapped key and salt are sensitive - never log
- Consider rate limiting for enable endpoint
- Add request logging for debugging
- Test with actual Clerk session
