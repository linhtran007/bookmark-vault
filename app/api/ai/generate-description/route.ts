import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

// v1beta required for 2.5 models with proper config support
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const API_TIMEOUT = 15000; // 15 seconds
const MAX_DESCRIPTION_LENGTH = 400; 
const FETCH_TIMEOUT = 8000; // 8 seconds to fetch URL content
const MAX_CONTENT_LENGTH = 3000; // More context for better AI understanding

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// Decode common HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

// Extract meta tag content - handles any attribute order
function extractMetaContent(html: string, type: 'property' | 'name', value: string): string | null {
  // Match meta tags with the specified property/name, regardless of attribute order
  const regex = new RegExp(
    `<meta\\s+[^>]*(?:${type}=["']${value}["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*${type}=["']${value}["'])[^>]*>`,
    'i'
  );
  const match = html.match(regex);
  return match ? decodeHtmlEntities(match[1] || match[2]) : null;
}

// Extract text from specific HTML tags
function extractTagContent(html: string, tagName: string, limit: number = 500): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const matches: string[] = [];
  let totalLength = 0;
  let match: RegExpExecArray | null = regex.exec(html);

  while (match !== null && totalLength < limit) {
    // Clean the inner content
    const content = match[1]
      .replace(/<[^>]+>/g, ' ') // Remove nested tags
      .replace(/\s+/g, ' ')
      .trim();
    
    if (content.length > 20) { // Only include meaningful content
      matches.push(content);
      totalLength += content.length;
    }
    match = regex.exec(html);
  }

  return matches.join(' ').substring(0, limit);
}

// Clean HTML and extract main text content
function extractMainContent(html: string): string {
  // Remove non-content elements
  const cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, ''); // Remove comments

  // Try to extract from semantic content areas first
  const articleMatch = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  
  // Use semantic content if available, otherwise use the whole cleaned HTML
  const contentSource = articleMatch?.[1] || mainMatch?.[1] || cleaned;

  // Extract paragraph content (most valuable for descriptions)
  const paragraphContent = extractTagContent(contentSource, 'p', 2000);
  
  // If we got good paragraph content, use it
  if (paragraphContent.length > 100) {
    return decodeHtmlEntities(paragraphContent);
  }

  // Fallback: extract all text
  const textContent = contentSource
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return decodeHtmlEntities(textContent);
}

// Fetch and extract relevant content from URL
async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      },
      FETCH_TIMEOUT
    );

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract structured metadata
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const ogTitle = extractMetaContent(html, 'property', 'og:title');
    const ogDescription = extractMetaContent(html, 'property', 'og:description');
    const metaDescription = extractMetaContent(html, 'name', 'description');
    const ogSiteName = extractMetaContent(html, 'property', 'og:site_name');
    
    // Extract headings for context
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim();
    const h2Matches = extractTagContent(html, 'h2', 300);

    // Extract main content
    const mainContent = extractMainContent(html);

    // Build structured content for the AI
    const sections: string[] = [];

    // Add title section
    const pageTitle = ogTitle || title;
    if (pageTitle) {
      sections.push(`Title: ${decodeHtmlEntities(pageTitle)}`);
    }

    // Add site name if available
    if (ogSiteName) {
      sections.push(`Site: ${ogSiteName}`);
    }

    // Add meta descriptions (most curated content)
    if (ogDescription) {
      sections.push(`Meta Description: ${ogDescription}`);
    } else if (metaDescription) {
      sections.push(`Meta Description: ${metaDescription}`);
    }

    // Add main heading
    if (h1Match && h1Match !== pageTitle) {
      sections.push(`Main Heading: ${decodeHtmlEntities(h1Match)}`);
    }

    // Add subheadings for structure context
    if (h2Matches) {
      sections.push(`Subheadings: ${h2Matches}`);
    }

    // Add main content (truncated to fit)
    const remainingSpace = MAX_CONTENT_LENGTH - sections.join('\n').length - 100;
    if (remainingSpace > 200 && mainContent) {
      const truncatedContent = mainContent.substring(0, remainingSpace);
      sections.push(`Content:\n${truncatedContent}`);
    }

    const result = sections.join('\n\n');
    return result || null;
  } catch (error) {
    console.error('Failed to fetch URL content:', error);
    return null;
  }
}

