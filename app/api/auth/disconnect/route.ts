/**
 * app/api/auth/disconnect/route.ts
 *
 * Disconnects a social media account by clearing its tokens from the session.
 *
 * Body: { "platform": "linkedin" | "twitter" }
 * Response: 200 { "ok": true }
 *
 * Requirements: 1.6, 2.6
 */

import { NextResponse } from 'next/server';
import { clearLinkedInTokens, clearTwitterTokens } from '@/lib/tokenStore';
import type { Platform } from '@/types';

export async function POST(request: Request): Promise<Response> {
  let platform: Platform | undefined;

  try {
    const body = (await request.json()) as { platform?: unknown };
    if (body.platform === 'linkedin' || body.platform === 'twitter') {
      platform = body.platform;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!platform) {
    return NextResponse.json(
      { error: 'Missing or invalid "platform" field. Must be "linkedin" or "twitter".' },
      { status: 400 }
    );
  }

  // Build a mutable response so iron-session can update the cookie
  const response = new Response();

  if (platform === 'linkedin') {
    await clearLinkedInTokens(request, response);
  } else {
    await clearTwitterTokens(request, response);
  }

  return NextResponse.json({ ok: true });
}
