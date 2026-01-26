import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

type SyncSettingsRow = {
  sync_enabled: boolean;
  sync_mode: string;
  last_sync_at: string | null;
  gemini_api_token?: string | null;
};

// GET: Retrieve user's sync settings
export async function GET() {
  const authResult = await auth();
  const userId = authResult.userId;
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await query<SyncSettingsRow>(
      `SELECT sync_enabled, sync_mode, last_sync_at, gemini_api_token
       FROM sync_settings
       WHERE user_id = $1`,
      [userId]
    );

    if (result.length === 0) {
      // Return defaults if no settings exist
      return NextResponse.json({
        syncEnabled: false,
        syncMode: 'off',
        lastSyncAt: null,
        geminiApiKeyIsSet: false,
      });
    }

    const settings = result[0];
    return NextResponse.json({
      syncEnabled: settings.sync_enabled,
      syncMode: settings.sync_mode,
      lastSyncAt: settings.last_sync_at,
      geminiApiKeyIsSet: !!settings.gemini_api_token,
    });
  } catch (error) {
    console.error('Failed to get sync settings:', error);
    return NextResponse.json(
      { error: 'Failed to get sync settings' },
      { status: 500 }
    );
  }
}

// PUT: Update user's sync settings
export async function PUT(req: Request) {
  const authResult = await auth();
  const userId = authResult.userId;
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { syncEnabled, syncMode, geminiApiToken } = body;

    // Validate syncMode
    if (!['off', 'plaintext', 'e2e'].includes(syncMode)) {
      return NextResponse.json(
        { error: 'Invalid sync mode' },
        { status: 400 }
      );
    }

    // Upsert settings
    const result = await query<SyncSettingsRow>(
      `INSERT INTO sync_settings (user_id, sync_enabled, sync_mode, gemini_api_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET
         sync_enabled = EXCLUDED.sync_enabled,
         sync_mode = EXCLUDED.sync_mode,
         gemini_api_token = EXCLUDED.gemini_api_token,
         updated_at = NOW()
       RETURNING sync_enabled, sync_mode, last_sync_at, gemini_api_token`,
      [userId, syncEnabled, syncMode, geminiApiToken || null]
    );

    const settings = result[0];
    return NextResponse.json({
      success: true,
      syncEnabled: settings.sync_enabled,
      syncMode: settings.sync_mode,
      lastSyncAt: settings.last_sync_at,
      geminiApiKeyIsSet: !!settings.gemini_api_token,
    });
  } catch (error) {
    console.error('Failed to update sync settings:', error);
    return NextResponse.json(
      { error: 'Failed to update sync settings' },
      { status: 500 }
    );
  }
}
