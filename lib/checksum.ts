import { createHash } from 'crypto';
import type { PlaintextRecord } from './types';

/**
 * Checksum calculation utility for sync optimization.
 *
 * Server-side uses Node.js crypto module.
 * Client-side uses Web Crypto API.
 */

/**
 * Server-side checksum calculation using Node.js crypto.
 * Sorts records by recordId for deterministic hashing.
 *
 * @param records - Array of plaintext records to hash
 * @returns MD5 hash as hex string
 */
export function calculateChecksum(records: PlaintextRecord[]): string {
  if (records.length === 0) {
    // Empty data has a consistent hash
    return createHash('md5').update('[]').digest('hex');
  }

  // Sort by recordId for deterministic ordering
  const sortedRecords = records.slice().sort((a, b) => {
    return a.recordId.localeCompare(b.recordId);
  });

  // Create deterministic string representation
  const dataString = JSON.stringify(sortedRecords, (key, value) => {
    // Sort object keys for consistency
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce<{ [key: string]: unknown }>((sorted, k) => {
          sorted[k] = value[k as keyof typeof value];
          return sorted;
        }, {});
    }
    return value;
  });

  // Compute MD5 hash
  return createHash('md5').update(dataString).digest('hex');
}

/**
 * Client-side checksum calculation using Web Crypto API.
 * Use this in browser contexts where Node.js crypto is unavailable.
 *
 * @param records - Array of plaintext records to hash
 * @returns Promise resolving to SHA-256 hash as hex string
 */
export async function calculateChecksumClient(records: PlaintextRecord[]): Promise<string> {
  if (records.length === 0) {
    const encoder = new TextEncoder();
    const data = encoder.encode('[]');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return bufferToHex(hashBuffer);
  }

  // Sort by recordId for deterministic ordering
  const sortedRecords = records.slice().sort((a, b) => {
    return a.recordId.localeCompare(b.recordId);
  });

  // Create deterministic string representation
  const dataString = JSON.stringify(sortedRecords, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce<{ [key: string]: unknown }>((sorted, k) => {
          sorted[k] = value[k as keyof typeof value];
          return sorted;
        }, {});
    }
    return value;
  });

  // Compute SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Convert ArrayBuffer to hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate combined checksum for all local data types.
 * This creates a single hash from bookmarks, spaces, and pinned views.
 *
 * @param bookmarks - Array of bookmarks
 * @param spaces - Array of spaces
 * @param pinnedViews - Array of pinned views
 * @returns Promise resolving to SHA-256 hash as hex string
 */
export async function calculateCombinedChecksum(
  bookmarks: unknown[],
  spaces: unknown[],
  pinnedViews: unknown[]
): Promise<string> {
  const allRecords = [
    ...bookmarks.map((data, index) => ({
      recordId: `bookmark-${index}`,
      recordType: 'bookmark' as const,
      data,
    })),
    ...spaces.map((data, index) => ({
      recordId: `space-${index}`,
      recordType: 'space' as const,
      data,
    })),
    ...pinnedViews.map((data, index) => ({
      recordId: `pinned-view-${index}`,
      recordType: 'pinned-view' as const,
      data,
    })),
  ];

  return calculateChecksumClient(allRecords as PlaintextRecord[]);
}
