export interface EncryptedData {
  iv: Uint8Array;
  ciphertext: Uint8Array;
  tag: Uint8Array;
}

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
      salt: salt as unknown as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function generateVaultKey(): Promise<Uint8Array> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(exported);
}

export async function importVaultKey(keyData: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    keyData as unknown as any,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(
  data: Uint8Array,
  key: CryptoKey
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data as unknown as any
  );

  const encrypted = new Uint8Array(ciphertext);
  const tag = encrypted.slice(-16);
  const actualCiphertext = encrypted.slice(0, -16);

  return { iv, ciphertext: actualCiphertext, tag };
}

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
      { name: 'AES-GCM', iv: encrypted.iv as unknown as any },
      key,
      combined as unknown as any
    )
  );
}

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

export async function unwrapVaultKey(
  wrappedKey: Uint8Array,
  wrappingKey: CryptoKey
): Promise<Uint8Array> {
  const iv = wrappedKey.slice(0, 12);
  const tag = wrappedKey.slice(-16);
  const ciphertext = wrappedKey.slice(12, -16);

  return decryptData({ iv, ciphertext, tag }, wrappingKey);
}

export function arrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array));
}

export function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

import type { VaultKeyEnvelope, KdfParams, RecoveryCodeWrapper } from './types';

export async function createKeyEnvelope(
  passphrase: string,
  vaultKey: Uint8Array,
  generateRecoveries: boolean = true
): Promise<{ envelope: VaultKeyEnvelope; recoveryCodes: string[] }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const wrappingKey = await deriveKeyFromPassphrase(passphrase, salt);
  const wrappedKey = await wrapVaultKey(vaultKey, wrappingKey);

  const kdfParams: KdfParams = {
    algorithm: 'PBKDF2',
    iterations: 100000,
    saltLength: 16,
    keyLength: 256,
  };

  const envelope: VaultKeyEnvelope = {
    wrappedKey: arrayToBase64(wrappedKey),
    salt: arrayToBase64(salt),
    kdfParams,
    version: 1,
  };

  let recoveryCodes: string[] = [];

  if (generateRecoveries) {
    recoveryCodes = await generateRecoveryCodes(8);
    const wrappers: RecoveryCodeWrapper[] = [];

    for (const code of recoveryCodes) {
      const { wrappedKey: recoveryWrapped, salt: recoverySalt } = await wrapVaultKeyWithRecoveryCode(
        vaultKey,
        code
      );
      const codeHash = await hashRecoveryCode(code);

      wrappers.push({
        id: crypto.getRandomValues(new Uint8Array(16)).toString(),
        wrappedKey: recoveryWrapped,
        salt: recoverySalt,
        codeHash,
        usedAt: null,
      });
    }

    envelope.recoveryWrappers = wrappers;
  }

  return { envelope, recoveryCodes };
}

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

// Recovery Code Functions

export function formatRecoveryCode(bytes: Uint8Array): string {
  // Convert 12 random bytes to xxxx-xxxx-xxxx-xxxx format
  // Each x is a character from base32-like alphabet (avoiding ambiguous chars)
  const charset = 'ABCDEFGHIJKMNPQRSTUVWXYZ23456789'; // No 0, 1, L, O to avoid confusion
  let code = '';
  for (const byte of bytes) {
    code += charset[byte % charset.length];
  }
  // Format as xxxx-xxxx-xxxx-xxxx
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`;
}

export function parseRecoveryCode(code: string): string {
  // Remove dashes and uppercase
  return code.replace(/-/g, '').toUpperCase();
}

export async function hashRecoveryCode(code: string): Promise<string> {
  // SHA-256 hash of normalized recovery code
  const normalized = parseRecoveryCode(code);
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(normalized));
  return arrayToBase64(new Uint8Array(hashBuffer));
}

export async function generateRecoveryCodes(count: number = 8): Promise<string[]> {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(12));
    codes.push(formatRecoveryCode(randomBytes));
  }
  return codes;
}

export async function wrapVaultKeyWithRecoveryCode(
  vaultKey: Uint8Array,
  recoveryCode: string
): Promise<{ wrappedKey: string; salt: string }> {
  const normalized = parseRecoveryCode(recoveryCode);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const wrappingKey = await deriveKeyFromPassphrase(normalized, salt);
  const wrappedKey = await wrapVaultKey(vaultKey, wrappingKey);

  return {
    wrappedKey: arrayToBase64(wrappedKey),
    salt: arrayToBase64(salt),
  };
}

export async function unwrapVaultKeyWithRecoveryCode(
  wrappedKey: string,
  salt: string,
  recoveryCode: string
): Promise<Uint8Array> {
  const normalized = parseRecoveryCode(recoveryCode);
  const wrappingKey = await deriveKeyFromPassphrase(normalized, base64ToArray(salt));
  return unwrapVaultKey(base64ToArray(wrappedKey), wrappingKey);
}
