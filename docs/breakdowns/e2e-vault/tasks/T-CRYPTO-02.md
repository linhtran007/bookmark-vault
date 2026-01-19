# T-CRYPTO-02: Design Vault Key Envelope Model

**Epic:** Vault Crypto + Unlock UX
**Type:** Frontend (Client-side only)
**State:** pending
**Dependencies:** T-CRYPTO-01

---

## Action

Define data structures for key envelope and encrypted records

---

## Business Summary

Create clear, versioned formats for storing encrypted data

---

## Logic

1. Define TypeScript interfaces for key envelope
2. Define encrypted record payload format
3. Add Zod schemas for validation
4. Document format for future compatibility
5. Use semantic versioning for format changes

---

## Technical Logic

**Key Envelope:**
```typescript
{
  wrappedKey: string;      // base64 encoded wrapped vault key
  salt: string;            // base64 encoded salt for PBKDF2
  kdfParams: KdfParams;    // KDF configuration
  version: 1;              // envelope format version
}
```

**Encrypted Record:**
```typescript
{
  recordId: string;        // client-side bookmark ID
  ciphertext: string;      // base64 encoded encrypted bookmark
  iv: string;              // base64 encoded IV
  tag: string;             // base64 encoded auth tag
  version: number;         // record version for optimistic concurrency
}
```

**KDF Parameters:**
```typescript
{
  algorithm: 'PBKDF2';
  iterations: number;
  saltLength: number;
  keyLength: 256;          // bits
}
```

---

## TypeScript Types

```typescript
// lib/types.ts

export interface VaultKeyEnvelope {
  wrappedKey: string;      // base64
  salt: string;            // base64
  kdfParams: KdfParams;
  version: number;
}

export interface KdfParams {
  algorithm: 'PBKDF2';
  iterations: number;
  saltLength: number;
  keyLength: number;
}

export interface EncryptedRecord {
  recordId: string;
  ciphertext: string;      // base64
  iv: string;              // base64
  tag: string;             // base64
  version: number;
  deleted?: boolean;
}

export interface VaultEnableRequest {
  wrappedKey: string;
  salt: string;
  kdfParams: KdfParams;
}
```

---

## Zod Schemas

```typescript
// lib/validation.ts
import { z } from 'zod';

export const KdfParamsSchema = z.object({
  algorithm: z.literal('PBKDF2'),
  iterations: z.number().int().min(100000),
  saltLength: z.number().int().min(16),
  keyLength: z.literal(256),
});

export const VaultKeyEnvelopeSchema = z.object({
  wrappedKey: z.string().base64(),
  salt: z.string().base64(),
  kdfParams: KdfParamsSchema,
  version: z.number().int().positive(),
});

export const EncryptedRecordSchema = z.object({
  recordId: z.string().uuid(),
  ciphertext: z.string().base64(),
  iv: z.string().base64(),
  tag: z.string().base64(),
  version: z.number().int().positive(),
  deleted: z.boolean().optional().default(false),
});

export const VaultEnableRequestSchema = z.object({
  wrappedKey: z.string().base64(),
  salt: z.string().base64(),
  kdfParams: KdfParamsSchema,
});
```

---

## Helper Functions

```typescript
// lib/crypto.ts

// Convert between Uint8Array and base64 string
export function arrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array));
}

export function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64);
  return new Uint8Array(binary.length).map((_, i) => binary.charCodeAt(i));
}

// Create envelope from components
export async function createKeyEnvelope(
  passphrase: string,
  vaultKey: Uint8Array
): Promise<VaultKeyEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const wrappingKey = await deriveKeyFromPassphrase(passphrase, salt);
  const wrappedKey = await wrapVaultKey(vaultKey, wrappingKey);

  return {
    wrappedKey: arrayToBase64(wrappedKey),
    salt: arrayToBase64(salt),
    kdfParams: {
      algorithm: 'PBKDF2',
      iterations: 100000,
      saltLength: 16,
      keyLength: 256,
    },
    version: 1,
  };
}

// Extract vault key from envelope
export async function unwrapVaultKeyFromEnvelope(
  envelope: VaultKeyEnvelope,
  passphrase: string
): Promise<Uint8Array> {
  const wrappingKey = await deriveKeyFromPassphrase(
    passphrase,
    base64ToArray(envelope.salt)
  );
  return unwrapVaultKey(base64ToArray(envelope.wrappedKey), wrappingKey);
}
```

---

## Storage Format

**localStorage structure:**
```json
{
  "bookmark-vault-envelope": {
    "wrappedKey": "base64...",
    "salt": "base64...",
    "kdfParams": {...},
    "version": 1
  },
  "bookmark-vault-encrypted": [
    {
      "recordId": "uuid",
      "ciphertext": "base64...",
      "iv": "base64...",
      "tag": "base64...",
      "version": 1
    }
  ]
}
```

---

## Testing

**Unit Test:**
- Validate schema enforcement
- Test base64 conversion helpers
- Test envelope creation and unwrapping

```typescript
import { describe, it, expect } from 'vitest';
import { VaultKeyEnvelopeSchema } from '@/lib/validation';

describe('Vault Key Envelope', () => {
  it('validates correct envelope', () => {
    const envelope = {
      wrappedKey: btoa('wrapped'),
      salt: btoa('salt'),
      kdfParams: {
        algorithm: 'PBKDF2' as const,
        iterations: 100000,
        saltLength: 16,
        keyLength: 256,
      },
      version: 1,
    };

    expect(() => VaultKeyEnvelopeSchema.parse(envelope)).not.toThrow();
  });

  it('rejects invalid envelope', () => {
    const invalid = {
      wrappedKey: 'not-base64',
      salt: 'not-base64',
      kdfParams: {},
      version: 1,
    };

    expect(() => VaultKeyEnvelopeSchema.parse(invalid)).toThrow();
  });
});
```

---

## Files

**CREATE:**
- (Types added to existing files)

**MODIFY:**
- `lib/types.ts` (add vault types)
- `lib/validation.ts` (add vault schemas)
- `lib/crypto.ts` (add envelope helpers)

---

## Patterns

- Follow existing `Bookmark` interface pattern
- Use Zod for runtime validation
- Use base64 for binary data in JSON
- Version formats for compatibility

---

## Verification Checklist

- [ ] VaultKeyEnvelope interface defined
- [ ] KdfParams interface defined
- [ ] EncryptedRecord interface defined
- [ ] Zod schemas created
- [ ] Base64 helpers implemented
- [ ] Envelope creation helper implemented
- [ ] Envelope unwrapping helper implemented
- [ ] Unit tests pass
- [ ] Schema validation works

---

## Notes

- Use base64 for binary data in localStorage
- Version field enables format migrations
- Store iterations for future adjustment
- Keep KDF params with envelope for flexibility
- Consider adding `created_at` timestamp
- Document version changes in migration guide
- Future versions may support Argon2id
