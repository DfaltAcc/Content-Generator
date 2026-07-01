/**
 * lib/tokenStore.ts
 *
 * Typed iron-session helpers for reading and writing OAuth tokens.
 * Tokens are stored in an encrypted, httpOnly cookie — never sent to the browser
 * as part of any JSON response.
 *
 * Requirements: 7.1, 7.3, 7.5, 9.1
 */

import { getIronSession, type SessionOptions } from 'iron-session';
import type { SessionData } from '@/types';

// ---------------------------------------------------------------------------
// Session configuration
// ---------------------------------------------------------------------------

const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  throw new Error(
    '[tokenStore] SESSION_SECRET environment variable is not set. ' +
      'Please set a random string of at least 32 characters in your .env.local file.'
  );
}

export const sessionOptions: SessionOptions = {
  cookieName: 'cg_session',
  password: SESSION_SECRET,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
};

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/**
 * Obtain an iron-session instance from a Next.js App Router request/response pair.
 * Returns null if the session cannot be decrypted (treat as disconnected).
 */
async function getSession(
  req: Request,
  res: Response
): Promise<import('iron-session').IronSession<SessionData> | null> {
  try {
    return await getIronSession<SessionData>(req, res, sessionOptions);
  } catch {
    // Decryption failure → treat as disconnected (Requirement 7.5)
    return null;
  }
}

// ---------------------------------------------------------------------------
// LinkedIn token helpers
// ---------------------------------------------------------------------------

export interface LinkedInTokens {
  accessToken: string;
  refreshToken: string;
  accountName?: string;
}

/**
 * Read LinkedIn tokens from the encrypted session.
 * Returns null when the session is missing, corrupted, or the tokens are absent.
 */
export async function getLinkedInTokens(
  req: Request,
  res: Response
): Promise<LinkedInTokens | null> {
  const session = await getSession(req, res);
  if (!session) return null;

  const { linkedinAccessToken, linkedinRefreshToken, linkedinAccountName } = session;

  if (!linkedinAccessToken || !linkedinRefreshToken) {
    return null;
  }

  return {
    accessToken: linkedinAccessToken,
    refreshToken: linkedinRefreshToken,
    accountName: linkedinAccountName,
  };
}

/**
 * Write LinkedIn tokens into the encrypted session and persist the cookie.
 */
export async function setLinkedInTokens(
  req: Request,
  res: Response,
  tokens: LinkedInTokens
): Promise<void> {
  const session = await getSession(req, res);
  if (!session) {
    throw new Error('[tokenStore] Unable to obtain session for setLinkedInTokens');
  }

  session.linkedinAccessToken = tokens.accessToken;
  session.linkedinRefreshToken = tokens.refreshToken;
  session.linkedinAccountName = tokens.accountName;

  await session.save();
}

/**
 * Remove LinkedIn tokens from the encrypted session and persist the cookie.
 */
export async function clearLinkedInTokens(req: Request, res: Response): Promise<void> {
  const session = await getSession(req, res);
  if (!session) return; // Nothing to clear

  session.linkedinAccessToken = undefined;
  session.linkedinRefreshToken = undefined;
  session.linkedinAccountName = undefined;

  await session.save();
}

// ---------------------------------------------------------------------------
// Twitter/X token helpers
// ---------------------------------------------------------------------------

export interface TwitterTokens {
  accessToken: string;
  refreshToken: string;
  username?: string;
}

/**
 * Read Twitter/X tokens from the encrypted session.
 * Returns null when the session is missing, corrupted, or the tokens are absent.
 */
export async function getTwitterTokens(
  req: Request,
  res: Response
): Promise<TwitterTokens | null> {
  const session = await getSession(req, res);
  if (!session) return null;

  const { twitterAccessToken, twitterRefreshToken, twitterUsername } = session;

  if (!twitterAccessToken || !twitterRefreshToken) {
    return null;
  }

  return {
    accessToken: twitterAccessToken,
    refreshToken: twitterRefreshToken,
    username: twitterUsername,
  };
}

/**
 * Write Twitter/X tokens into the encrypted session and persist the cookie.
 */
export async function setTwitterTokens(
  req: Request,
  res: Response,
  tokens: TwitterTokens
): Promise<void> {
  const session = await getSession(req, res);
  if (!session) {
    throw new Error('[tokenStore] Unable to obtain session for setTwitterTokens');
  }

  session.twitterAccessToken = tokens.accessToken;
  session.twitterRefreshToken = tokens.refreshToken;
  session.twitterUsername = tokens.username;

  await session.save();
}

/**
 * Remove Twitter/X tokens from the encrypted session and persist the cookie.
 */
export async function clearTwitterTokens(req: Request, res: Response): Promise<void> {
  const session = await getSession(req, res);
  if (!session) return; // Nothing to clear

  session.twitterAccessToken = undefined;
  session.twitterRefreshToken = undefined;
  session.twitterUsername = undefined;

  await session.save();
}
