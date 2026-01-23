/**
 * Vault Disable Checksum Utility
 *
 * Provides SHA-256 checksum calculation for encrypted vault data.
 * Used to verify data integrity at each phase of the disable process.
 */

import type { StoredEncryptedRecord } from '@/lib/encrypted-storage';

/**
 * Calculate SHA-256 checksum of all decrypted records
 * @param bookmarks Decrypted bookmarks
 * @param spaces Decrypted spaces
 * @param pinnedViews Decrypted pinned views
 * @returns SHA-256 hex string
 */
export async function calculateDecryptedDataChecksum(
  bookmarks: unknown[],
  spaces: unknown[],
  pinnedViews: unknown[]
): Promise<string> {
  const sortedBookmarks = [...bookmarks].sort((a: unknown, b: unknown) => {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    return String(aObj.id).localeCompare(String(bObj.id));
  });
  const sortedSpaces = [...spaces].sort((a: unknown, b: unknown) => {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    return String(aObj.id).localeCompare(String(bObj.id));
  });
  const sortedPinnedViews = [...pinnedViews].sort((a: unknown, b: unknown) => {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    return String(aObj.id).localeCompare(String(bObj.id));
  });

  const data = JSON.stringify({
    bookmarks: sortedBookmarks,
    spaces: sortedSpaces,
    pinnedViews: sortedPinnedViews,
  });

  return calculateSHA256(data);
}

/**
 * Calculate SHA-256 checksum of encrypted records only
 * @param records Array of encrypted records
 * @returns SHA-256 hex string
 */
export async function calculateEncryptedRecordsChecksum(
  records: StoredEncryptedRecord[]
): Promise<string> {
  const sorted = [...records].sort((a, b) =>
    `${a.recordId}-${a.recordType}`.localeCompare(`${b.recordId}-${b.recordType}`)
  );

  const data = JSON.stringify(sorted);
  return calculateSHA256(data);
}

/**
 * Calculate checksum for plaintext records from server
 * @param records Array of plaintext records with IDs and types
 * @returns SHA-256 hex string
 */
export async function calculatePlaintextChecksum(
  records: { recordId: string; recordType: string; data: Record<string, unknown> }[]
): Promise<string> {
  const sorted = [...records].sort((a, b) =>
    `${a.recordId}-${a.recordType}`.localeCompare(`${b.recordId}-${b.recordType}`)
  );

  const data = JSON.stringify(sorted);
  return calculateSHA256(data);
}

/**
 * Calculate SHA-256 hash of a string
 * Uses SubtleCrypto API available in modern browsers
 * @param data String to hash
 * @returns SHA-256 hex string
 */
async function calculateSHA256(data: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (error) {
    throw new Error(`Failed to calculate checksum: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify two checksums match
 * @param checksum1 First checksum
 * @param checksum2 Second checksum
 * @returns true if checksums match
 */
export function verifyChecksumMatch(checksum1: string, checksum2: string): boolean {
  return checksum1.toLowerCase() === checksum2.toLowerCase();
}

/**
 * Quick checksum for count-based verification
 * Returns a simple hash combining record counts
 */
export async function calculateCountChecksum(
  bookmarkCount: number,
  spaceCount: number,
  pinnedViewCount: number
): Promise<string> {
  const data = JSON.stringify({
    bookmarkCount,
    spaceCount,
    pinnedViewCount,
  });
  return calculateSHA256(data);
}
