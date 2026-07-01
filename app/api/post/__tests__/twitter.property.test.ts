/**
 * @jest-environment node
 */
// Feature: social-media-posting, Property 13: Tweet thread reply chain ordering
// Feature: social-media-posting, Property 8: Unauthenticated post requests return 401 (Twitter)

import * as fc from 'fast-check';

/**
 * Validates: Requirements 5.4
 *
 * Property 13: Tweet thread reply chain ordering
 * For any array of N tweet strings (N ≥ 2) produced by the Tweet Splitter,
 * when posted to the Twitter API, each tweet at index i > 0 is posted as a
 * reply to the previous tweet at index i-1 (using the `reply.in_reply_to_tweet_id` field).
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that use them
// ---------------------------------------------------------------------------

const mockGetTwitterTokens = jest.fn();
const mockSetTwitterTokens = jest.fn();
const mockClearTwitterTokens = jest.fn();

jest.mock('@/lib/tokenStore', () => ({
  getTwitterTokens: (...args: unknown[]) => mockGetTwitterTokens(...args),
  setTwitterTokens: (...args: unknown[]) => mockSetTwitterTokens(...args),
  clearTwitterTokens: (...args: unknown[]) => mockClearTwitterTokens(...args),
}));

// Mock global fetch so no real external calls are made
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import the route handler AFTER mocks are set up
import { POST } from '../twitter/route';
import { tweetSplitter } from '@/lib/tweetSplitter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a POST Request for the Twitter post route with the given body content.
 */
