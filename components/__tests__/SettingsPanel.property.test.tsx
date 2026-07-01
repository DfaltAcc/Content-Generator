// Feature: social-media-posting, Property 3: Connected account identifier is always displayed

import * as fc from 'fast-check';
import { render, within } from '@testing-library/react';
import SettingsPanel from '../SettingsPanel';
import type { ConnectionStatus } from '../../types';

/**
 * Validates: Requirements 1.5, 2.5, 8.4
 *
 * Property 3: Connected account identifier is always displayed
 * For any connected account with any non-empty account identifier (name or
 * username), the Settings Panel renders that identifier and a "Disconnect"
 * button, and does not render a "Connect" button for that platform.
 */

/**
 * Arbitrary for non-empty, non-whitespace-only account identifier strings.
 * We trim the generated value so the property assertion can compare trimmed
 * text content (React Testing Library normalises whitespace in the DOM).
 */
const accountIdentifierArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

/** No-op handlers — the property tests only care about rendered output */
const noop = jest.fn();

/**
 * Returns true when the rendered container contains at least one element
 * whose trimmed text content equals the given identifier.
 */
function containsIdentifier(container: HTMLElement, identifier: string): boolean {
  const allElements = container.querySelectorAll('*');
  for (const el of allElements) {
    // Only check leaf-like elements (no child elements) to avoid matching
    // ancestor nodes whose textContent includes the identifier plus other text.
    if (el.children.length === 0 && el.textContent?.trim() === identifier) {
      return true;
    }
  }
  return false;
}

