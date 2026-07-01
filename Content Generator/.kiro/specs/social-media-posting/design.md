# Design Document — Social Media Posting

## Overview

This feature extends the existing Content Generator app to allow users to publish generated content directly to LinkedIn and Twitter/X without leaving the app. When a user generates a "LinkedIn Post" or "Tweet Thread", platform-specific Post buttons appear in the Output Panel. Clicking a button either triggers the post (if the account is already connected) or prompts the user to connect via OAuth 2.0.

OAuth flows are handled entirely server-side. Tokens are stored in an encrypted server-side session and never appear in any browser response. Tweet threads are automatically split into individual tweets (≤ 280 characters each) and posted as a reply chain.

A new Settings Panel lets users view connection status and connect or disconnect their LinkedIn and Twitter/X accounts at any time.

---

## Architecture

### High-Level Architecture

```
Browser (React / Next.js Client Components)
  │
  │  Click "Connect LinkedIn" / "Connect Twitter/X"
  │  → Redirect to platform OAuth endpoint
  │
  │  OAuth callback → /api/auth/linkedin/callback
  │                   /api/auth/twitter/callback
  │
  │  Click "Post to LinkedIn" / "Post to Twitter/X"
  │  → POST /api/post/linkedin
  │     POST /api/post/twitter
  ▼
Next.js API Routes (Server-Side Only)
  │  Reads credentials from process.env
  │  Manages Token_Store via encrypted session
  │  Calls LinkedIn API / Twitter API
  ▼
LinkedIn REST API v2 / Twitter API v2
```

### OAuth Flow — LinkedIn (Authorization Code)

```
Browser                    Next.js Server              LinkedIn
   │                            │                          │
   │── GET /api/auth/linkedin ──▶│                          │
   │                            │ generate state, store    │
   │◀── 302 redirect ───────────│ in session               │
   │                            │                          │
   │──────────────────────────────────────────────────────▶│
   │                            │                          │ user authorises
   │◀──────────────────────────────────────────────────────│
   │  ?code=...&state=...       │                          │
   │── GET /api/auth/linkedin/callback ──▶│                │
   │                            │ validate state           │
   │                            │── POST token exchange ──▶│
   │                            │◀── access + refresh ─────│
   │                            │ encrypt & store tokens   │
   │◀── redirect to /settings ──│                          │
```

### OAuth Flow — Twitter/X (Authorization Code + PKCE)

```
Browser                    Next.js Server              Twitter/X
   │                            │                          │
   │── GET /api/auth/twitter ───▶│                          │
   │                            │ generate code_verifier,  │
   │                            │ code_challenge, state    │
   │                            │ store verifier+state     │
   │◀── 302 redirect ───────────│ in session               │
   │                            │                          │
   │──────────────────────────────────────────────────────▶│
   │                            │                          │ user authorises
   │◀──────────────────────────────────────────────────────│
   │  ?code=...&state=...       │                          │
   │── GET /api/auth/twitter/callback ──▶│                 │
   │                            │ validate state           │
   │                            │── POST token exchange ──▶│
   │                            │   (with code_verifier)   │
   │                            │◀── access + refresh ─────│
   │                            │ encrypt & store tokens   │
   │◀── redirect to /settings ──│                          │
```

### Technology Choices

| Concern | Choice | Rationale |
|---|---|---|
| Session / Token Store | `iron-session` | Encrypted, signed cookie-based sessions; no database required; works with Next.js App Router |
| PKCE | Custom utility in `lib/pkce.ts` | SHA-256 + Base64URL encoding using Node.js `crypto` module; no extra dependency |
| HTTP client (server-side) | Native `fetch` | Already used in the project; no extra dependency |
| Property-based testing | `fast-check` (already installed) | Already in devDependencies |

### Directory Structure (additions only)

