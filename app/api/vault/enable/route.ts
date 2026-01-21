import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  const authResult = await auth();
  const userId = authResult.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { wrappedKey, salt, kdfParams } = body;

    if (!wrappedKey || !salt || !kdfParams) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO vaults (user_id, wrapped_key, salt, kdf_params)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET
         wrapped_key = EXCLUDED.wrapped_key,
         salt = EXCLUDED.salt,
         kdf_params = EXCLUDED.kdf_params,
         updated_at = NOW()
       RETURNING id`,
      [userId, wrappedKey, salt, JSON.stringify(kdfParams)]
    );

    return NextResponse.json({
      success: true,
      vaultId: result[0].id,
    });
  } catch (error) {
    console.error('Vault enable error:', error);
    return NextResponse.json({ error: 'Failed to enable vault' }, { status: 500 });
  }
}
