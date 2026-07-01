/**
 * app/api/auth/linkedin/route.ts
 *
 * Initiates the LinkedIn OAuth 2.0 Authorization Code flow.
 *
 * Steps:
 *  1. Generate a cryptographically random 16-byte hex `state` value
 *  2. Store `state` in the encrypted iron-session cookie (CSRF protection)
 *  3. Build the LinkedIn authorization URL with required params
 *  4. Return a 302 redirect to the authorization URL
 *
 * Requirements: 1.2, 7.4, 7.6
 */

import crypto from 'crypto';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/tokenStore';
import type { SessionData } from '@/types';

export async function GET(request: Request): Promise<Response> {
  // Validate required environment variables (Requirement 7.4)
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error('[linkedin/route] Missing LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI');
    return new Response('OAuth configuration error', { status: 500 });
  }

  // Build a mutable response so iron-session can set the cookie
  const response = new Response(null, { status: 302 });

  // Obtain the session and store the state value (Requirement 7.6)
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  // Generate a 16-byte hex state string for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');
  session.linkedinOAuthState = state;
  await session.save();

  // Build the LinkedIn authorization URL (Requirement 1.2)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'w_member_social openid profile',
    state,
  });

  const authorizationUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

  // Return 302 redirect — preserve the Set-Cookie header from iron-session
  response.headers.set('Location', authorizationUrl);
  return response;
}