```
/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── linkedin/
│   │   │   │   ├── route.ts          # GET — initiates LinkedIn OAuth
│   │   │   │   └── callback/
│   │   │   │       └── route.ts      # GET — LinkedIn OAuth callback
│   │   │   └── twitter/
│   │   │       ├── route.ts          # GET — initiates Twitter/X OAuth
│   │   │       └── callback/
│   │   │           └── route.ts      # GET — Twitter/X OAuth callback
│   │   └── post/
│   │       ├── linkedin/
│   │       │   └── route.ts          # POST — publish to LinkedIn
│   │       └── twitter/
│   │           └── route.ts          # POST — publish to Twitter/X
│   └── settings/
│       └── page.tsx                  # Settings page
├── components/
│   ├── SettingsPanel.tsx             # Connection management UI
│   └── SettingsPanel.module.css
├── lib/
│   ├── tweetSplitter.ts              # Tweet splitting utility
│   ├── pkce.ts                       # PKCE code_verifier / code_challenge
│   └── tokenStore.ts                 # Token read/write helpers (wraps iron-session)
└── types/
    └── index.ts                      # Extended with social media types
```

---

## Components and Interfaces

### Component Tree (additions)

```
ContentGenerator (existing — receives contentType prop passed to OutputPanel)
└── OutputPanel (updated — receives contentType, connectionStatus, onPostLinkedIn, onPostTwitter)

app/settings/page.tsx
└── SettingsPanel (new)
```

### OutputPanel (updated)

The existing `OutputPanelProps` interface is extended with social media props:

```typescript
interface OutputPanelProps {
  // existing props
  output: string;
  isLoading: boolean;
  error: string | null;
  copyConfirmed: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  // new props
  contentType?: ContentType;
  connectionStatus?: ConnectionStatus;
  onPostLinkedIn?: () => void;
  onPostTwitter?: () => void;
  isPosting?: boolean;
  postResult?: PostResult | null;
}
```

Post button visibility logic:
- "Post to LinkedIn" renders only when `output` is non-empty AND `contentType === 'LinkedIn Post'`
- "Post to Twitter/X" renders only when `output` is non-empty AND `contentType === 'Tweet Thread'`
- Neither button renders when `isLoading`, `error` is set, or `output` is empty

### ContentGenerator (updated)

Passes `contentType` (the currently active text content type) down to `OutputPanel`. Also manages `connectionStatus` state (fetched from `/api/auth/status` on mount) and `postResult` state.

### SettingsPanel (new)

```typescript
interface SettingsPanelProps {
  connectionStatus: ConnectionStatus;
  onConnectLinkedIn: () => void;
  onConnectTwitter: () => void;
  onDisconnectLinkedIn: () => void;
  onDisconnectTwitter: () => void;
}
```

Renders:
- LinkedIn section: account name + "Disconnect" button (connected) OR "Connect LinkedIn" button (disconnected)
- Twitter/X section: username + "Disconnect" button (connected) OR "Connect Twitter/X" button (disconnected)
- Never renders raw token values

---

## Data Models

### New TypeScript Types

```typescript
// types/index.ts additions

export type Platform = 'linkedin' | 'twitter';

export interface PlatformConnectionInfo {
  connected: boolean;
  accountIdentifier?: string; // display name (LinkedIn) or username (Twitter/X)
}

export interface ConnectionStatus {
  linkedin: PlatformConnectionInfo;
  twitter: PlatformConnectionInfo;
}

export type PostStatus = 'idle' | 'posting' | 'success' | 'error';

export interface PostResult {
  platform: Platform;
  status: 'success' | 'error';
  message: string;
  // For partial Twitter thread failures:
  tweetsPosted?: number;
  totalTweets?: number;
}

// Session data shape (server-side only — never sent to browser)
export interface SessionData {
  // OAuth state params (temporary, during flow)
  linkedinOAuthState?: string;
  twitterOAuthState?: string;
  twitterCodeVerifier?: string;
  // Stored tokens (encrypted by iron-session)
  linkedinAccessToken?: string;
  linkedinRefreshToken?: string;
  linkedinAccountName?: string;
  twitterAccessToken?: string;
  twitterRefreshToken?: string;
  twitterUsername?: string;
}
```

### Token Store

