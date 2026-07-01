/**
 * @jest-environment node
 */
// Feature: social-media-posting, Property 6: CSRF state validation rejects mismatched state

import * as fc from 'fast-check';

/**
 * Validates: Requirements 7.6
 *
 * Property 6: CSRF state validation rejects mismatched state
 * For any OAuth callback request where the `state` query parameter does not match
 * the `state` stored in the session, the callback route returns an error response
 * and does not store any tokens in the Token_Store.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that use them
// ---------------------------------------------------------------------------

const mockSessionSave = jest.fn();
const mockGetIronSession = jest.fn();
const mockSetLinkedInTokens = jest.fn();

jest.mock('iron-session', () => ({
  getIronSession: (...args: unknown[]) => mockGetIronSession(...args),
}));

jest.mock('@/lib/tokenStore', () => ({
  sessionOptions: { cookieName: 'cg_session', password: 'test-secret' },
  setLinkedInTokens: (...args: unknown[]) => mockSetLinkedInTokens(...args),
}));

// Mock global fetch so the LinkedIn token endpoint is never called
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import the route handler AFTER mocks are set up
import { GET } from '../callback/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Request object for the callback route.
 */
function makeCallbackRequest(stateParam: string, code = 'auth-code-123'): Request {
  const url = new URL('http://localhost/api/auth/linkedin/callback');
  url.searchParams.set('code', code);
  url.searchParams.set('state', stateParam);
  return new Request(url.toString());
}

/**
 * Configure the iron-session mock to return a session with the given stored state.
 */
function mockSessionWithState(storedState: string | undefined): void {
  const sessionData: Record<string, unknown> = {
    linkedinOAuthState: storedState,
  };
  mockGetIronSession.mockResolvedValue({
    ...sessionData,
    save: mockSessionSave,
  });
}

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  process.env.LINKEDIN_CLIENT_ID = 'test-client-id';
  process.env.LINKEDIN_CLIENT_SECRET = 'test-client-secret';
  process.env.LINKEDIN_REDIRECT_URI = 'http://localhost:3000/api/auth/linkedin/callback';
  process.env.SESSION_SECRET = 'test-session-secret-at-least-32-chars!!';
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// Property 6: CSRF state validation rejects mismatched state
// ---------------------------------------------------------------------------

describe('Property 6: CSRF state validation rejects mismatched state', () => {
  it(
    'returns 400 and does not store tokens when state param does not match session state',
    async () => {
      // Arbitrary string generator for state values (non-empty hex-like strings)
      const stateArb = fc.hexaString({ minLength: 8, maxLength: 64 });

      // Generate pairs of state values that are guaranteed to be different
      const mismatchedStatePairArb = fc
        .tuple(stateArb, stateArb)
        .filter(([a, b]) => a !== b);

      await fc.assert(
        fc.asyncProperty(
          mismatchedStatePairArb,
          async ([sessionState, requestState]) => {
            jest.clearAllMocks();
            mockFetch.mockReset();

            // Set up session with a stored state that differs from the request state
            mockSessionWithState(sessionState);

            const request = makeCallbackRequest(requestState);
            const response = await GET(request);

            // Must return 400 (CSRF validation failure)
            expect(response.status).toBe(400);

            // Token store must NOT have been called
            expect(mockSetLinkedInTokens).not.toHaveBeenCalled();

            // LinkedIn token endpoint must NOT have been called
            expect(mockFetch).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 25 }
      );
    }
  );

  it(
    'returns 400 and does not store tokens when session has no stored state',
    async () => {
      const stateArb = fc.hexaString({ minLength: 8, maxLength: 64 });

      await fc.assert(
        fc.asyncProperty(
          stateArb, // any request state param
          async (requestState) => {
            jest.clearAllMocks();
            mockFetch.mockReset();

            // Session has no stored state (undefined)
            mockSessionWithState(undefined);

            const request = makeCallbackRequest(requestState);
            const response = await GET(request);

            // Must return 400
            expect(response.status).toBe(400);

            // Token store must NOT have been called
            expect(mockSetLinkedInTokens).not.toHaveBeenCalled();

            // LinkedIn token endpoint must NOT have been called
            expect(mockFetch).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 25 }
      );
    }
  );
});
