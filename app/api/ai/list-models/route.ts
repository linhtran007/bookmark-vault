import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

export async function GET() {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's Gemini API token
    type SettingsRow = { gemini_api_token: string | null };
    const settings = await query<SettingsRow>(
      'SELECT gemini_api_token FROM sync_settings WHERE user_id = $1',
      [userId]
    );

    if (!settings.length || !settings[0].gemini_api_token) {
      return NextResponse.json(
        { error: 'Gemini API token not configured' },
        { status: 400 }
      );
    }

    const apiToken = settings[0].gemini_api_token;

    // Call ListModels API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({
        status: response.status,
        error: error.error?.message || 'Failed to list models',
      });
    }

    interface Model {
      name: string;
      displayName: string;
      description: string;
      version: string;
      supportedGenerationMethods?: string[];
    }

    interface ModelsResponse {
      models?: Model[];
    }

    const data = await response.json() as ModelsResponse;

    // Filter to show only models that support generateContent
    const models = (data.models || []) as Model[];
    const generateContentModels = models.filter((m) => {
      const methods = m.supportedGenerationMethods || [];
      return methods.includes('generateContent');
    });

    return NextResponse.json({
      available_models: generateContentModels.map((m) => ({
        name: m.name,
        display_name: m.displayName,
        description: m.description,
        version: m.version,
      })),
      total: generateContentModels.length,
    });
  } catch (error) {
    console.error('List models error:', error);
    return NextResponse.json(
      { error: 'Failed to list models' },
      { status: 500 }
    );
  }
}