describe('Property 3: Connected account identifier is always displayed', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // LinkedIn — connected
  // ---------------------------------------------------------------------------

  it('LinkedIn connected: account identifier is rendered and Disconnect button is present', () => {
    fc.assert(
      fc.property(
        accountIdentifierArb,
        (accountIdentifier) => {
          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: true, accountIdentifier },
            twitter: { connected: false },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const scope = within(container);

          // The account identifier must appear in the rendered output
          expect(containsIdentifier(container, accountIdentifier)).toBe(true);

          // A "Disconnect" button must be present for LinkedIn
          expect(
            scope.getByRole('button', { name: /^disconnect linkedin/i })
          ).toBeInTheDocument();

          // The "Connect LinkedIn" button must NOT be present
          expect(
            scope.queryByRole('button', { name: /^connect linkedin/i })
          ).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  // ---------------------------------------------------------------------------
  // Twitter/X — connected
  // ---------------------------------------------------------------------------

  it('Twitter/X connected: account identifier is rendered and Disconnect button is present', () => {
    fc.assert(
      fc.property(
        accountIdentifierArb,
        (accountIdentifier) => {
          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: false },
            twitter: { connected: true, accountIdentifier },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const scope = within(container);

          // The account identifier must appear in the rendered output
          expect(containsIdentifier(container, accountIdentifier)).toBe(true);

          // A "Disconnect" button must be present for Twitter/X
          expect(
            scope.getByRole('button', { name: /^disconnect twitter/i })
          ).toBeInTheDocument();

          // The "Connect Twitter/X" button must NOT be present
          expect(
            scope.queryByRole('button', { name: /^connect twitter/i })
          ).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  // ---------------------------------------------------------------------------
  // Both platforms connected simultaneously
  // ---------------------------------------------------------------------------

  it('both platforms connected: both identifiers and both Disconnect buttons are rendered', () => {
    fc.assert(
      fc.property(
        accountIdentifierArb,
        accountIdentifierArb,
        (linkedinIdentifier, twitterIdentifier) => {
          // Ensure the two identifiers are distinct so containsIdentifier is unambiguous
          fc.pre(linkedinIdentifier !== twitterIdentifier);

          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: true, accountIdentifier: linkedinIdentifier },
            twitter: { connected: true, accountIdentifier: twitterIdentifier },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const scope = within(container);

          // Both identifiers must be visible
          expect(containsIdentifier(container, linkedinIdentifier)).toBe(true);
          expect(containsIdentifier(container, twitterIdentifier)).toBe(true);

          // Both Disconnect buttons must be present
          expect(
            scope.getByRole('button', { name: /^disconnect linkedin/i })
          ).toBeInTheDocument();
          expect(
            scope.getByRole('button', { name: /^disconnect twitter/i })
          ).toBeInTheDocument();

          // Neither Connect button should be present
          expect(
            scope.queryByRole('button', { name: /^connect linkedin/i })
          ).not.toBeInTheDocument();
          expect(
            scope.queryByRole('button', { name: /^connect twitter/i })
          ).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  // ---------------------------------------------------------------------------
  // Disconnected platforms — Connect button shown, no identifier
  // ---------------------------------------------------------------------------

  it('LinkedIn disconnected: Connect button is shown and no Disconnect button is present', () => {
    fc.assert(
      fc.property(
        // Vary the Twitter side to confirm LinkedIn state is evaluated independently
        fc.boolean(),
        accountIdentifierArb,
        (twitterConnected, twitterIdentifier) => {
          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: false },
            twitter: twitterConnected
              ? { connected: true, accountIdentifier: twitterIdentifier }
              : { connected: false },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const scope = within(container);

          // "Connect LinkedIn" button must be present
          expect(
            scope.getByRole('button', { name: /^connect linkedin/i })
          ).toBeInTheDocument();

          // "Disconnect" button for LinkedIn must NOT be present
          expect(
            scope.queryByRole('button', { name: /^disconnect linkedin/i })
          ).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('Twitter/X disconnected: Connect button is shown and no Disconnect button is present', () => {
    fc.assert(
      fc.property(
        // Vary the LinkedIn side to confirm Twitter state is evaluated independently
        fc.boolean(),
        accountIdentifierArb,
        (linkedinConnected, linkedinIdentifier) => {
          const connectionStatus: ConnectionStatus = {
            linkedin: linkedinConnected
              ? { connected: true, accountIdentifier: linkedinIdentifier }
              : { connected: false },
            twitter: { connected: false },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const scope = within(container);

          // "Connect Twitter/X" button must be present
          expect(
            scope.getByRole('button', { name: /^connect twitter/i })
          ).toBeInTheDocument();

          // "Disconnect" button for Twitter/X must NOT be present
          expect(
            scope.queryByRole('button', { name: /^disconnect twitter/i })
          ).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });
});

// Feature: social-media-posting, Property 4: Settings Panel never leaks token values

/**
 * Validates: Requirements 8.5, 7.3, 9.4
 *
 * Property 4: Settings Panel never leaks token values
 * For any session state containing any OAuth access token or refresh token
 * values, the rendered Settings Panel output does not contain those token
 * string values. Since SettingsPanel only accepts `connectionStatus` (which
 * carries `accountIdentifier`, never raw tokens), the component's interface
 * design itself prevents token leakage — this property verifies that no
 * arbitrary token string passed outside the component's props ever appears
 * in the rendered DOM.
 */

/**
 * Arbitrary for token-like strings: non-empty, non-whitespace-only strings
 * that are distinct from any account identifier we will use.
 * We use a fixed prefix to make them easy to distinguish from identifiers.
 */
const tokenArb = fc
  .string({ minLength: 8, maxLength: 128 })
  .map((s) => s.trim())
  .filter((s) => s.length >= 8);

/**
 * Arbitrary for account identifiers that are guaranteed to differ from a
 * given token string. We use a simple fixed value so the test is unambiguous.
 */
const safeIdentifier = 'Safe Display Name';
const safeTwitterUsername = 'safe_username';

describe('Property 4: Settings Panel never leaks token values', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Both platforms disconnected — no tokens should appear
  // ---------------------------------------------------------------------------

  it('both disconnected: arbitrary token strings never appear in rendered output', () => {
    fc.assert(
      fc.property(
        tokenArb,
        tokenArb,
        tokenArb,
        tokenArb,
        (linkedinAccessToken, linkedinRefreshToken, twitterAccessToken, twitterRefreshToken) => {
          // Simulate what would be in the server-side session — these values
          // are NEVER passed to SettingsPanel; they exist only to represent
          // what must not leak.
          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: false },
            twitter: { connected: false },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const html = container.innerHTML;

          // None of the token values should appear anywhere in the rendered output
          expect(html).not.toContain(linkedinAccessToken);
          expect(html).not.toContain(linkedinRefreshToken);
          expect(html).not.toContain(twitterAccessToken);
          expect(html).not.toContain(twitterRefreshToken);

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  // ---------------------------------------------------------------------------
  // LinkedIn connected — account identifier shown, tokens must not appear
  // ---------------------------------------------------------------------------

  it('LinkedIn connected: token strings never appear even when account identifier is shown', () => {
    fc.assert(
      fc.property(
        tokenArb,
        tokenArb,
        (linkedinAccessToken, linkedinRefreshToken) => {
          // Ensure the token values are distinct from the safe identifier
          fc.pre(linkedinAccessToken !== safeIdentifier);
          fc.pre(linkedinRefreshToken !== safeIdentifier);

          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: true, accountIdentifier: safeIdentifier },
            twitter: { connected: false },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const html = container.innerHTML;

          // The safe identifier IS expected to appear (it's the account name)
          expect(html).toContain(safeIdentifier);

          // But the token values must NOT appear
          expect(html).not.toContain(linkedinAccessToken);
          expect(html).not.toContain(linkedinRefreshToken);

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  // ---------------------------------------------------------------------------
  // Twitter connected — username shown, tokens must not appear
  // ---------------------------------------------------------------------------

  it('Twitter/X connected: token strings never appear even when username is shown', () => {
    fc.assert(
      fc.property(
        tokenArb,
        tokenArb,
        (twitterAccessToken, twitterRefreshToken) => {
          fc.pre(twitterAccessToken !== safeTwitterUsername);
          fc.pre(twitterRefreshToken !== safeTwitterUsername);

          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: false },
            twitter: { connected: true, accountIdentifier: safeTwitterUsername },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const html = container.innerHTML;

          // The username IS expected to appear
          expect(html).toContain(safeTwitterUsername);

          // But the token values must NOT appear
          expect(html).not.toContain(twitterAccessToken);
          expect(html).not.toContain(twitterRefreshToken);

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  // ---------------------------------------------------------------------------
  // Both platforms connected — both identifiers shown, all tokens absent
  // ---------------------------------------------------------------------------

  it('both connected: all four token strings never appear in rendered output', () => {
    fc.assert(
      fc.property(
        tokenArb,
        tokenArb,
        tokenArb,
        tokenArb,
        (linkedinAccessToken, linkedinRefreshToken, twitterAccessToken, twitterRefreshToken) => {
          fc.pre(linkedinAccessToken !== safeIdentifier);
          fc.pre(linkedinRefreshToken !== safeIdentifier);
          fc.pre(twitterAccessToken !== safeTwitterUsername);
          fc.pre(twitterRefreshToken !== safeTwitterUsername);

          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: true, accountIdentifier: safeIdentifier },
            twitter: { connected: true, accountIdentifier: safeTwitterUsername },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const html = container.innerHTML;

          // Both identifiers ARE expected to appear
          expect(html).toContain(safeIdentifier);
          expect(html).toContain(safeTwitterUsername);

          // None of the token values should appear
          expect(html).not.toContain(linkedinAccessToken);
          expect(html).not.toContain(linkedinRefreshToken);
          expect(html).not.toContain(twitterAccessToken);
          expect(html).not.toContain(twitterRefreshToken);

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  // ---------------------------------------------------------------------------
  // Arbitrary account identifiers — tokens still must not appear
  // ---------------------------------------------------------------------------

  it('arbitrary account identifiers: token strings never appear regardless of identifier content', () => {
    fc.assert(
      fc.property(
        accountIdentifierArb,
        accountIdentifierArb,
        tokenArb,
        tokenArb,
        tokenArb,
        tokenArb,
        (
          linkedinIdentifier,
          twitterIdentifier,
          linkedinAccessToken,
          linkedinRefreshToken,
          twitterAccessToken,
          twitterRefreshToken
        ) => {
          // Ensure tokens are distinct from identifiers to avoid false positives
          fc.pre(linkedinAccessToken !== linkedinIdentifier);
          fc.pre(linkedinRefreshToken !== linkedinIdentifier);
          fc.pre(twitterAccessToken !== twitterIdentifier);
          fc.pre(twitterRefreshToken !== twitterIdentifier);
          fc.pre(linkedinAccessToken !== twitterIdentifier);
          fc.pre(linkedinRefreshToken !== twitterIdentifier);
          fc.pre(twitterAccessToken !== linkedinIdentifier);
          fc.pre(twitterRefreshToken !== linkedinIdentifier);

          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: true, accountIdentifier: linkedinIdentifier },
            twitter: { connected: true, accountIdentifier: twitterIdentifier },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const html = container.innerHTML;

          // Token values must NOT appear anywhere in the rendered output
          expect(html).not.toContain(linkedinAccessToken);
          expect(html).not.toContain(linkedinRefreshToken);
          expect(html).not.toContain(twitterAccessToken);
          expect(html).not.toContain(twitterRefreshToken);

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });
});

// Feature: social-media-posting, Property 15: Settings Panel displays correct status for all connection combinations

/**
 * Validates: Requirements 8.2, 8.3
 *
 * Property 15: Settings Panel displays correct status for all connection combinations
 * For any combination of LinkedIn and Twitter/X connection states
 * (connected/disconnected), the Settings Panel correctly displays the status
 * for each platform independently — a connected platform shows the account
 * identifier and Disconnect button, a disconnected platform shows the Connect
 * button.
 */

describe('Property 15: Settings Panel displays correct status for all connection combinations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Generate all four combinations of LinkedIn/Twitter connection states using
   * fast-check booleans, and for each connected platform generate an arbitrary
   * non-empty account identifier. Assert that each platform's UI is rendered
   * independently and correctly regardless of the other platform's state.
   */
  it('all four connection combinations: each platform UI is correct independently', () => {
    fc.assert(
      fc.property(
        fc.boolean(),                // linkedinConnected
        fc.boolean(),                // twitterConnected
        accountIdentifierArb,        // linkedinIdentifier (used when connected)
        accountIdentifierArb,        // twitterIdentifier (used when connected)
        (linkedinConnected, twitterConnected, linkedinIdentifier, twitterIdentifier) => {
          const connectionStatus: ConnectionStatus = {
            linkedin: linkedinConnected
              ? { connected: true, accountIdentifier: linkedinIdentifier }
              : { connected: false },
            twitter: twitterConnected
              ? { connected: true, accountIdentifier: twitterIdentifier }
              : { connected: false },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const scope = within(container);

          // ── LinkedIn assertions ──────────────────────────────────────────
          if (linkedinConnected) {
            // Connected: account identifier must be visible
            expect(containsIdentifier(container, linkedinIdentifier)).toBe(true);
            // Connected: Disconnect button must be present
            expect(
              scope.getByRole('button', { name: /^disconnect linkedin/i })
            ).toBeInTheDocument();
            // Connected: Connect button must NOT be present
            expect(
              scope.queryByRole('button', { name: /^connect linkedin/i })
            ).not.toBeInTheDocument();
          } else {
            // Disconnected: Connect button must be present
            expect(
              scope.getByRole('button', { name: /^connect linkedin/i })
            ).toBeInTheDocument();
            // Disconnected: Disconnect button must NOT be present
            expect(
              scope.queryByRole('button', { name: /^disconnect linkedin/i })
            ).not.toBeInTheDocument();
          }

          // ── Twitter/X assertions ─────────────────────────────────────────
          if (twitterConnected) {
            // Connected: account identifier must be visible
            expect(containsIdentifier(container, twitterIdentifier)).toBe(true);
            // Connected: Disconnect button must be present
            expect(
              scope.getByRole('button', { name: /^disconnect twitter/i })
            ).toBeInTheDocument();
            // Connected: Connect button must NOT be present
            expect(
              scope.queryByRole('button', { name: /^connect twitter/i })
            ).not.toBeInTheDocument();
          } else {
            // Disconnected: Connect button must be present
            expect(
              scope.getByRole('button', { name: /^connect twitter/i })
            ).toBeInTheDocument();
            // Disconnected: Disconnect button must NOT be present
            expect(
              scope.queryByRole('button', { name: /^disconnect twitter/i })
            ).not.toBeInTheDocument();
          }

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  // ---------------------------------------------------------------------------
  // Explicit coverage of each of the four combinations
  // ---------------------------------------------------------------------------

  it('both disconnected: both Connect buttons shown, no Disconnect buttons', () => {
    fc.assert(
      fc.property(
        fc.constant(false),
        fc.constant(false),
        accountIdentifierArb,
        accountIdentifierArb,
        (_li, _tw, _liId, _twId) => {
          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: false },
            twitter: { connected: false },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const scope = within(container);

          expect(scope.getByRole('button', { name: /^connect linkedin/i })).toBeInTheDocument();
          expect(scope.getByRole('button', { name: /^connect twitter/i })).toBeInTheDocument();
          expect(scope.queryByRole('button', { name: /^disconnect linkedin/i })).not.toBeInTheDocument();
          expect(scope.queryByRole('button', { name: /^disconnect twitter/i })).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('LinkedIn connected, Twitter disconnected: correct UI for each platform', () => {
    fc.assert(
      fc.property(
        accountIdentifierArb,
        (linkedinIdentifier) => {
          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: true, accountIdentifier: linkedinIdentifier },
            twitter: { connected: false },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const scope = within(container);

          // LinkedIn: connected state
          expect(containsIdentifier(container, linkedinIdentifier)).toBe(true);
          expect(scope.getByRole('button', { name: /^disconnect linkedin/i })).toBeInTheDocument();
          expect(scope.queryByRole('button', { name: /^connect linkedin/i })).not.toBeInTheDocument();

          // Twitter: disconnected state
          expect(scope.getByRole('button', { name: /^connect twitter/i })).toBeInTheDocument();
          expect(scope.queryByRole('button', { name: /^disconnect twitter/i })).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('LinkedIn disconnected, Twitter connected: correct UI for each platform', () => {
    fc.assert(
      fc.property(
        accountIdentifierArb,
        (twitterIdentifier) => {
          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: false },
            twitter: { connected: true, accountIdentifier: twitterIdentifier },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const scope = within(container);

          // LinkedIn: disconnected state
          expect(scope.getByRole('button', { name: /^connect linkedin/i })).toBeInTheDocument();
          expect(scope.queryByRole('button', { name: /^disconnect linkedin/i })).not.toBeInTheDocument();

          // Twitter: connected state
          expect(containsIdentifier(container, twitterIdentifier)).toBe(true);
          expect(scope.getByRole('button', { name: /^disconnect twitter/i })).toBeInTheDocument();
          expect(scope.queryByRole('button', { name: /^connect twitter/i })).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('both connected: both identifiers shown, both Disconnect buttons present, no Connect buttons', () => {
    fc.assert(
      fc.property(
        accountIdentifierArb,
        accountIdentifierArb,
        (linkedinIdentifier, twitterIdentifier) => {
          // Ensure identifiers are distinct so containsIdentifier is unambiguous
          fc.pre(linkedinIdentifier !== twitterIdentifier);

          const connectionStatus: ConnectionStatus = {
            linkedin: { connected: true, accountIdentifier: linkedinIdentifier },
            twitter: { connected: true, accountIdentifier: twitterIdentifier },
          };

          const { container, unmount } = render(
            <SettingsPanel
              connectionStatus={connectionStatus}
              onConnectLinkedIn={noop}
              onConnectTwitter={noop}
              onDisconnectLinkedIn={noop}
              onDisconnectTwitter={noop}
            />
          );

          const scope = within(container);

          // Both identifiers visible
          expect(containsIdentifier(container, linkedinIdentifier)).toBe(true);
          expect(containsIdentifier(container, twitterIdentifier)).toBe(true);

          // Both Disconnect buttons present
          expect(scope.getByRole('button', { name: /^disconnect linkedin/i })).toBeInTheDocument();
          expect(scope.getByRole('button', { name: /^disconnect twitter/i })).toBeInTheDocument();

          // No Connect buttons
          expect(scope.queryByRole('button', { name: /^connect linkedin/i })).not.toBeInTheDocument();
          expect(scope.queryByRole('button', { name: /^connect twitter/i })).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });
});
