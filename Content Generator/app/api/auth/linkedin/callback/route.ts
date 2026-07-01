/**
 * app/api/auth/linkedin/callback/route.ts
 *
 * Handles the LinkedIn OAuth 2.0 callback after the user authorises (or denies) access.
 *
 * Steps:
 *  1. Validate the `state` query param against the session value (CSRF protection)
 *  2. If `error` param is present, redirect to /settings?error=linkedin_denied
 *  3. Exchange the `code` for access + refresh tokens via LinkedIn token endpoint
 *  4. Fetch the user's display name via LinkedIn userinfo endpoint
 *  5. Store tokens and account name in the encrypted session via tokenStore
 *  6. Clear the temporary `state` from the session
 *  7. Redirect to /settings?connected=linkedin
 *
 * Requirements: 1.3, 1.4, 7.1, 7.3, 7.6
 */

import { getIronSession } from 'iron-session';
import { sessionOptions, setLinkedInTokens } from '@/lib/tokenStore';
import type { SessionData } from '@/types';

// ---------------------------------------------------------------------------
// Types for LinkedIn API responses
// ---------------------------------------------------------------------------

interface LinkedInTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
}

interface LinkedInUserInfoResponse {
  name?: string;
  given_name?: string;
  family_name?: string;
  sub?: string;
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
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('[linkedin/callback] Missing LinkedIn OAuth environment variables');
    return Response.redirect(new URL('/settings?error=config_error', request.url));
  }

  // Build a mutable response so iron-session can update the cookie
  const response = new Response(null, { status: 302 });
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  // --- Step 1: CSRF state validation (Requirement 7.6) ---
  const storedState = session.linkedinOAuthState;

  if (!stateParam || !storedState || stateParam !== storedState) {
    console.warn('[linkedin/callback] State mismatch — possible CSRF attack');
    // Clear any stale state before returning
    session.linkedinOAuthState = undefined;
    await session.save();
    return new Response('State mismatch: CSRF validation failed', { status: 400 });
  }

  // --- Step 2: Handle user denial or OAuth error (Requirement 1.4) ---
  if (errorParam) {
    session.linkedinOAuthState = undefined;
    await session.save();
    response.headers.set('Location', '/settings?error=linkedin_denied');
    return response;
  }

  if (!code) {
    session.linkedinOAuthState = undefined;
    await session.save();
    return new Response('Missing authorization code', { status: 400 });
  }

  // --- Step 3: Exchange code for tokens (Requirement 1.3, 7.1) ---
  let tokenData: LinkedInTokenResponse;
  try {
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[linkedin/callback] Token exchange failed:', errorText);
      session.linkedinOAuthState = undefined;
      await session.save();
      response.headers.set('Location', '/settings?error=token_exchange');
      return response;
    }

    tokenData = (await tokenResponse.json()) as LinkedInTokenResponse;
  } catch (err) {
    console.error('[linkedin/callback] Token exchange network error:', err);
    session.linkedinOAuthState = undefined;
    await session.save();
    response.headers.set('Location', '/settings?error=token_exchange');
    return response;
  }

  const { access_token: accessToken, refresh_token: refreshToken } = tokenData;

  if (!accessToken) {
    console.error('[linkedin/callback] No access_token in token response');
    session.linkedinOAuthState = undefined;
    await session.save();
    response.headers.set('Location', '/settings?error=token_exchange');
    return response;
  }

  // --- Step 4: Fetch account display name (Requirement 1.3) ---
  let accountName: string | undefined;
  try {
    const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (userInfoResponse.ok) {
      const userInfo = (await userInfoResponse.json()) as LinkedInUserInfoResponse;
      // Prefer full name, fall back to given + family, then sub (user ID)
      const composedName = [userInfo.given_name, userInfo.family_name]
        .filter(Boolean)
        .join(' ');
      accountName = userInfo.name ?? (composedName || userInfo.sub);
    } else {
      console.warn('[linkedin/callback] Failed to fetch userinfo, proceeding without account name');
    }
  } catch (err) {
    // Non-fatal — we still store the tokens even if we can't fetch the name
    console.warn('[linkedin/callback] userinfo fetch error:', err);
  }

  // --- Step 5 & 6: Store tokens and clear temporary state (Requirements 7.1, 7.3) ---
  // setLinkedInTokens calls session.save() internally, but we need to clear state first
  // so we do it in one save cycle to avoid a race.
  session.linkedinOAuthState = undefined;
  session.linkedinAccessToken = accessToken;
  session.linkedinRefreshToken = refreshToken ?? '';
  session.linkedinAccountName = accountName;
  await session.save();

  // --- Step 7: Redirect to settings on success (Requirement 1.3) ---
  response.headers.set('Location', '/settings?connected=linkedin');
  return response;
}
