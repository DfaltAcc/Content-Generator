/**
 * app/api/auth/twitter/callback/route.ts
 *
 * Handles the Twitter/X OAuth 2.0 callback after the user authorises (or denies) access.
 *
 * Steps:
 *  1. Validate the `state` query param against the session value (CSRF protection)
 *  2. If `error` param is present, redirect to /settings?error=twitter_denied
 *  3. Retrieve `code_verifier` from session
 *  4. Exchange the `code` for access + refresh tokens via Twitter token endpoint (with PKCE)
 *  5. Fetch the user's username via Twitter /2/users/me endpoint
 *  6. Store tokens and username in the encrypted session
 *  7. Clear temporary `state` and `code_verifier` from session
 *  8. Redirect to /settings?connected=twitter
 *
 * Requirements: 2.3, 2.4, 7.1, 7.2, 7.3, 7.6
 */

import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/tokenStore';
import type { SessionData } from '@/types';

// ---------------------------------------------------------------------------
// Types for Twitter/X API responses
// ---------------------------------------------------------------------------

interface TwitterTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

interface TwitterUserResponse {
  data?: {
    id: string;
    name: string;
    username: string;
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');

  // Validate required environment variables (Requirement 7.4)
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const redirectUri = process.env.TWITTER_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error('[twitter/callback] Missing TWITTER_CLIENT_ID or TWITTER_REDIRECT_URI');
    return Response.redirect(new URL('/settings?error=config_error', request.url));
  }

  // Build a mutable response so iron-session can update the cookie
  const response = new Response(null, { status: 302 });
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  // --- Step 1: CSRF state validation (Requirement 7.6) ---
  const storedState = session.twitterOAuthState;

  if (!stateParam || !storedState || stateParam !== storedState) {
    console.warn('[twitter/callback] State mismatch — possible CSRF attack');
    // Clear any stale temporary values before returning
    session.twitterOAuthState = undefined;
    session.twitterCodeVerifier = undefined;
    await session.save();
    return new Response('State mismatch: CSRF validation failed', { status: 400 });
  }

  // --- Step 2: Handle user denial or OAuth error (Requirement 2.4) ---
  if (errorParam) {
    session.twitterOAuthState = undefined;
    session.twitterCodeVerifier = undefined;
    await session.save();
    response.headers.set('Location', '/settings?error=twitter_denied');
    return response;
  }

  if (!code) {
    session.twitterOAuthState = undefined;
    session.twitterCodeVerifier = undefined;
    await session.save();
    return new Response('Missing authorization code', { status: 400 });
  }

  // --- Step 3: Retrieve code_verifier from session (Requirement 7.2) ---
  const codeVerifier = session.twitterCodeVerifier;

  if (!codeVerifier) {
    console.error('[twitter/callback] Missing code_verifier in session');
    session.twitterOAuthState = undefined;
    await session.save();
    return new Response('Missing PKCE code verifier', { status: 400 });
  }

  // --- Step 4: Exchange code for tokens with PKCE (Requirements 2.3, 7.1, 7.2) ---
  let tokenData: TwitterTokenResponse;
  try {
    // Twitter requires Basic auth (client_id:client_secret) for confidential clients,
    // or just client_id in the body for public clients. We support both patterns:
    // if a client secret is provided, use Basic auth; otherwise omit it.
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (clientSecret) {
      // Confidential client: use HTTP Basic authentication
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: tokenBody,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[twitter/callback] Token exchange failed:', errorText);
      session.twitterOAuthState = undefined;
      session.twitterCodeVerifier = undefined;
      await session.save();
      response.headers.set('Location', '/settings?error=token_exchange');
      return response;
    }

    tokenData = (await tokenResponse.json()) as TwitterTokenResponse;
  } catch (err) {
    console.error('[twitter/callback] Token exchange network error:', err);
    session.twitterOAuthState = undefined;
    session.twitterCodeVerifier = undefined;
    await session.save();
    response.headers.set('Location', '/settings?error=token_exchange');
    return response;
  }

  const { access_token: accessToken, refresh_token: refreshToken } = tokenData;

  if (!accessToken) {
    console.error('[twitter/callback] No access_token in token response');
    session.twitterOAuthState = undefined;
    session.twitterCodeVerifier = undefined;
    await session.save();
    response.headers.set('Location', '/settings?error=token_exchange');
    return response;
  }

  // --- Step 5: Fetch Twitter username (Requirement 2.3) ---
  let twitterUsername: string | undefined;
  try {
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (userResponse.ok) {
      const userData = (await userResponse.json()) as TwitterUserResponse;
      twitterUsername = userData.data?.username;
    } else {
      console.warn('[twitter/callback] Failed to fetch user info, proceeding without username');
    }
  } catch (err) {
    // Non-fatal — store tokens even if username fetch fails
    console.warn('[twitter/callback] User info fetch error:', err);
  }

  // --- Steps 6 & 7: Store tokens and clear temporary session values (Requirements 7.1, 7.3) ---
  session.twitterOAuthState = undefined;
  session.twitterCodeVerifier = undefined;
  session.twitterAccessToken = accessToken;
  session.twitterRefreshToken = refreshToken ?? '';
  session.twitterUsername = twitterUsername;
  await session.save();

  // --- Step 8: Redirect to settings on success (Requirement 2.3) ---
  response.headers.set('Location', '/settings?connected=twitter');
  return response;
}
