/**
 * app/api/post/linkedin/route.ts
 *
 * Publishes content to LinkedIn on behalf of the authenticated user.
 *
 * Steps:
 *  1. Read LinkedIn tokens from Token_Store — return 401 if missing
 *  2. If access token is expired, attempt refresh; update stored tokens;
 *     clear tokens and return 401 if refresh fails
 *  3. Read `content` from request body
 *  4. Fetch the user's LinkedIn sub (person URN) via userinfo endpoint
 *  5. Call POST https://api.linkedin.com/v2/ugcPosts with Bearer token
 *  6. Return 200 { "message": "Posted to LinkedIn successfully" } on success
 *  7. Return 500 { "error": "..." } on LinkedIn API error — no retry
 *
 * Requirements: 4.1, 4.4, 4.6, 9.1, 9.2, 9.3
 */

import { NextResponse } from 'next/server';
import {
  getLinkedInTokens,
  setLinkedInTokens,
  clearLinkedInTokens,
} from '@/lib/tokenStore';

// ---------------------------------------------------------------------------
// Types for LinkedIn API responses
// ---------------------------------------------------------------------------

interface LinkedInTokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface LinkedInUserInfoResponse {
  sub?: string;
}

interface LinkedInUgcPostErrorResponse {
  message?: string;
  serviceErrorCode?: number;
  status?: number;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // Build a mutable response so iron-session can update the cookie
  const mutableResponse = new Response();

  // --- Step 1: Read tokens — return 401 if missing (Requirements 9.2, 9.3) ---
  let tokens = await getLinkedInTokens(request, mutableResponse);

  if (!tokens) {
    return NextResponse.json(
      { error: 'Please connect your LinkedIn account in Settings before posting.' },
      { status: 401 }
    );
  }

  let { accessToken, refreshToken, accountName } = tokens;

  // --- Step 2: Attempt token refresh if needed (Requirement 4.6) ---
  // We optimistically try the post first; if we get a 401 from LinkedIn we refresh.
  // However, the design says "if access token is expired, attempt refresh before posting".
  // Since we have no expiry timestamp stored, we attempt the post and refresh on 401.
  // The refresh logic is encapsulated in a helper below.

