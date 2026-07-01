import crypto from 'crypto';

/**
 * Generate a cryptographically random code_verifier.
 * Returns a 43–128 character URL-safe string using characters from the
 * unreserved set defined in RFC 7636: A-Z, a-z, 0-9, -, _, ., ~
 */
export function generateCodeVerifier(): string {
  // 32 bytes → 43 base64url chars (minimum per RFC 7636)
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Compute code_challenge = BASE64URL(SHA256(ASCII(verifier)))
 * as specified in RFC 7636 §4.2.
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier, 'ascii')
    .digest()
    .toString('base64url');
}