Tokens are stored in an `iron-session` encrypted cookie. The session is sealed with `SESSION_SECRET` (minimum 32 characters). The session cookie is:
- `httpOnly: true` — not accessible from JavaScript
- `secure: true` in production
- `sameSite: 'lax'` — allows OAuth redirects while blocking CSRF

The `lib/tokenStore.ts` module provides typed helpers:

```typescript
// lib/tokenStore.ts (pseudocode)

export async function getLinkedInTokens(req): Promise<{ accessToken: string; refreshToken: string } | null>
export async function setLinkedInTokens(req, tokens): Promise<void>
export async function clearLinkedInTokens(req): Promise<void>
export async function getTwitterTokens(req): Promise<{ accessToken: string; refreshToken: string } | null>
export async function setTwitterTokens(req, tokens): Promise<void>
export async function clearTwitterTokens(req): Promise<void>
```

If a session entry is missing or the session cannot be decrypted, the helpers return `null` and the account is treated as disconnected.

---

## API Route Design

### `GET /api/auth/linkedin` — Initiate LinkedIn OAuth

1. Generate a cryptographically random `state` string (16 bytes, hex-encoded)
2. Store `state` in the session
3. Build the LinkedIn authorization URL:
   - `https://www.linkedin.com/oauth/v2/authorization`
   - `response_type=code`
   - `client_id=${LINKEDIN_CLIENT_ID}`
   - `redirect_uri=${LINKEDIN_REDIRECT_URI}`
   - `scope=w_member_social openid profile`
   - `state=${state}`
4. Return `302` redirect to the authorization URL

### `GET /api/auth/linkedin/callback` — LinkedIn OAuth Callback

1. Read `code` and `state` from query params
2. Validate `state` matches the value stored in session — return `400` if mismatch (CSRF protection)
3. If `error` param is present, redirect to `/settings?error=linkedin_denied`
4. Exchange `code` for tokens via `POST https://www.linkedin.com/oauth/v2/accessToken`
5. Fetch the user's profile name via `GET https://api.linkedin.com/v2/userinfo`
6. Encrypt and store `accessToken`, `refreshToken`, `accountName` in session
7. Clear the temporary `state` from session
8. Redirect to `/settings?connected=linkedin`

### `GET /api/auth/twitter` — Initiate Twitter/X OAuth

1. Generate `code_verifier` (43–128 random URL-safe characters)
2. Compute `code_challenge = BASE64URL(SHA256(code_verifier))`
3. Generate a random `state` string
4. Store `code_verifier` and `state` in session
5. Build the Twitter authorization URL:
   - `https://twitter.com/i/oauth2/authorize`
   - `response_type=code`
   - `client_id=${TWITTER_CLIENT_ID}`
   - `redirect_uri=${TWITTER_REDIRECT_URI}`
   - `scope=tweet.write users.read offline.access`
   - `state=${state}`
   - `code_challenge=${code_challenge}`
   - `code_challenge_method=S256`
6. Return `302` redirect

### `GET /api/auth/twitter/callback` — Twitter/X OAuth Callback

1. Read `code` and `state` from query params
2. Validate `state` — return `400` if mismatch
3. If `error` param is present, redirect to `/settings?error=twitter_denied`
4. Retrieve `code_verifier` from session
5. Exchange `code` for tokens via `POST https://api.twitter.com/2/oauth2/token` (include `code_verifier`)
6. Fetch username via `GET https://api.twitter.com/2/users/me`
7. Store tokens and username in session
8. Clear temporary `state` and `code_verifier` from session
9. Redirect to `/settings?connected=twitter`

### `GET /api/auth/status` — Connection Status

Returns the current connection status for both platforms (no token values):

```json
{
  "linkedin": { "connected": true, "accountIdentifier": "Jane Smith" },
  "twitter": { "connected": false }
}
```

### `POST /api/auth/disconnect` — Disconnect Account

Body: `{ "platform": "linkedin" | "twitter" }`

Clears the corresponding tokens from the session. Returns `200 { "ok": true }`.