  // --- Step 3: Read content from request body ---
  let content: string;
  try {
    const body = (await request.json()) as { content?: unknown };
    if (typeof body.content !== 'string' || body.content.trim() === '') {
      return NextResponse.json(
        { error: 'Missing or empty "content" field in request body.' },
        { status: 400 }
      );
    }
    content = body.content;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // --- Step 4: Fetch the user's LinkedIn person URN ---
  let personUrn: string;
  try {
    const userInfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (userInfoRes.status === 401) {
      // Access token expired — attempt refresh (Requirement 4.6)
      const refreshed = await attemptTokenRefresh(
        refreshToken,
        request,
        mutableResponse,
        accountName
      );

      if (!refreshed) {
        // Refresh failed — clear tokens and treat as disconnected
        await clearLinkedInTokens(request, mutableResponse);
        return NextResponse.json(
          {
            error:
              'Your LinkedIn session has expired. Please reconnect in Settings.',
          },
          { status: 401 }
        );
      }

      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;

      // Retry userinfo with new token
      const retryUserInfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!retryUserInfoRes.ok) {
        return NextResponse.json(
          { error: 'Failed to retrieve LinkedIn profile. Please try again.' },
          { status: 500 }
        );
      }

      const retryUserInfo = (await retryUserInfoRes.json()) as LinkedInUserInfoResponse;
      if (!retryUserInfo.sub) {
        return NextResponse.json(
          { error: 'Failed to retrieve LinkedIn profile identifier. Please try again.' },
          { status: 500 }
        );
      }
      personUrn = `urn:li:person:${retryUserInfo.sub}`;
    } else if (!userInfoRes.ok) {
      return NextResponse.json(
        { error: 'Failed to retrieve LinkedIn profile. Please try again.' },
        { status: 500 }
      );
    } else {
      const userInfo = (await userInfoRes.json()) as LinkedInUserInfoResponse;
      if (!userInfo.sub) {
        return NextResponse.json(
          { error: 'Failed to retrieve LinkedIn profile identifier. Please try again.' },
          { status: 500 }
        );
      }
      personUrn = `urn:li:person:${userInfo.sub}`;
    }
  } catch (err) {
    console.error('[post/linkedin] Failed to fetch userinfo:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve LinkedIn profile. Please try again.' },
      { status: 500 }
    );
  }

  // --- Step 5: Post to LinkedIn ugcPosts (Requirement 4.1) ---
  const ugcPostBody = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  let postResponse: globalThis.Response;
  try {
    postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(ugcPostBody),
    });
  } catch (err) {
    console.error('[post/linkedin] Network error calling ugcPosts:', err);
    return NextResponse.json(
      { error: 'Failed to post to LinkedIn. Please try again.' },
      { status: 500 }
    );
  }

  if (postResponse.status === 401) {
    // Token expired mid-flow — attempt refresh and retry once (Requirement 4.6)
    const refreshed = await attemptTokenRefresh(
      refreshToken,
      request,
      mutableResponse,
      accountName
    );

    if (!refreshed) {
      await clearLinkedInTokens(request, mutableResponse);
      return NextResponse.json(
        {
          error:
            'Your LinkedIn session has expired. Please reconnect in Settings.',
        },
        { status: 401 }
      );
    }

    accessToken = refreshed.accessToken;

    // Retry the post with the refreshed token
    let retryPostResponse: globalThis.Response;
    try {
      retryPostResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(ugcPostBody),
      });
    } catch (err) {
      console.error('[post/linkedin] Network error on retry ugcPosts:', err);
      return NextResponse.json(
        { error: 'Failed to post to LinkedIn. Please try again.' },
        { status: 500 }
      );
    }

    if (!retryPostResponse.ok) {
      const errorMessage = await extractLinkedInError(retryPostResponse);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // --- Step 6: Return success (Requirement 4.1) ---
    return NextResponse.json({ message: 'Posted to LinkedIn successfully' }, { status: 200 });
  }

  if (!postResponse.ok) {
    // --- Step 7: Return LinkedIn API error — no retry (Requirement 4.4) ---
    const errorMessage = await extractLinkedInError(postResponse);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  // --- Step 6: Return success ---
  return NextResponse.json({ message: 'Posted to LinkedIn successfully' }, { status: 200 });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to refresh the LinkedIn access token using the stored refresh token.
 * On success, updates the Token_Store and returns the new tokens.
 * On failure, returns null (caller should clear tokens and return 401).
 */
async function attemptTokenRefresh(
  refreshToken: string,
  request: Request,
  response: Response,
  accountName?: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[post/linkedin] Missing LinkedIn OAuth environment variables for token refresh');
    return null;
  }

  try {
    const refreshResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('[post/linkedin] Token refresh failed:', errorText);
      return null;
    }

    const refreshData = (await refreshResponse.json()) as LinkedInTokenRefreshResponse;

    if (!refreshData.access_token) {
      console.error('[post/linkedin] No access_token in refresh response');
      return null;
    }

    const newAccessToken = refreshData.access_token;
    const newRefreshToken = refreshData.refresh_token ?? refreshToken;

    // Persist the updated tokens
    await setLinkedInTokens(request, response, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accountName,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (err) {
    console.error('[post/linkedin] Token refresh network error:', err);
    return null;
  }
}

/**
 * Extract a human-readable error message from a failed LinkedIn API response.
 */
async function extractLinkedInError(response: globalThis.Response): Promise<string> {
  try {
    const errorBody = (await response.json()) as LinkedInUgcPostErrorResponse;
    return (
      errorBody.message ??
      `Failed to post to LinkedIn. Please try again. (HTTP ${response.status})`
    );
  } catch {
    return `Failed to post to LinkedIn. Please try again. (HTTP ${response.status})`;
  }
}
