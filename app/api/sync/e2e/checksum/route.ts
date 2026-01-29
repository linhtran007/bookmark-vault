import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

/**
 * GET /api/sync/e2e/checksum
 *
 * Returns metadata checksum for E2EE sync optimization.
 * Uses updatedAt timestamp and record count since ciphertext
 * on server doesn't match unencrypted local data.
 *
 * Response includes:
 * - maxUpdatedAt: Latest updatedAt timestamp
 * - count: Total record count
 *
 * Note: We use metadata (not ciphertext) for checksum because
 * server ciphertext cannot be compared with local unencrypted data.
 */
export async function GET() {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const headers = new Headers();
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');

  try {
    type RecordRow = {
      updated_at: string;
    };

    const records = await query<RecordRow>(
      `SELECT updated_at
       FROM records
       WHERE user_id = $1 AND encrypted = true AND deleted = false
       ORDER BY updated_at DESC`,
      [userId]
    );

    const count = records.length;
    const maxUpdatedAt = records.length > 0 ? records[0].updated_at : null;

    console.log(`[e2e-checksum] Server: count=${count}, maxUpdatedAt=${maxUpdatedAt}`);

    return NextResponse.json({
      count,
      maxUpdatedAt,
    }, { headers });
  } catch (error) {
    console.error('[e2e-checksum] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch checksum' }, { status: 500 });
  }
}
