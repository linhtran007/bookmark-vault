# T-AUTH-06: Add API Route Unit Tests

**Epic:** Vault Foundations (Auth + DB + API)
**Type:** Backend
**State:** pending
**Dependencies:** T-AUTH-05

---

## Action

Create comprehensive test suite for all vault/sync endpoints

---

## Business Summary

Ensure API reliability and catch regressions early

---

## Logic

### Test Coverage for Vault API (/api/vault)
1. Authentication enforcement:
   - Unauthenticated request returns 401
   - Authenticated request succeeds
2. GET /api/vault:
   - Returns enabled: false when no vault
   - Returns vault data when exists
3. POST /api/vault/enable:
   - Creates vault successfully
   - Returns 409 for duplicate vault
   - Validates request payload

### Test Coverage for Sync API (/api/sync)
1. Authentication enforcement
2. POST /api/sync/push:
   - New record creation (baseVersion = null)
   - Update with matching version
   - Conflict on version mismatch
   - Batch operations
3. GET /api/sync/pull:
   - Returns records since cursor
   - Pagination with limit
   - Empty cursor returns all records

---

## Technical Logic

- Use Vitest for testing
- Mock `@clerk/nextjs` auth() function
- Mock `lib/db.ts` query function
- Test success and failure paths
- Verify HTTP status codes
- Verify response payloads
- Use beforeEach to reset mocks

---

## Testing Framework Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

---

## Test Files

### app/api/vault/__tests__/vault.test.ts

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { POST } from '../enable/route';

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

describe('GET /api/vault', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs');
    vi.mocked(auth).mockReturnValue({ userId: null });

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns enabled: false when no vault', async () => {
    const { auth } = await import('@clerk/nextjs');
    const { query } = await import('@/lib/db');

    vi.mocked(auth).mockReturnValue({ userId: 'user_123' });
    vi.mocked(query).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(data.enabled).toBe(false);
  });

  it('returns vault data when exists', async () => {
    const { auth } = await import('@clerk/nextjs');
    const { query } = await import('@/lib/db');

    vi.mocked(auth).mockReturnValue({ userId: 'user_123' });
    vi.mocked(query).mockResolvedValue([
      { id: 'vault_1', enabled_at: '2024-01-15' }
    ]);

    const response = await GET();
    const data = await response.json();

    expect(data.enabled).toBe(true);
    expect(data.vault.id).toBe('vault_1');
  });
});

describe('POST /api/vault/enable', () => {
  it('creates vault successfully', async () => {
    const { auth } = await import('@clerk/nextjs');
    const { query } = await import('@/lib/db');

    vi.mocked(auth).mockReturnValue({ userId: 'user_123' });
    vi.mocked(query).mockResolvedValue([{ id: 'vault_1' }]);

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        wrappedKey: 'abc123',
        salt: 'salt123',
        kdfParams: { algorithm: 'PBKDF2', iterations: 100000 },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
  });
});
```

### app/api/sync/__tests__/sync.test.ts

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../push/route';
import { GET } from '../pull/route';

vi.mock('@clerk/nextjs');
vi.mock('@/lib/db');

describe('POST /api/sync/push', () => {
  it('creates new record when baseVersion is null', async () => {
    const { auth } = await import('@clerk/nextjs');
    const { query } = await import('@/lib/db');

    vi.mocked(auth).mockReturnValue({ userId: 'user_123' });
    vi.mocked(query)
      .mockResolvedValueOnce([]) // No existing record
      .mockResolvedValueOnce([{ id: 'rec_1', version: 1 }]); // Insert result

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        operations: [{
          recordId: 'bookmark_1',
          baseVersion: null,
          ciphertext: 'encrypted_data',
          deleted: false,
        }],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.results[0].version).toBe(1);
  });

  it('returns conflict on version mismatch', async () => {
    const { auth } = await import('@clerk/nextjs');
    const { query } = await import('@/lib/db');

    vi.mocked(auth).mockReturnValue({ userId: 'user_123' });
    vi.mocked(query).mockResolvedValue([{ id: 'rec_1', version: 5 }]);

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        operations: [{
          recordId: 'bookmark_1',
          baseVersion: 3, // Client has version 3
          ciphertext: 'encrypted_data',
          deleted: false,
        }],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(409);
  });
});
```

---

## Files

**CREATE:**
- `app/api/vault/__tests__/vault.test.ts`
- `app/api/sync/__tests__/sync.test.ts`
- `vitest.config.ts` (if not exists)

---

## Patterns

- Follow `app/__tests__/page.integration.test.tsx` structure
- Use vi.mocked() for type-safe mocking
- Group tests by endpoint and scenario

---

## Verification Checklist

- [ ] Test file for vault API created
- [ ] Test file for sync API created
- [ ] Authentication tests pass
- [ ] Success path tests pass
- [ ] Error path tests pass
- [ ] Edge cases covered
- [ ] Mocks properly configured
- [ ] All tests pass when run

---

## Notes

- Run tests with: `npm test` or `vitest`
- Use `--watch` mode during development
- Aim for >80% code coverage
- Update tests when API changes
- Mock external dependencies (Clerk, DB)
- Test both success and failure scenarios
