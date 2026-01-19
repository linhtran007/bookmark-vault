# T-CRYPTO-01: Implement WebCrypto Helper Functions

**Epic:** Vault Crypto + Unlock UX
**Type:** Frontend (Client-side only)
**State:** pending
**Dependencies:** None

---

## Action

Create cryptographic utilities for key derivation and encryption

---

## Business Summary

Provide secure, browser-native encryption primitives for vault data

---

## Logic

1. Implement PBKDF2 key derivation from passphrase
2. Implement AES-GCM encryption/decryption
3. Implement vault key generation (32 random bytes)
4. Implement vault key wrapping/unwrapping
5. Add comprehensive error handling
6. Use `window.crypto.subtle` API

---

## Technical Logic

**PBKDF2 Key Derivation:**
- Algorithm: PBKDF2-SHA256
- Iterations: 100,000
- Salt: Random 16 bytes
- Output: 256-bit (32 byte) key

**AES-GCM Encryption:**
- Key length: 256 bits
- IV (nonce): 96 bits (12 bytes)
- Authenticated encryption with tag
- Format: IV + ciphertext + tag

**Vault Key Wrapping:**
- Generate random 32-byte vault key
- Encrypt vault key with PBKDF2-derived key
- Store wrapped key + salt + KDF params

---

## API

```typescript
// Key derivation
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey>;

// Vault key operations
export async function generateVaultKey(): Promise<Uint8Array>;
export async function wrapVaultKey(
  vaultKey: Uint8Array,
  wrappingKey: CryptoKey
): Promise<Uint8Array>;
export async function unwrapVaultKey(
  wrappedKey: Uint8Array,
  wrappingKey: CryptoKey
): Promise<Uint8Array>;

// Encryption/decryption
export async function encryptData(
  data: Uint8Array,
  key: CryptoKey
): Promise<EncryptedData>;
export async function decryptData(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<Uint8Array>;
```

---

## Implementation

```typescript
// lib/crypto.ts
export interface EncryptedData {
  iv: Uint8Array;
  ciphertext: Uint8Array;
  tag: Uint8Array;
}

// PBKDF2 key derivation
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate random vault key
export async function generateVaultKey(): Promise<Uint8Array> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(exported);
}

// Encrypt data
export async function encryptData(
  data: Uint8Array,
  key: CryptoKey
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const encrypted = new Uint8Array(ciphertext);
  const tag = encrypted.slice(-16);
  const actualCiphertext = encrypted.slice(0, -16);

  return { iv, ciphertext: actualCiphertext, tag };
}

// Decrypt data
export async function decryptData(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<Uint8Array> {
  const combined = new Uint8Array(
    encrypted.ciphertext.length + encrypted.tag.length
  );
  combined.set(encrypted.ciphertext);
  combined.set(encrypted.tag, encrypted.ciphertext.length);

  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: encrypted.iv },
      key,
      combined
    )
  );
}

// Wrap vault key
export async function wrapVaultKey(
  vaultKey: Uint8Array,
  wrappingKey: CryptoKey
): Promise<Uint8Array> {
  const encrypted = await encryptData(vaultKey, wrappingKey);
  const combined = new Uint8Array(
    encrypted.iv.length + encrypted.ciphertext.length + encrypted.tag.length
  );
  combined.set(encrypted.iv, 0);
  combined.set(encrypted.ciphertext, encrypted.iv.length);
  combined.set(encrypted.tag, encrypted.iv.length + encrypted.ciphertext.length);
  return combined;
}

// Unwrap vault key
export async function unwrapVaultKey(
  wrappedKey: Uint8Array,
  wrappingKey: CryptoKey
): Promise<Uint8Array> {
  const iv = wrappedKey.slice(0, 12);
  const tag = wrappedKey.slice(-16);
  const ciphertext = wrappedKey.slice(12, -16);

  return decryptData({ iv, ciphertext, tag }, wrappingKey);
}
```

---

## Testing

**Unit Test:**
- Verify round-trip encryption/decryption
- Verify key derivation produces consistent results
- Verify different passphrases produce different keys
- Verify vault key wrap/unwrap

```typescript
import { describe, it, expect } from 'vitest';
import * as crypto from '@/lib/crypto';

describe('Crypto Helpers', () => {
  it('encrypts and decrypts data correctly', async () => {
    const key = await crypto.deriveKeyFromPassphrase(
      'test-password',
      crypto.getRandomValues(new Uint8Array(16))
    );

    const data = new TextEncoder().encode('Hello, World!');
    const encrypted = await crypto.encryptData(data, key);
    const decrypted = await crypto.decryptData(encrypted, key);

    expect(decrypted).toEqual(data);
  });

  it('wraps and unwraps vault key correctly', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const wrappingKey = await crypto.deriveKeyFromPassphrase('password', salt);
    const vaultKey = await crypto.generateVaultKey();

    const wrapped = await crypto.wrapVaultKey(vaultKey, wrappingKey);
    const unwrapped = await crypto.unwrapVaultKey(wrapped, wrappingKey);

    expect(unwrapped).toEqual(vaultKey);
  });
});
```

---

## Files

**CREATE:**
- `lib/crypto.ts`
- `lib/crypto/__tests__/crypto.test.ts`

---

## Patterns

- Follow `lib/validation.ts` typed exports
- Use Uint8Array for binary data
- Export clean, typed interfaces

---

## Verification Checklist

- [ ] PBKDF2 key derivation implemented
- [ ] AES-GCM encryption implemented
- [ ] Vault key generation implemented
- [ ] Vault key wrap/unwrap implemented
- [ ] Error handling for invalid inputs
- [ ] Unit tests pass
- [ ] TypeScript types correct
- [ ] Works in browser environment
- [ ] No dependencies on Node.js APIs

---

## Notes

- WebCrypto API is async - all functions return promises
- Use `crypto.getRandomValues()` for secure random
- IV must never be reused with same key
- 100,000 iterations is minimum for PBKDF2
- Consider making iterations configurable
- Store KDF params with wrapped key
- Handle errors for weak passphrases