### `POST /api/post/linkedin` — Publish to LinkedIn

1. Validate session exists — return `401` if not
2. Read LinkedIn tokens from Token_Store — return `401` if missing
3. If access token is expired, attempt refresh using `refreshToken`; update stored tokens
4. Read `content` from request body
5. Call `POST https://api.linkedin.com/v2/ugcPosts` with the content
6. Return `200 { "message": "Posted to LinkedIn successfully" }` on success
7. Return `500 { "error": "..." }` on LinkedIn API error — do not retry

### `POST /api/post/twitter` — Publish to Twitter/X

1. Validate session — return `401` if not
2. Read Twitter tokens — return `401` if missing
3. If access token is expired, attempt refresh; update stored tokens
4. Read `content` from request body
5. Call `tweetSplitter(content)` to get ordered array of tweet strings
6. Post first tweet via `POST https://api.twitter.com/2/tweets`
7. For each subsequent tweet, post as reply to the previous tweet's `id`
8. If any tweet fails, return `500 { "error": "Posted N of M tweets before failure" }`
9. Return `200 { "message": "Thread posted successfully (N tweets)" }` on full success

---

## Tweet Splitter

`lib/tweetSplitter.ts` is a pure function with no side effects.

### Algorithm

```
function tweetSplitter(input: string): string[]
```

1. If `input.trim()` is empty, return `[]`
2. If `input.trim().length <= 280`, return `[input.trim()]`
3. Split input into segments by double line breaks (`\n\n`) — paragraph boundaries
4. For each segment:
   - If segment length ≤ 280, add as a tweet
   - Otherwise, split by single line breaks (`\n`)
     - If a line ≤ 280, add as a tweet
     - Otherwise, split mid-sentence at the last space before position 280
5. Return the ordered array of tweet strings

### Split Priority

```
1. Double line break (\n\n)  — paragraph boundary (highest priority)
2. Single line break (\n)    — line boundary
3. Last space before 280     — word boundary (mid-sentence split)
4. Hard cut at 280           — last resort (no spaces found)
```

### Examples

| Input | Output |
|---|---|
| `""` | `[]` |
| `"Hello"` | `["Hello"]` |
| `"A".repeat(280)` | `["A".repeat(280)]` |
| `"A".repeat(281)` | Two tweets, first ≤ 280 chars |
| `"Para 1\n\nPara 2"` | `["Para 1", "Para 2"]` |

---

## PKCE Utility

`lib/pkce.ts` provides two functions:

```typescript
// Generate a cryptographically random code_verifier (43–128 URL-safe chars)
export function generateCodeVerifier(): string

// Compute code_challenge = BASE64URL(SHA256(verifier))
export function generateCodeChallenge(verifier: string): string
```

Uses Node.js `crypto.createHash('sha256')` and `Buffer.from(...).toString('base64url')`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Post button visibility matches content type

*For any* non-empty output string, the "Post to LinkedIn" button is rendered if and only if `contentType === 'LinkedIn Post'`, and the "Post to Twitter/X" button is rendered if and only if `contentType === 'Tweet Thread'`. For all other content types, neither Post button is rendered.

**Validates: Requirements 3.1, 3.2, 3.4, 3.5**

---

### Property 2: No Post buttons in empty, loading, or error states

*For any* combination of (empty output, loading state, error state), neither the "Post to LinkedIn" nor the "Post to Twitter/X" button is rendered, regardless of content type.

**Validates: Requirements 3.3**

---

### Property 3: Connected account identifier is always displayed

*For any* connected account with any non-empty account identifier (name or username), the Settings Panel renders that identifier and a "Disconnect" button, and does not render a "Connect" button for that platform.

**Validates: Requirements 1.5, 2.5, 8.4**

---

### Property 4: Settings Panel never leaks token values

*For any* session state containing any OAuth access token or refresh token values, the rendered Settings Panel output does not contain those token string values.

**Validates: Requirements 8.5, 7.3, 9.4**

---

### Property 5: PKCE code challenge is correct SHA-256 hash

