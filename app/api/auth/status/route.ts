/**
 * app/api/auth/status/route.ts
 *
 * Returns the current OAuth connection status for LinkedIn and Twitter/X.
 * Token values are NEVER included in the response — only a `connected` flag
 * and a safe `accountIdentifier` (display name or username).
 *
 * Requirements: 8.2, 7.3, 9.4
 */

import { NextResponse } from 'next/server';
import { getLinkedInTokens, getTwitterTokens } from '@/lib/tokenStore';
import type { ConnectionStatus } from '@/types';

export async function GET(request: Request): Promise<Response> {
  // Build a mutable response so iron-session can read the cookie
  const response = new Response();

  const [linkedinTokens, twitterTokens] = await Promise.all([
    getLinkedInTokens(request, response),
    getTwitterTokens(request, response),
  ]);

  const connectionStatus: ConnectionStatus = {
    linkedin: linkedinTokens
      ? { connected: true, accountIdentifier: linkedinTokens.accountName }
      : { connected: false },
    twitter: twitterTokens
      ? { connected: true, accountIdentifier: twitterTokens.username }
      : { connected: false },
  };

  // Return JSON — NEVER include token values (Requirement 7.3, 9.4)
  return NextResponse.json(connectionStatus);
}
