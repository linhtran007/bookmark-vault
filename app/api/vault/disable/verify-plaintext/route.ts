/**
 * GET /api/vault/disable/verify-plaintext
 *
 * Critical verification gate for two-phase vault disable commit.
 *
 * PHASE 1 GATE: Verifies that plaintext records were uploaded successfully
 * before encrypted deletion is allowed (Phase 2).
 *
 * Compares:
 * - Expected record count (from client)
 * - Server record count (from database)
 * - Expected checksum (from client)
 * - Server checksum (calculated from records)
 *
 * If any verification fails, Phase 2 (deletion) is ABORTED.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';
import { calculateChecksum } from '@/lib/checksum';

interface VerificationRequest {
  expectedCount: number;
  expectedChecksum: string;
}

interface VerificationResponse {
  verified: boolean;
  serverCount: number;
  expectedCount: number;
  checksumMatch: boolean;
  serverChecksum: string;
  expectedChecksum: string;
  error?: string;
}

export async function GET(req: Request) {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const expectedCountParam = url.searchParams.get('expectedCount');
    const expectedChecksum = url.searchParams.get('expectedChecksum') || '';

    // Validate that expectedCount parameter exists and is a valid non-negative number
    if (expectedCountParam === null || expectedChecksum === '') {
      return NextResponse.json(
        { error: 'Missing expectedCount or expectedChecksum' },
        { status: 400 }
      );
    }

    const expectedCount = parseInt(expectedCountParam, 10);
    if (isNaN(expectedCount) || expectedCount < 0) {
      return NextResponse.json(
        { error: 'expectedCount must be a non-negative integer' },
        { status: 400 }
      );
    }

    // Fetch all plaintext records from database
    const records = await query(
      `SELECT record_id, record_type, data, version, updated_at, deleted
       FROM records
       WHERE user_id = $1 AND encrypted = false AND deleted = false
       ORDER BY record_id ASC`,
      [userId]
    );

    const serverCount = records.length;

    // Calculate server checksum
    const plaintextRecords = records.map((r) => ({
      recordId: r.record_id,
      recordType: r.record_type,
      data: r.data,
      version: r.version,
      updatedAt: r.updated_at,
      deleted: r.deleted,
    }));

    const serverChecksum = calculateChecksum(plaintextRecords);
    const checksumMatch = serverChecksum.toLowerCase() === expectedChecksum.toLowerCase();
    const countMatch = serverCount === expectedCount;
    const verified = countMatch && checksumMatch;

    if (!verified) {
      console.error('Vault disable verification failed:', {
        userId,
        countMatch,
        checksumMatch,
        serverCount,
        expectedCount,
        serverChecksum,
        expectedChecksum,
      });
    }

    return NextResponse.json({
      verified,
      serverCount,
      expectedCount,
      checksumMatch,
      serverChecksum,
      expectedChecksum,
    } as VerificationResponse);
  } catch (error) {
    console.error('Vault disable verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed', verified: false },
      { status: 500 }
    );
  }
}