*For any* code_verifier string, `generateCodeChallenge(verifier)` must equal `BASE64URL(SHA256(ASCII(verifier)))` as specified in RFC 7636.

**Validates: Requirements 2.2, 7.2**

---

### Property 6: CSRF state validation rejects mismatched state

*For any* OAuth callback request where the `state` query parameter does not match the `state` stored in the session, the callback route returns an error response and does not store any tokens in the Token_Store.

**Validates: Requirements 7.6**

---

### Property 7: API responses never contain token values

*For any* response from `/api/auth/status`, `/api/auth/disconnect`, `/api/post/linkedin`, or `/api/post/twitter`, the JSON response body does not contain the string values of any stored OAuth access tokens or refresh tokens.

**Validates: Requirements 7.3, 9.4**

---

### Property 8: Unauthenticated post requests return 401

*For any* POST request to `/api/post/linkedin` or `/api/post/twitter` made without a valid server-side session containing tokens, the route returns a `401` response and makes no call to the external social media API.

**Validates: Requirements 9.2, 9.3**

---

### Property 9: Tweet Splitter — all tweets within character limit

*For any* non-empty input string, every element in the array returned by `tweetSplitter` has a length of 280 characters or fewer.

**Validates: Requirements 6.2, 5.1**

---

### Property 10: Tweet Splitter — content preservation

*For any* non-empty input string, the concatenation of all elements returned by `tweetSplitter` (after normalising whitespace) preserves all substantive content from the input — no words are dropped or added.

**Validates: Requirements 6.3**

---

### Property 11: Tweet Splitter — short input identity

*For any* input string whose trimmed length is 280 characters or fewer, `tweetSplitter` returns an array containing exactly one element equal to the trimmed input.

**Validates: Requirements 6.4**

---

### Property 12: Tweet Splitter — empty/whitespace input returns empty array

*For any* string composed entirely of whitespace characters (including the empty string), `tweetSplitter` returns an empty array `[]`.

**Validates: Requirements 6.5**

---

### Property 13: Tweet thread reply chain ordering

*For any* array of N tweet strings (N ≥ 2) produced by the Tweet Splitter, when posted to the Twitter API, each tweet at index i > 0 is posted as a reply to the tweet at index i-1 (using the `reply.in_reply_to_tweet_id` field).

**Validates: Requirements 5.4**

---

### Property 14: Partial thread failure message reflects count

*For any* thread of M tweets where the k-th tweet (1-indexed) fails to post, the error message displayed in the Output Panel indicates that k-1 tweets were posted successfully before the failure.

**Validates: Requirements 5.6**

---

### Property 15: Settings Panel displays correct status for all connection combinations

*For any* combination of LinkedIn and Twitter/X connection states (connected/disconnected), the Settings Panel correctly displays the status for each platform independently — a connected platform shows the account identifier and Disconnect button, a disconnected platform shows the Connect button.

**Validates: Requirements 8.2, 8.3**

---

## Error Handling

| Scenario | Handling |
|---|---|
| OAuth `state` mismatch on callback | Return `400`; redirect to `/settings?error=csrf`; display "Security validation failed. Please try connecting again." |
| User denies OAuth authorisation | Redirect to `/settings?error=linkedin_denied` or `twitter_denied`; display "Authorisation was denied. Please try again." |
| Token exchange fails (network/API error) | Redirect to `/settings?error=token_exchange`; display "Failed to complete connection. Please try again." |
| No tokens in session when posting | Return `401`; display "Please connect your [platform] account in Settings before posting." |
| Token refresh fails | Clear stored tokens; treat as disconnected; display "Your [platform] session has expired. Please reconnect in Settings." |
| LinkedIn API error on post | Return `500`; display the API error message or "Failed to post to LinkedIn. Please try again." |
| Twitter API error on first tweet | Return `500`; display "Failed to post thread. No tweets were published." |
| Twitter API error on tweet N > 1 | Return `500`; display "Posted N-1 of M tweets before an error occurred." |
| Token Store missing/corrupted | Treat account as disconnected; prompt reconnect |
| `SESSION_SECRET` not set | Server startup should fail with a clear error message |

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

