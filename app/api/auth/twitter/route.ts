/**
 * app/api/auth/twitter/route.ts
 *
 * Initiates the Twitter/X OAuth 2.0 Authorization Code flow with PKCE.
 *
 * Steps:
 *  1. Generate a `code_verifier` using lib/pkce.ts and compute `code_challenge`
 *  2. Generate a cryptographically random `state` value (CSRF protection)
 *  3. Store `code_verifier` and `state` in the encrypted iron-session cookie
 *  4. Build the Twitter/X authorization URL with PKCE params
 *  5. Return a 302 redirect to the authorization URL
 *
 * Requirements: 2.2, 7.2, 7.6
 */

import crypto from 'crypto';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/tokenStore';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/pkce';
import type { SessionData } from '@/types';

export async function GET(request: Request): Promise<Response> {
  // Validate required environment variables (Requirement 7.4)
  const clientId = process.env.TWITTER_CLIENT_ID;
  const redirectUri = process.env.TWITTER_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error('[twitter/route] Missing TWITTER_CLIENT_ID or TWITTER_REDIRECT_URI');
    return new Response('OAuth configuration error', { status: 500 });
  }

  // Build a mutable response so iron-session can set the cookie
  const response = new Response(null, { status: 302 });

  // Obtain the session to store PKCE verifier and state (Requirements 7.2, 7.6)
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  // --- Step 1: Generate PKCE code_verifier and code_challenge (Requirement 2.2, 7.2) ---
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // --- Step 2: Generate random state for CSRF protection (Requirement 7.6) ---
  const state = crypto.randomBytes(16).toString('hex');

  // --- Step 3: Persist verifier and state in the encrypted session ---
  session.twitterCodeVerifier = codeVerifier;
  session.twitterOAuthState = state;
  await session.save();

  // --- Step 4: Build the Twitter/X authorization URL ---
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.write users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authorizationUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

  // --- Step 5: Return 302 redirect — preserve the Set-Cookie header from iron-session ---
  response.headers.set('Location', authorizationUrl);
  return response;
}
