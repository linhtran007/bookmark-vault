import type { RecordType } from './types';
import { loadAllEncryptedRecords, type StoredEncryptedRecord } from './encrypted-storage';

interface E2eChecksumResult {
  count: number;
  maxUpdatedAt: string | null;
}

export async function calculateLocalE2eChecksum(): Promise<{
  count: number;
  maxUpdatedAt: string | null;
} | null> {
  if (typeof window === 'undefined') return null;

  try {
    const types: RecordType[] = ['bookmark', 'space', 'pinned-view'];
    let allRecords: StoredEncryptedRecord[] = [];

    for (const recordType of types) {
      const records = loadAllEncryptedRecords(recordType);
      allRecords = allRecords.concat(records);
    }

    console.log(`[e2e-checksum] Local: found ${allRecords.length} encrypted records`);

    // Calculate max updatedAt
    let maxUpdatedAt: string | null = null;
    for (const record of allRecords) {
      if (!maxUpdatedAt || record.updatedAt > maxUpdatedAt) {
        maxUpdatedAt = record.updatedAt;
      }
    }

    const result = {
      count: allRecords.length,
      maxUpdatedAt,
    };

    console.log(`[e2e-checksum] Local: count=${result.count}, maxUpdatedAt=${result.maxUpdatedAt}`);

    return result;
  } catch (error) {
    console.error('[e2e-checksum] Local: error:', error);
    return null;
  }
}

export async function getE2eChecksumFromServer(): Promise<{
  count: number;
  maxUpdatedAt: string | null;
} | null> {
  try {
    const response = await fetch('/api/sync/e2e/checksum', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data: E2eChecksumResult = await response.json();
    console.log(`[e2e-checksum] Server: count=${data.count}, maxUpdatedAt=${data.maxUpdatedAt}`);
    return data;
  } catch (error) {
    console.error('[e2e-checksum] Server: error fetching:', error);
    return null;
  }
}