- **SettingsPanel**: renders Connect buttons when disconnected; renders account identifier and Disconnect button when connected; does not render token values
- **OutputPanel (updated)**: Post to LinkedIn button appears only for LinkedIn Post content type with non-empty output; Post to Twitter/X button appears only for Tweet Thread; no Post buttons when loading/error/empty
- **tweetSplitter**: empty input returns `[]`; input ≤ 280 returns single element; long input splits correctly; paragraph breaks preferred over line breaks
- **pkce**: `generateCodeVerifier` returns a string of 43–128 URL-safe characters; `generateCodeChallenge` returns correct Base64URL-encoded SHA-256 hash
- **API routes (mocked)**: `/api/auth/linkedin/callback` validates state; `/api/post/linkedin` returns 401 without session; `/api/post/twitter` builds reply chain correctly

### Property-Based Tests (fast-check)

**Library**: `fast-check` (already installed)

Tag format: `// Feature: social-media-posting, Property {N}: {property_text}`

Minimum 100 iterations per property test.

| Property | Test description |
|---|---|
| P1 — Post button visibility | Generate arbitrary ContentType values and non-empty output strings; assert correct button visibility |
| P2 — No Post buttons in non-content states | For each of (empty, loading, error) states, assert no Post buttons rendered regardless of contentType |
| P3 — Connected account identifier displayed | Generate arbitrary account identifiers; render SettingsPanel; assert identifier and Disconnect shown |
| P4 — Settings Panel no token leakage | Generate arbitrary token strings; render SettingsPanel; assert token values absent from rendered output |
| P5 — PKCE code challenge correctness | Generate arbitrary verifier strings; assert challenge equals BASE64URL(SHA256(verifier)) |
| P6 — CSRF state validation | Generate arbitrary state values that don't match session; assert callback returns error, no tokens stored |
| P7 — API responses no token values | For any route response, assert JSON body does not contain stored token values |
| P8 — Unauthenticated post returns 401 | For any request without valid session, assert 401 and no external API call |
| P9 — Tweet Splitter character limit | Generate arbitrary non-empty strings; assert all output tweets ≤ 280 chars |
| P10 — Tweet Splitter content preservation | Generate arbitrary non-empty strings; assert concatenated output preserves all content |
| P11 — Tweet Splitter short input identity | Generate strings of length ≤ 280; assert single-element output equals trimmed input |
| P12 — Tweet Splitter empty/whitespace | Generate whitespace-only strings; assert output is `[]` |
| P13 — Thread reply chain ordering | Generate arrays of tweet strings; mock Twitter API; assert reply chain structure |
| P14 — Partial failure message count | Generate thread length M and failure position k; assert error message reflects k-1 successes |
| P15 — Settings Panel connection combinations | Generate all four combinations of LinkedIn/Twitter connection states; assert correct UI for each |

### Integration Tests

- LinkedIn OAuth callback: mock LinkedIn token endpoint; assert tokens stored in session
- Twitter OAuth callback: mock Twitter token endpoint with code_verifier; assert tokens stored
- Token refresh: mock expired token scenario; assert refresh called before post retry
- Full post flow (LinkedIn): mock LinkedIn API; assert content posted with correct auth header
- Full post flow (Twitter thread): mock Twitter API; assert reply chain built correctly

### Accessibility Tests

- Run `jest-axe` on SettingsPanel and updated OutputPanel
- Verify all new buttons have accessible labels
- Verify status messages use `role="status"` or `aria-live="polite"`

---

## Environment Variables

```bash
# .env.local (gitignored) / .env.example (committed, no values)

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/auth/linkedin/callback

# Twitter/X OAuth
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
TWITTER_REDIRECT_URI=http://localhost:3000/api/auth/twitter/callback

# Session encryption (minimum 32 characters)
SESSION_SECRET=
```

All variables are read exclusively from `process.env` in server-side API routes. None are prefixed with `NEXT_PUBLIC_`.
