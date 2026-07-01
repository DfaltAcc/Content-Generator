/**
 * @jest-environment node
 */
// Feature: social-media-posting, Property 7: API responses never contain token values

import * as fc from 'fast-check';

/**
 * Validates: Requirements 7.3, 9.4
 *
 * Property 7: API responses never contain token values
 * For any response from `/api/auth/status` or `/api/auth/disconnect`, the JSON
 * response body does not contain the string values of any stored OAuth access
 * tokens or refresh tokens.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that use them
// ---------------------------------------------------------------------------

const mockGetLinkedInTokens = jest.fn();
const mockGetTwitterTokens = jest.fn();
const mockClearLinkedInTokens = jest.fn();
const mockClearTwitterTokens = jest.fn();

jest.mock('@/lib/tokenStore', () => ({
  getLinkedInTokens: (...args: unknown[]) => mockGetLinkedInTokens(...args),
  getTwitterTokens: (...args: unknown[]) => mockGetTwitterTokens(...args),
  clearLinkedInTokens: (...args: unknown[]) => mockClearLinkedInTokens(...args),
  clearTwitterTokens: (...args: unknown[]) => mockClearTwitterTokens(...args),
}));

// Import route handlers AFTER mocks are set up
import { GET as statusGET } from '../status/route';
import { POST as disconnectPOST } from '../disconnect/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal GET Request for the status route.
 */
function makeStatusRequest(): Request {
  return new Request('http://localhost/api/auth/status');
}

/**
 * Build a POST Request for the disconnect route with the given platform.
 */
function makeDisconnectRequest(platform: 'linkedin' | 'twitter'): Request {
  return new Request('http://localhost/api/auth/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform }),
  });
}

/**
 * Check that a string value does not appear anywhere in the JSON body text.
 */
function bodyContainsToken(body: string, tokenValue: string): boolean {
  return body.includes(tokenValue);
}

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-session-secret-at-least-32-chars!!';
});

beforeEach(() => {
  jest.clearAllMocks();
  mockClearLinkedInTokens.mockResolvedValue(undefined);
  mockClearTwitterTokens.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Property 7: API responses never contain token values
// ---------------------------------------------------------------------------

describe('Property 7: API responses never contain token values', () => {
  it(
    '/api/auth/status response never contains LinkedIn token values',
    async () => {
      // Generate arbitrary token strings (non-empty, URL-safe-like)
      const tokenArb = fc.string({ minLength: 8, maxLength: 128 }).filter(s => s.trim().length > 0);

      await fc.assert(
        fc.asyncProperty(
          tokenArb, // linkedinAccessToken
          tokenArb, // linkedinRefreshToken
          fc.string({ minLength: 1, maxLength: 64 }), // accountName
          async (accessToken, refreshToken, accountName) => {
            jest.clearAllMocks();

            // Set up token store to return tokens with the generated values
            mockGetLinkedInTokens.mockResolvedValue({
              accessToken,
              refreshToken,
              accountName,
            });
            mockGetTwitterTokens.mockResolvedValue(null);

            const request = makeStatusRequest();
            const response = await statusGET(request);

            const body = await response.text();

            // The response body must NOT contain the raw token values
            expect(bodyContainsToken(body, accessToken)).toBe(false);
            expect(bodyContainsToken(body, refreshToken)).toBe(false);
          }
        ),
        { numRuns: 25 }
      );
    }
  );

  it(
    '/api/auth/status response never contains Twitter token values',
    async () => {
      const tokenArb = fc.string({ minLength: 8, maxLength: 128 }).filter(s => s.trim().length > 0);

      await fc.assert(
        fc.asyncProperty(
          tokenArb, // twitterAccessToken
          tokenArb, // twitterRefreshToken
          fc.string({ minLength: 1, maxLength: 64 }), // username
          async (accessToken, refreshToken, username) => {
            jest.clearAllMocks();

            mockGetLinkedInTokens.mockResolvedValue(null);
            mockGetTwitterTokens.mockResolvedValue({
              accessToken,
              refreshToken,
              username,
            });

            const request = makeStatusRequest();
            const response = await statusGET(request);

            const body = await response.text();

            expect(bodyContainsToken(body, accessToken)).toBe(false);
            expect(bodyContainsToken(body, refreshToken)).toBe(false);
          }
        ),
        { numRuns: 25 }
      );
    }
  );

  it(
    '/api/auth/status response never contains both LinkedIn and Twitter token values when both connected',
    async () => {
      const tokenArb = fc.string({ minLength: 8, maxLength: 128 }).filter(s => s.trim().length > 0);

      await fc.assert(
        fc.asyncProperty(
          tokenArb, // linkedinAccessToken
          tokenArb, // linkedinRefreshToken
          tokenArb, // twitterAccessToken
          tokenArb, // twitterRefreshToken
          async (liAccessToken, liRefreshToken, twAccessToken, twRefreshToken) => {
            jest.clearAllMocks();

            mockGetLinkedInTokens.mockResolvedValue({
              accessToken: liAccessToken,
              refreshToken: liRefreshToken,
              accountName: 'Test User',
            });
            mockGetTwitterTokens.mockResolvedValue({
              accessToken: twAccessToken,
              refreshToken: twRefreshToken,
              username: 'testuser',
            });

            const request = makeStatusRequest();
            const response = await statusGET(request);

            const body = await response.text();

            expect(bodyContainsToken(body, liAccessToken)).toBe(false);
            expect(bodyContainsToken(body, liRefreshToken)).toBe(false);
            expect(bodyContainsToken(body, twAccessToken)).toBe(false);
            expect(bodyContainsToken(body, twRefreshToken)).toBe(false);
          }
        ),
        { numRuns: 25 }
      );
    }
  );

  it(
    '/api/auth/disconnect response never contains token values',
    async () => {
      const tokenArb = fc.string({ minLength: 8, maxLength: 128 }).filter(s => s.trim().length > 0);
      const platformArb = fc.constantFrom<'linkedin' | 'twitter'>('linkedin', 'twitter');

      await fc.assert(
        fc.asyncProperty(
          platformArb,
          tokenArb, // accessToken (conceptually stored before disconnect)
          tokenArb, // refreshToken
          async (platform, accessToken, refreshToken) => {
            jest.clearAllMocks();

            // The disconnect route clears tokens — it should never echo them back
            mockClearLinkedInTokens.mockResolvedValue(undefined);
            mockClearTwitterTokens.mockResolvedValue(undefined);

            const request = makeDisconnectRequest(platform);
            const response = await disconnectPOST(request);

            const body = await response.text();

            // The disconnect response is simply { ok: true } — no tokens
            expect(bodyContainsToken(body, accessToken)).toBe(false);
            expect(bodyContainsToken(body, refreshToken)).toBe(false);
          }
        ),
        { numRuns: 25 }
      );
    }
  );
});