function buildPrompt(
  url: string,
  currentDescription?: string,
  modificationInstructions?: string,
  pageContent?: string | null
): string {
  const contentSection = pageContent
    ? `\n--- PAGE CONTENT ---\n${pageContent}\n--- END PAGE CONTENT ---\n`
    : '\n(Note: Could not fetch page content. Generate description based on URL and common knowledge.)\n';

  const examplesSection = `
EXAMPLES of GOOD descriptions (150-300 characters each):
- "A comprehensive React hooks tutorial covering useState, useEffect, and custom hooks with practical examples. Includes best practices for state management and common pitfalls to avoid when building React applications." (215 chars)
- "Documentation for Stripe's Payment Intents API explaining how to create, confirm, and handle payment flows. Provides code samples in JavaScript, Python, Ruby, and PHP with detailed error handling guidance." (207 chars)
- "Interactive CSS Grid generator that lets you visually design grid layouts by dragging and resizing. Exports clean, production-ready CSS code with browser compatibility notes and responsive design options." (205 chars)

EXAMPLES of BAD descriptions (TOO SHORT - REJECTED):
- "The official guide to Rust programming." (40 chars - WAY TOO SHORT!)
- "A website for developers." (25 chars - USELESS!)
- "Documentation for React." (24 chars - NO DETAILS!)
`;

  // Case 1: User wants to modify existing description
  if (currentDescription && modificationInstructions) {
    return `You must improve a bookmark description based on user feedback.

CURRENT DESCRIPTION: "${currentDescription}"
USER REQUEST: "${modificationInstructions}"
${contentSection}
RULES:
1. Apply the user's requested changes
2. CRITICAL: Write MINIMUM 150 characters, ideally 200-300 characters (2-3 full sentences)
3. Be specific about what the page actually contains
4. NEVER use filler phrases like "This page contains" or "This is a"
5. Short descriptions under 100 characters are UNACCEPTABLE

Output ONLY the improved description (minimum 150 characters):`;
  }

  // Case 2: User wants completely new description (regenerate)
  if (currentDescription && !modificationInstructions) {
    return `Generate a NEW bookmark description that is DIFFERENT from the previous one.

URL: ${url}
PREVIOUS DESCRIPTION (do NOT repeat this): "${currentDescription}"
${contentSection}${examplesSection}
STRICT RULES:
1. Read the page content carefully and describe what the page ACTUALLY offers
2. CRITICAL LENGTH: Write MINIMUM 150 characters, target 200-300 characters (2-3 full sentences)
3. NEVER start with "This page", "This is", "This website", or "A page that"
4. Focus on: What can users learn/do/get from this page?
5. Include specific details: technologies, features, topics, chapters covered
6. Generate something COMPLETELY DIFFERENT from the previous description
7. Descriptions under 100 characters will be REJECTED - add more detail!

Output ONLY the description (MUST be at least 150 characters):`;
  }

  // Case 3: Initial generation (no description exists)
  return `Generate a bookmark description for this webpage.

URL: ${url}
${contentSection}${examplesSection}
STRICT RULES:
1. Read the page content carefully and describe what the page ACTUALLY offers
2. CRITICAL LENGTH: Write MINIMUM 150 characters, target 200-300 characters (2-3 full sentences)
3. NEVER start with "This page", "This is", "This website", or "A page that"
4. Focus on: What can users learn/do/get from this page?
5. Include specific details: technologies, features, topics, chapters covered
6. If content is technical, mention the specific tech/framework/language
7. Descriptions under 100 characters will be REJECTED - add more detail!

Output ONLY the description (MUST be at least 150 characters):`;
}

