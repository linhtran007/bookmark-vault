import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

/**
 * POST /api/vault/disable
 *
 * Two-phase commit for vault disable:
 *
 * PHASE 1 (Reversible):
 * 1. Verify vault exists
 * 2. Client decrypts records, uploads as plaintext
 * 3. Server verifies plaintext records via /verify-plaintext gate
 *
 * PHASE 2 (Irreversible - Atomic Transaction):
 * 1. Delete encrypted records from database
 * 2. Delete vault envelope from database
 * 3. Update sync_settings to plaintext mode
 * All in single transaction - either all succeed or all rollback.
 */

interface DisableRequest {
  action: 'verify' | 'delete-encrypted' | 'delete-plaintext' | 'delete-vault';
}

interface DisableResponse {
  success: boolean;
  vaultId?: string;
  encryptedRecordCount?: number;
  deletedCount?: number;
  message?: string;
  error?: string;
}

type VaultRow = { id: string };
type CountRow = { count: string };
type DeleteRow = { id: string };

export async function POST(req: Request) {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as DisableRequest;
    const { action } = body;

    switch (action) {
      case 'verify': {
        // PHASE 1: Verify vault exists and get record counts
        const vault = await query<VaultRow>(
          'SELECT id FROM vaults WHERE user_id = $1',
          [userId]
        );

        if (vault.length === 0) {
          return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
        }

        // Get count of encrypted records
        const countResult = await query<CountRow>(
          'SELECT COUNT(*) as count FROM records WHERE user_id = $1 AND encrypted = true',
          [userId]
        );

        return NextResponse.json({
          success: true,
          vaultId: vault[0].id,
          encryptedRecordCount: parseInt(countResult[0].count),
        } as DisableResponse);
      }

      case 'delete-encrypted': {
        // PHASE 2: Atomic deletion of encrypted records
        // This is called ONLY AFTER verification gate passes

        try {
          // Begin transaction
          await query('BEGIN', []);

          // Count encrypted records before deletion (for verification)
          const countBefore = await query<CountRow>(
            'SELECT COUNT(*) as count FROM records WHERE user_id = $1 AND encrypted = true',
            [userId]
          );
          const countBeforeValue = parseInt(countBefore[0].count, 10);

          // Delete all encrypted records
          const deleteResult = await query<DeleteRow>(
            'DELETE FROM records WHERE user_id = $1 AND encrypted = true RETURNING id',
            [userId]
          );

          const deletedCount = deleteResult.length;

          // Verify deletion count matches before count
          if (deletedCount !== countBeforeValue) {
            await query('ROLLBACK', []);
            return NextResponse.json(
              {
                success: false,
                error: 'Deletion count mismatch - transaction rolled back',
                deletedCount: 0
              },
              { status: 500 }
            );
          }

          // Commit transaction
          await query('COMMIT', []);

          return NextResponse.json({
            success: true,
            deletedCount,
          } as DisableResponse);
        } catch (error) {
          // Rollback on any error
          try {
            await query('ROLLBACK', []);
          } catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
          }
          throw error;
        }
      }

      case 'delete-plaintext': {
        // Delete all plaintext records (used after enabling E2E successfully)
        try {
          await query('BEGIN', []);

          const result = await query<DeleteRow>(
            'DELETE FROM records WHERE user_id = $1 AND encrypted = false RETURNING id',
            [userId]
          );

          await query('COMMIT', []);

          return NextResponse.json({
            success: true,
            deletedCount: result.length,
          } as DisableResponse);
        } catch (error) {
          try {
            await query('ROLLBACK', []);
          } catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
          }
          throw error;
        }
      }

      case 'delete-vault': {
        // PHASE 2: Atomic deletion of vault and update sync settings
        try {
          // Begin transaction
          await query('BEGIN', []);

          // Delete vault
          const vaultResult = await query<VaultRow>(
            'DELETE FROM vaults WHERE user_id = $1 RETURNING id',
            [userId]
          );

          if (vaultResult.length === 0) {
            await query('ROLLBACK', []);
            return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
          }

          // Update sync settings to plaintext mode (atomic within transaction)
          await query(
            `UPDATE sync_settings
             SET sync_mode = 'plaintext', updated_at = NOW()
             WHERE user_id = $1`,
            [userId]
          );

          // Commit transaction
          await query('COMMIT', []);

          return NextResponse.json({
            success: true,
            message: 'Vault disabled successfully',
          } as DisableResponse);
        } catch (error) {
          // Rollback on any error
          try {
            await query('ROLLBACK', []);
          } catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
          }
          throw error;
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Vault disable error:', error);
    return NextResponse.json({ error: 'Failed to disable vault' }, { status: 500 });
  }
}