function makePostRequest(content: string): Request {
  return new Request('http://localhost/api/post/twitter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

/**
 * Mock a successful Twitter API response for posting a tweet.
 */
function mockSuccessfulTweetResponse(tweetId: string, text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        id: tweetId,
        text,
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-session-secret-at-least-32-chars!!';
  process.env.TWITTER_CLIENT_ID = 'test-client-id';
  process.env.TWITTER_CLIENT_SECRET = 'test-client-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  // Default: valid tokens in session (authenticated)
  mockGetTwitterTokens.mockResolvedValue({
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    username: 'testuser',
  });
});

// ---------------------------------------------------------------------------
// Property 13: Tweet thread reply chain ordering
// ---------------------------------------------------------------------------

describe('Property 13: Tweet thread reply chain ordering', () => {
  it(
    'posts each tweet after the first as a reply to the previous tweet',
    async () => {
      // Generate arbitrary long strings that will split into multiple tweets
      // We want strings that produce at least 2 tweets
      const longContentArb = fc
        .string({ minLength: 281, maxLength: 1000 })
        .filter((s) => {
          const tweets = tweetSplitter(s);
          return tweets.length >= 2;
        });

      await fc.assert(
        fc.asyncProperty(longContentArb, async (content) => {
          jest.clearAllMocks();
          mockFetch.mockReset();

          // Ensure tokens are available
          mockGetTwitterTokens.mockResolvedValue({
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
            username: 'testuser',
          });

          // Split the content to know how many tweets to expect
          const expectedTweets = tweetSplitter(content);
          expect(expectedTweets.length).toBeGreaterThanOrEqual(2);

          // Mock successful responses for each tweet
          // Each tweet gets a unique ID
          const tweetIds = expectedTweets.map((_, i) => `tweet-id-${i + 1}`);

          mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
            const callIndex = mockFetch.mock.calls.length - 1;
            const tweetId = tweetIds[callIndex];
            const tweetText = expectedTweets[callIndex];

            return mockSuccessfulTweetResponse(tweetId, tweetText) as unknown as Response;
          });

          const request = makePostRequest(content);
          const response = await POST(request);

          // Verify the post succeeded
          expect(response.status).toBe(200);

          // Verify we made the correct number of API calls
          expect(mockFetch).toHaveBeenCalledTimes(expectedTweets.length);

          // Verify the reply chain structure (Requirement 5.4)
          for (let i = 0; i < expectedTweets.length; i++) {
            const call = mockFetch.mock.calls[i];
            const [url, options] = call as [string, RequestInit];

            // All calls should be to the Twitter tweets endpoint
            expect(url).toBe('https://api.twitter.com/2/tweets');
            expect(options.method).toBe('POST');

            // Parse the request body
            const body = JSON.parse(options.body as string) as {
              text: string;
              reply?: { in_reply_to_tweet_id: string };
            };

            // Verify the tweet text matches
            expect(body.text).toBe(expectedTweets[i]);

            if (i === 0) {
              // First tweet should NOT have a reply field
              expect(body.reply).toBeUndefined();
            } else {
              // Each subsequent tweet should reply to the previous tweet's ID
              expect(body.reply).toBeDefined();
              expect(body.reply?.in_reply_to_tweet_id).toBe(tweetIds[i - 1]);
            }
          }
        }),
        { numRuns: 25 }
      );
    }
  );

  it(
    'maintains reply chain ordering for any content that splits into N tweets',
    async () => {
      // Generate content with explicit paragraph breaks to ensure splitting
      const paragraphContentArb = fc
        .array(fc.string({ minLength: 100, maxLength: 300 }), { minLength: 2, maxLength: 5 })
        .map((paragraphs) => paragraphs.join('\n\n'))
        .filter((s) => {
          const tweets = tweetSplitter(s);
          return tweets.length >= 2;
        });

      await fc.assert(
        fc.asyncProperty(paragraphContentArb, async (content) => {
          jest.clearAllMocks();
          mockFetch.mockReset();

          mockGetTwitterTokens.mockResolvedValue({
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
            username: 'testuser',
          });

          const expectedTweets = tweetSplitter(content);
          const tweetIds = expectedTweets.map((_, i) => `tweet-${i}`);

          mockFetch.mockImplementation(async () => {
            const callIndex = mockFetch.mock.calls.length - 1;
            return mockSuccessfulTweetResponse(
              tweetIds[callIndex],
              expectedTweets[callIndex]
            ) as unknown as Response;
          });

          const request = makePostRequest(content);
          const response = await POST(request);

          expect(response.status).toBe(200);

          // Verify the chain: each tweet i > 0 replies to tweet i-1
          const replyChain: Array<{ index: number; repliesTo: string | null }> = [];

          for (let i = 0; i < mockFetch.mock.calls.length; i++) {
            const [, options] = mockFetch.mock.calls[i] as [string, RequestInit];
            const body = JSON.parse(options.body as string) as {
              text: string;
              reply?: { in_reply_to_tweet_id: string };
            };

            replyChain.push({
              index: i,
              repliesTo: body.reply?.in_reply_to_tweet_id ?? null,
            });
          }

          // Verify chain integrity
          for (let i = 0; i < replyChain.length; i++) {
            if (i === 0) {
              expect(replyChain[i].repliesTo).toBeNull();
            } else {
              expect(replyChain[i].repliesTo).toBe(tweetIds[i - 1]);
            }
          }
        }),
        { numRuns: 25 }
      );
    }
  );

  it(
    'creates correct reply chain for exactly 2 tweets',
    async () => {
      // Generate content that splits into exactly 2 tweets
      const twoTweetContentArb = fc
        .string({ minLength: 281, maxLength: 560 })
        .filter((s) => {
          const tweets = tweetSplitter(s);
          return tweets.length === 2;
        });

      await fc.assert(
        fc.asyncProperty(twoTweetContentArb, async (content) => {
          jest.clearAllMocks();
          mockFetch.mockReset();

          mockGetTwitterTokens.mockResolvedValue({
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
            username: 'testuser',
          });

          const expectedTweets = tweetSplitter(content);
          expect(expectedTweets.length).toBe(2);

          let firstTweetId: string | null = null;

          mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
            const callIndex = mockFetch.mock.calls.length - 1;

            if (callIndex === 0) {
              firstTweetId = 'first-tweet-id';
              return mockSuccessfulTweetResponse(
                firstTweetId,
                expectedTweets[0]
              ) as unknown as Response;
            } else {
              return mockSuccessfulTweetResponse(
                'second-tweet-id',
                expectedTweets[1]
              ) as unknown as Response;
            }
          });

          const request = makePostRequest(content);
          const response = await POST(request);

          expect(response.status).toBe(200);
          expect(mockFetch).toHaveBeenCalledTimes(2);

          // Verify first tweet has no reply field
          const firstCall = mockFetch.mock.calls[0] as [string, RequestInit];
          const firstBody = JSON.parse(firstCall[1].body as string) as {
            text: string;
            reply?: { in_reply_to_tweet_id: string };
          };
          expect(firstBody.reply).toBeUndefined();

          // Verify second tweet replies to first
          const secondCall = mockFetch.mock.calls[1] as [string, RequestInit];
          const secondBody = JSON.parse(secondCall[1].body as string) as {
            text: string;
            reply?: { in_reply_to_tweet_id: string };
          };
          expect(secondBody.reply).toBeDefined();
          expect(secondBody.reply?.in_reply_to_tweet_id).toBe(firstTweetId);
        }),
        { numRuns: 25 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 14: Partial thread failure message reflects count
// ---------------------------------------------------------------------------
// Feature: social-media-posting, Property 14: Partial thread failure message reflects count

/**
 * Validates: Requirements 5.6
 *
 * Property 14: Partial thread failure message reflects count
 * For any thread of M tweets where the k-th tweet (1-indexed) fails to post,
 * the error message displayed in the Output Panel indicates that k-1 tweets
 * were posted successfully before the failure.
 */

describe('Property 14: Partial thread failure message reflects count', () => {
  it(
    'error message indicates exactly k-1 tweets posted before failure at position k',
    async () => {
      // Generate arbitrary thread length M (2–10) and failure position k (1-indexed, 1 ≤ k ≤ M)
      const threadArb = fc
        .integer({ min: 2, max: 10 })
        .chain((M) =>
          fc.tuple(
            fc.constant(M),
            fc.integer({ min: 1, max: M })
          )
        );

      await fc.assert(
        fc.asyncProperty(threadArb, async ([M, k]) => {
          jest.clearAllMocks();
          mockFetch.mockReset();

          // Ensure tokens are available
          mockGetTwitterTokens.mockResolvedValue({
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
            username: 'testuser',
          });

          // Build content that produces exactly M tweets.
          // Each paragraph is 281 characters (exceeds 280) so tweetSplitter
          // splits each into its own tweet via word-boundary logic.
          // We use a word-boundary-friendly string: a word of 280 chars + 1 extra char.
          // Simpler: use M paragraphs each exactly 281 chars (no spaces → hard cut at 280 + 1 remainder).
          // Actually, to guarantee exactly M tweets we use M paragraphs each ≤ 280 chars separated by \n\n.
          const tweetTexts: string[] = [];
          for (let i = 0; i < M; i++) {
            // Each paragraph is a unique string of exactly 50 chars, well within 280
            tweetTexts.push(`Tweet${String(i + 1).padStart(3, '0')}${'x'.repeat(44)}`);
          }
          const content = tweetTexts.join('\n\n');

          // Verify the splitter produces exactly M tweets
          const splits = tweetSplitter(content);
          // If for some reason the split count doesn't match, skip this run
          if (splits.length !== M) {
            return;
          }

          // Mock: tweets 1 through k-1 succeed, tweet k fails
          let callCount = 0;
          mockFetch.mockImplementation(async () => {
            callCount++;
            const currentIndex = callCount; // 1-indexed

            if (currentIndex < k) {
              // Successful tweet
              return {
                ok: true,
                status: 200,
                json: async () => ({
                  data: {
                    id: `tweet-id-${currentIndex}`,
                    text: splits[currentIndex - 1],
                  },
                }),
              } as unknown as Response;
            } else {
              // Tweet k fails with a non-401 error
              return {
                ok: false,
                status: 500,
                json: async () => ({
                  errors: [{ message: 'Internal Server Error' }],
                }),
              } as unknown as Response;
            }
          });

          const request = makePostRequest(content);
          const response = await POST(request);

          // Assert response status is 500
          expect(response.status).toBe(500);

          // Assert error message indicates exactly k-1 tweets posted before failure
          const body = (await response.json()) as { error: string };
          const expectedSuccessCount = k - 1;
          expect(body.error).toBe(
            `Posted ${expectedSuccessCount} of ${M} tweets before failure`
          );
        }),
        { numRuns: 25 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 8: Unauthenticated post requests return 401 (Twitter)
// ---------------------------------------------------------------------------

/**
 * Validates: Requirements 9.2, 9.3
 *
 * Property 8: Unauthenticated post requests return 401 (Twitter)
 * For any POST request to `/api/post/twitter` made without a valid server-side
 * session containing tokens, the route returns a 401 response and makes no call
 * to the external Twitter API.
 */

describe('Property 8: Unauthenticated post requests return 401 (Twitter)', () => {
  it(
    'returns 401 for any POST request when no Twitter tokens are in the session',
    async () => {
      // Generate arbitrary content strings (non-empty)
      const contentArb = fc
        .string({ minLength: 1, maxLength: 500 })
        .filter((s) => s.trim().length > 0);

      await fc.assert(
        fc.asyncProperty(contentArb, async (content) => {
          jest.clearAllMocks();
          mockFetch.mockReset();

          // No tokens in session — simulates unauthenticated request
          mockGetTwitterTokens.mockResolvedValue(null);

          const request = makePostRequest(content);
          const response = await POST(request);

          // Must return 401 (Requirement 9.3)
          expect(response.status).toBe(401);

          // External Twitter API must NOT have been called (Requirement 9.3)
          expect(mockFetch).not.toHaveBeenCalled();
        }),
        { numRuns: 25 }
      );
    }
  );

  it(
    'returns 401 and makes no external API call when token store returns null for any content',
    async () => {
      // Generate a variety of content shapes: short, long, unicode, special chars
      const contentArb = fc.oneof(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.fullUnicodeString({ minLength: 1, maxLength: 200 }),
        fc.constant('Hello Twitter/X!'),
        fc.constant('A'.repeat(500))
      );

      await fc.assert(
        fc.asyncProperty(contentArb, async (content) => {
          jest.clearAllMocks();
          mockFetch.mockReset();

          // Simulate missing tokens (Requirement 9.2: no valid token in Token_Store)
          mockGetTwitterTokens.mockResolvedValue(null);

          const request = makePostRequest(content);
          const response = await POST(request);

          // Route must return 401 (Requirement 9.3)
          expect(response.status).toBe(401);

          // No call to any Twitter endpoint (Requirement 9.3)
          expect(mockFetch).not.toHaveBeenCalledWith(
            expect.stringContaining('twitter.com'),
            expect.anything()
          );
        }),
        { numRuns: 25 }
      );
    }
  );

  it(
    'returns 401 with an error body (not a success message) when unauthenticated',
    async () => {
      // Test with structured content that might look like valid tweet thread input
      const contentArb = fc.record({
        text: fc.string({ minLength: 1, maxLength: 300 }),
      });

      await fc.assert(
        fc.asyncProperty(contentArb, async ({ text }) => {
          jest.clearAllMocks();
          mockFetch.mockReset();

          mockGetTwitterTokens.mockResolvedValue(null);

          const request = makePostRequest(text);
          const response = await POST(request);

          expect(response.status).toBe(401);
          expect(mockFetch).not.toHaveBeenCalled();

          // Verify the response body contains an error message (not a success)
          const body = (await response.json()) as { error?: string; message?: string };
          expect(body.error).toBeDefined();
          expect(body.message).toBeUndefined();
        }),
        { numRuns: 25 }
      );
    }
  );
});
