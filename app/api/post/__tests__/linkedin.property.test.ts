/**
 * @jest-environment node
 */
// Feature: social-media-posting, Property 8: Unauthenticated post requests return 401

import * as fc from 'fast-check';

/**
 * Validates: Requirements 9.2, 9.3
 *
 * Property 8: Unauthenticated post requests return 401
 * For any POST request to `/api/post/linkedin` made without a valid server-side
 * session containing tokens, the route returns a 401 response and makes no call
 * to the external LinkedIn API.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that use them
// ---------------------------------------------------------------------------

const mockGetLinkedInTokens = jest.fn();
const mockSetLinkedInTokens = jest.fn();
const mockClearLinkedInTokens = jest.fn();

jest.mock('@/lib/tokenStore', () => ({
  getLinkedInTokens: (...args: unknown[]) => mockGetLinkedInTokens(...args),
  setLinkedInTokens: (...args: unknown[]) => mockSetLinkedInTokens(...args),
  clearLinkedInTokens: (...args: unknown[]) => mockClearLinkedInTokens(...args),
}));

// Mock global fetch so no real external calls are made
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import the route handler AFTER mocks are set up
import { POST } from '../linkedin/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a POST Request for the LinkedIn post route with the given body content.
 */
function makePostRequest(content: string): Request {
  return new Request('http://localhost/api/post/linkedin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-session-secret-at-least-32-chars!!';
  process.env.LINKEDIN_CLIENT_ID = 'test-client-id';
  process.env.LINKEDIN_CLIENT_SECRET = 'test-client-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  // Default: no tokens in session (unauthenticated)
  mockGetLinkedInTokens.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// Property 8: Unauthenticated post requests return 401
// ---------------------------------------------------------------------------

describe('Property 8: Unauthenticated post requests return 401', () => {
  it(
    'returns 401 for any POST request when no LinkedIn tokens are in the session',
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
          mockGetLinkedInTokens.mockResolvedValue(null);

          const request = makePostRequest(content);
          const response = await POST(request);

          // Must return 401 (Requirement 9.3)
          expect(response.status).toBe(401);

          // External LinkedIn API must NOT have been called (Requirement 9.3)
          expect(mockFetch).not.toHaveBeenCalled();
        }),
        { numRuns: 25 }
      );
    }
  );

  it(
    'returns 401 and makes no external API call when token store returns null for any content',
    async () => {
      // Generate a variety of content shapes: empty-ish strings, long strings, special chars
      const contentArb = fc.oneof(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.fullUnicodeString({ minLength: 1, maxLength: 200 }),
        fc.constant('Hello LinkedIn!'),
        fc.constant('A'.repeat(500))
      );

      await fc.assert(
        fc.asyncProperty(contentArb, async (content) => {
          jest.clearAllMocks();
          mockFetch.mockReset();

          // Simulate missing tokens (Requirement 9.2: no valid token in Token_Store)
          mockGetLinkedInTokens.mockResolvedValue(null);

          const request = makePostRequest(content);
          const response = await POST(request);

          // Route must return 401 (Requirement 9.3)
          expect(response.status).toBe(401);

          // No call to any LinkedIn endpoint (Requirement 9.3)
          expect(mockFetch).not.toHaveBeenCalledWith(
            expect.stringContaining('linkedin.com'),
            expect.anything()
          );
        }),
        { numRuns: 25 }
      );
    }
  );

  it(
    'returns 401 regardless of what content is sent when session has no tokens',
    async () => {
      // Test with structured content objects that might look like valid posts
      const contentArb = fc.record({
        text: fc.string({ minLength: 1, maxLength: 300 }),
      });

      await fc.assert(
        fc.asyncProperty(contentArb, async ({ text }) => {
          jest.clearAllMocks();
          mockFetch.mockReset();

          mockGetLinkedInTokens.mockResolvedValue(null);

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
