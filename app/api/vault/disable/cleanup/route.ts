/**
 * POST /api/vault/disable/cleanup
 *
 * Cleanup API for rollback scenarios in vault disable process.
 *
 * Used when Phase 1 fails:
 * - Removes partial plaintext uploads
 * - Only executes if encrypted records still exist (safety check)
 * - Idempotent: safe to call multiple times
 *
 * This prevents orphaned plaintext records if the disable process fails
 * and the user rolls back to encrypted mode.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

interface CleanupRequest {
  recordIds?: string[];
  recordTypes?: string[];
}

interface CleanupResponse {
  success: boolean;
  deletedCount: number;
  remainingEncryptedCount: number;
  error?: string;
}

type CountRow = { count: string };
type DeleteRow = { id: string };

export async function POST(req: Request) {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as CleanupRequest;
    const { recordIds = [], recordTypes = [] } = body;

    // Safety check: verify that encrypted records still exist
    // If no encrypted records exist, we're in plaintext mode and cleanup isn't needed
    const encryptedCheck = await query<CountRow>(
      'SELECT COUNT(*) as count FROM records WHERE user_id = $1 AND encrypted = true',
      [userId]
    );

    const encryptedCount = parseInt(encryptedCheck[0].count, 10);
    if (encryptedCount === 0) {
      // Already in plaintext mode, cleanup not needed
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        remainingEncryptedCount: 0,
        error: 'Vault already in plaintext mode',
      } as CleanupResponse);
    }

    let deletedCount = 0;

    if (recordIds.length > 0 && recordTypes.length === recordIds.length) {
      // Delete specific records by ID and type
      for (let i = 0; i < recordIds.length; i++) {
        const result = await query<DeleteRow>(
          `DELETE FROM records
           WHERE user_id = $1 AND record_id = $2 AND record_type = $3 AND encrypted = false
           RETURNING id`,
          [userId, recordIds[i], recordTypes[i]]
        );
        deletedCount += result.length;
      }
    } else {
      // Delete all plaintext records for this user
      const result = await query<DeleteRow>(
        `DELETE FROM records
         WHERE user_id = $1 AND encrypted = false
         RETURNING id`,
        [userId]
      );
      deletedCount = result.length;
    }

    // Get remaining encrypted record count
    const remainingEncrypted = await query<CountRow>(
      'SELECT COUNT(*) as count FROM records WHERE user_id = $1 AND encrypted = true',
      [userId]
    );

    const remainingEncryptedCount = parseInt(remainingEncrypted[0].count, 10);

    return NextResponse.json({
      success: true,
      deletedCount,
      remainingEncryptedCount,
    } as CleanupResponse);
  } catch (error) {
    console.error('Vault disable cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', success: false, deletedCount: 0, remainingEncryptedCount: 0 },
      { status: 500 }
    );
  }
}
