/**
 * app/api/post/twitter/route.ts
 *
 * Publishes content to Twitter/X as a tweet thread on behalf of the authenticated user.
 *
 * Steps:
 *  1. Read Twitter tokens from Token_Store — return 401 if missing
 *  2. If access token is expired, attempt refresh; update stored tokens;
 *     clear tokens and return 401 if refresh fails
 *  3. Read `content` from request body — return 400 if missing/empty or invalid JSON
 *  4. Call tweetSplitter(content) to get ordered array of tweet strings
 *  5. Post first tweet via POST https://api.twitter.com/2/tweets with Bearer token
 *  6. Post each subsequent tweet as a reply to the previous tweet's id
 *  7. If any tweet fails, return 500 { "error": "Posted N of M tweets before failure" }
 *  8. Return 200 { "message": "Thread posted successfully (N tweets)" } on full success
 *
 * Requirements: 5.1, 5.4, 5.5, 5.6, 5.9, 9.1, 9.2, 9.3
 */

import { NextResponse } from 'next/server';
import {
  getTwitterTokens,
  setTwitterTokens,
  clearTwitterTokens,
} from '@/lib/tokenStore';
import { tweetSplitter } from '@/lib/tweetSplitter';

// ---------------------------------------------------------------------------
// Types for Twitter API responses
// ---------------------------------------------------------------------------

interface TwitterTokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
}

interface TwitterTweetResponse {
  data?: {
    id: string;
    text: string;
  };
  errors?: Array<{ message: string }>;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // Build a mutable response so iron-session can update the cookie
  const mutableResponse = new Response();

  // --- Step 1: Read tokens — return 401 if missing (Requirements 9.2, 9.3) ---
  let tokens = await getTwitterTokens(request, mutableResponse);

  if (!tokens) {
    return NextResponse.json(
      { error: 'Please connect your Twitter/X account in Settings before posting.' },
      { status: 401 }
    );
  }

  let { accessToken, refreshToken, username } = tokens;

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

  // --- Step 4: Split content into tweets ---
  const tweets = tweetSplitter(content);

  if (tweets.length === 0) {
    return NextResponse.json(
      { error: 'Missing or empty "content" field in request body.' },
      { status: 400 }
    );
  }

  const totalTweets = tweets.length;

  // --- Step 2: Check token validity by attempting the first tweet ---
  // We attempt the post and refresh on 401 (no expiry timestamp stored).

  // Helper to post a single tweet
  async function postTweet(
    text: string,
    replyToId: string | null,
    token: string
  ): Promise<TwitterTweetResponse | null> {
    const body: Record<string, unknown> = { text };
    if (replyToId) {
      body.reply = { in_reply_to_tweet_id: replyToId };
    }

    try {
      const res = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        // Signal token expiry
        return null;
      }

      const data = (await res.json()) as TwitterTweetResponse;

      if (!res.ok || !data.data?.id) {
        throw new Error(
          data.errors?.[0]?.message ?? `Twitter API error (HTTP ${res.status})`
        );
      }

      return data;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Twitter API error')) {
        throw err;
      }
      throw new Error('Network error calling Twitter API');
    }
  }

  // --- Steps 5 & 6: Post tweets in sequence ---
  let previousTweetId: string | null = null;
  let postedCount = 0;

  for (let i = 0; i < tweets.length; i++) {
    const tweetText = tweets[i];
    let tweetResult: TwitterTweetResponse | null;

    try {
      tweetResult = await postTweet(tweetText, previousTweetId, accessToken);
    } catch {
      // Non-401 failure
      return NextResponse.json(
        { error: `Posted ${postedCount} of ${totalTweets} tweets before failure` },
        { status: 500 }
      );
    }

    if (tweetResult === null) {
      // 401 — attempt token refresh (Requirement 5.9)
      const refreshed = await attemptTokenRefresh(
        refreshToken,
        request,
        mutableResponse,
        username
      );

      if (!refreshed) {
        await clearTwitterTokens(request, mutableResponse);
        return NextResponse.json(
          {
            error:
              'Your Twitter/X session has expired. Please reconnect in Settings.',
          },
          { status: 401 }
        );
      }

      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;

      // Retry the current tweet with the refreshed token
      try {
        tweetResult = await postTweet(tweetText, previousTweetId, accessToken);
      } catch {
        return NextResponse.json(
          { error: `Posted ${postedCount} of ${totalTweets} tweets before failure` },
          { status: 500 }
        );
      }

      if (tweetResult === null || !tweetResult.data?.id) {
        return NextResponse.json(
          { error: `Posted ${postedCount} of ${totalTweets} tweets before failure` },
          { status: 500 }
        );
      }
    }

    previousTweetId = tweetResult.data!.id;
    postedCount++;
  }

  // --- Step 8: Return success ---
  return NextResponse.json(
    { message: `Thread posted successfully (${totalTweets} tweets)` },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to refresh the Twitter/X access token using the stored refresh token.
 * On success, updates the Token_Store and returns the new tokens.
 * On failure, returns null (caller should clear tokens and return 401).
 */
async function attemptTokenRefresh(
  refreshToken: string,
  request: Request,
  response: Response,
  username?: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[post/twitter] Missing Twitter OAuth environment variables for token refresh');
    return null;
  }

  // Twitter requires Basic auth: Authorization: Basic base64(clientId:clientSecret)
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const refreshResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('[post/twitter] Token refresh failed:', errorText);
      return null;
    }

    const refreshData = (await refreshResponse.json()) as TwitterTokenRefreshResponse;

    if (!refreshData.access_token) {
      console.error('[post/twitter] No access_token in refresh response');
      return null;
    }

    const newAccessToken = refreshData.access_token;
    const newRefreshToken = refreshData.refresh_token ?? refreshToken;

    // Persist the updated tokens
    await setTwitterTokens(request, response, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      username,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (err) {
    console.error('[post/twitter] Token refresh network error:', err);
    return null;
  }
}
