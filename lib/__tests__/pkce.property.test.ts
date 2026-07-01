// Feature: social-media-posting, Property 5: PKCE code challenge is correct SHA-256 hash

import * as fc from 'fast-check';
import crypto from 'crypto';
import { generateCodeChallenge } from '../pkce';

/**
 * Validates: Requirements 2.2, 7.2
 *
 * Property 5: PKCE code challenge is correct SHA-256 hash
 * For any code_verifier string, generateCodeChallenge(verifier) must equal
 * BASE64URL(SHA256(ASCII(verifier))) as specified in RFC 7636.
 */

// URL-safe characters per RFC 7636 unreserved set: A-Z, a-z, 0-9, -, _, ., ~
const urlSafeChar = fc.constantFrom(
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.'
);

// Verifier: 43–128 URL-safe characters (RFC 7636 §4.1)
const codeVerifierArb = fc
  .array(urlSafeChar, { minLength: 43, maxLength: 128 })
  .map((chars) => chars.join(''));

/**
 * Independently compute BASE64URL(SHA256(ASCII(verifier))) for comparison.
 */
function computeExpectedChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier, 'ascii')
    .digest()
    .toString('base64url');
}

describe('Property 5: PKCE code challenge is correct SHA-256 hash', () => {
  it('generateCodeChallenge equals BASE64URL(SHA256(ASCII(verifier))) for any valid verifier', () => {
    fc.assert(
      fc.property(codeVerifierArb, (verifier) => {
        const challenge = generateCodeChallenge(verifier);
        const expected = computeExpectedChallenge(verifier);

        expect(challenge).toBe(expected);
      }),
      { numRuns: 25 }
    );
  });
});