export async function POST(request: Request) {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get user's Gemini API token from database
    type SettingsRow = { gemini_api_token: string | null };
    const settings = await query<SettingsRow>(
      'SELECT gemini_api_token FROM sync_settings WHERE user_id = $1',
      [userId]
    );

    if (!settings.length || !settings[0].gemini_api_token) {
      return NextResponse.json(
        { error: 'Gemini API token not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    const apiToken = settings[0].gemini_api_token;

    // 2. Parse and validate request body
    const body = await request.json();
    const { url, currentDescription, modificationInstructions } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Validate modification instructions if provided
    if (modificationInstructions && typeof modificationInstructions !== 'string') {
      return NextResponse.json({ error: 'Invalid modification instructions' }, { status: 400 });
    }

    // 3. Fetch URL content to provide context (non-blocking, optional)
    const pageContent = await fetchUrlContent(url);
    
    // Debug: log extracted content
    console.log('Extracted page content:', pageContent ? `${pageContent.length} chars` : 'null');
    if (pageContent) {
      console.log('Content preview:', pageContent.substring(0, 500));
    }

    // 4. Build prompt (handles 3 cases: initial, regenerate, modify)
    const prompt = buildPrompt(url, currentDescription, modificationInstructions, pageContent);
    console.log('Prompt length:', prompt.length);

    // 5. Call Gemini API
    const geminiUrl = `${GEMINI_API_ENDPOINT}?key=${apiToken}`;
    const geminiResponse = await fetchWithTimeout(
      geminiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 500,
            topP: 0.95,
            // Disable thinking mode - we don't need reasoning for simple descriptions
            thinkingConfig: {
              thinkingBudget: 0
            }
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
        }),
      },
      API_TIMEOUT
    );

    // 6. Handle Gemini API errors
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}));
      console.error('Gemini API error:', geminiResponse.status, errorData);

      if (geminiResponse.status === 401 || geminiResponse.status === 403) {
        return NextResponse.json(
          { error: 'Invalid API token. Please check your Gemini API key in Settings.' },
          { status: 401 }
        );
      }

      if (geminiResponse.status === 429) {
        const message = errorData.error?.message?.includes('quota') || errorData.error?.message?.includes('Quota')
          ? 'Your free tier quota is exhausted. Try again tomorrow or upgrade your Gemini API plan at https://aistudio.google.com'
          : 'Rate limit exceeded. Please try again in a few moments.';
        return NextResponse.json(
          { error: message },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to generate description. Please try again.' },
        { status: 500 }
      );
    }

    // 7. Parse Gemini response
    const geminiData = await geminiResponse.json();

    // Log why generation stopped
    const finishReason = geminiData.candidates?.[0]?.finishReason;
    console.log('Gemini finish reason:', finishReason);
    
    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected Gemini response structure:', geminiData);
      console.error('Full response:', JSON.stringify(geminiData, null, 2));
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      );
    }

    let generatedText = geminiData.candidates[0].content.parts[0].text.trim();

    console.log('Raw AI response:', generatedText);
    console.log('Response length:', generatedText.length, 'characters');

    // Clean up: remove surrounding quotes if AI wrapped the response
    if ((generatedText.startsWith('"') && generatedText.endsWith('"')) ||
        (generatedText.startsWith("'") && generatedText.endsWith("'"))) {
      generatedText = generatedText.slice(1, -1);
    }

    // Warn if description is too short (AI didn't follow instructions)
    if (generatedText.length < 100) {
      console.warn('WARNING: AI generated too short description:', generatedText.length, 'chars');
    }

    // 8. Validate and truncate if needed
    const description = generatedText.length > MAX_DESCRIPTION_LENGTH
      ? generatedText.substring(0, MAX_DESCRIPTION_LENGTH) + '...'
      : generatedText;

    // 9. Return success
    return NextResponse.json({
      success: true,
      description,
      debug: {
        contentExtracted: !!pageContent,
        contentLength: pageContent?.length || 0,
        rawLength: generatedText.length,
      }
    });

  } catch (error) {
    console.error('Generate description error:', error);

    if (error instanceof Error) {
      if (error.message === 'Request timeout') {
        return NextResponse.json(
          { error: 'Request timeout. Please try again.' },
          { status: 408 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    );
  }
}
