# Implementation Plan: Social Media Posting

## Overview

Extend the existing Content Generator app with LinkedIn and Twitter/X OAuth 2.0 integration, server-side token storage via `iron-session`, tweet thread splitting, and platform-specific Post buttons in the Output Panel. Implementation proceeds from foundational utilities and types, through API routes, to UI components, finishing with wiring everything together.

## Tasks

- [x] 1. Install dependencies and extend shared types
  - Install `iron-session` as a production dependency (`npm install iron-session`)
  - Add new types to `types/index.ts`: `Platform`, `PlatformConnectionInfo`, `ConnectionStatus`, `PostStatus`, `PostResult`, `SessionData`
  - _Requirements: 7.1, 7.3, 8.2_

- [x] 2. Implement PKCE utility (`lib/pkce.ts`)
  - [x] 2.1 Create `lib/pkce.ts` with `generateCodeVerifier` and `generateCodeChallenge`
    - `generateCodeVerifier`: returns a 43–128 character URL-safe random string using `crypto.randomBytes`
    - `generateCodeChallenge`: returns `BASE64URL(SHA256(verifier))` using `crypto.createHash('sha256')` and `Buffer.toString('base64url')`
    - _Requirements: 2.2, 7.2_
  - [x] 2.2 Write property test for PKCE utility
    - **Property 5: PKCE code challenge is correct SHA-256 hash**
    - **Validates: Requirements 2.2, 7.2**
    - File: `lib/__tests__/pkce.property.test.ts`

- [x] 3. Implement Tweet Splitter utility (`lib/tweetSplitter.ts`)
  - [x] 3.1 Create `lib/tweetSplitter.ts` implementing the split-priority algorithm
    - Return `[]` for empty/whitespace-only input
    - Return `[input.trim()]` for inputs ≤ 280 characters
    - Split at `\n\n` (paragraph), then `\n` (line), then last space before 280 (word boundary), then hard cut at 280
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [x] 3.2 Write property test: all tweets within character limit
    - **Property 9: Tweet Splitter — all tweets within character limit**
    - **Validates: Requirements 6.2, 5.1**
    - File: `lib/__tests__/tweetSplitter.property.test.ts`
  - [x] 3.3 Write property test: content preservation
    - **Property 10: Tweet Splitter — content preservation**
    - **Validates: Requirements 6.3**
    - File: `lib/__tests__/tweetSplitter.property.test.ts`
  - [x] 3.4 Write property test: short input identity
    - **Property 11: Tweet Splitter — short input identity**
    - **Validates: Requirements 6.4**
    - File: `lib/__tests__/tweetSplitter.property.test.ts`
  - [x] 3.5 Write property test: empty/whitespace returns empty array
    - **Property 12: Tweet Splitter — empty/whitespace input returns empty array**
    - **Validates: Requirements 6.5**
    - File: `lib/__tests__/tweetSplitter.property.test.ts`

- [x] 4. Checkpoint — Ensure all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Token Store (`lib/tokenStore.ts`)
  - [x] 5.1 Create `lib/tokenStore.ts` with typed `iron-session` helpers
    - Configure session options: `cookieName`, `password` from `SESSION_SECRET`, `cookieOptions` (`httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`)
    - Export `getLinkedInTokens`, `setLinkedInTokens`, `clearLinkedInTokens`
    - Export `getTwitterTokens`, `setTwitterTokens`, `clearTwitterTokens`
    - Return `null` (treat as disconnected) when session entry is missing or decryption fails
    - _Requirements: 7.1, 7.3, 7.5, 9.1_

- [x] 6. Implement LinkedIn OAuth API routes
  - [x] 6.1 Create `app/api/auth/linkedin/route.ts` — initiate LinkedIn OAuth
    - Generate 16-byte hex `state`, store in session
    - Build LinkedIn authorization URL with `response_type=code`, `client_id`, `redirect_uri`, `scope=w_member_social openid profile`, `state`
    - Return `302` redirect
    - _Requirements: 1.2, 7.4, 7.6_
  - [x] 6.2 Create `app/api/auth/linkedin/callback/route.ts` — LinkedIn OAuth callback
    - Validate `state` query param against session value — return `400` on mismatch (CSRF protection)
    - If `error` param present, redirect to `/settings?error=linkedin_denied`
    - Exchange `code` for tokens via `POST https://www.linkedin.com/oauth/v2/accessToken`
    - Fetch account name via `GET https://api.linkedin.com/v2/userinfo`
    - Store `accessToken`, `refreshToken`, `accountName` in session via `tokenStore`
    - Clear temporary `state` from session
    - Redirect to `/settings?connected=linkedin`
    - _Requirements: 1.3, 1.4, 7.1, 7.3, 7.6_
  - [ ] 6.3 Write property test: CSRF state validation rejects mismatched state
    - **Property 6: CSRF state validation rejects mismatched state**
    - **Validates: Requirements 7.6**
    - File: `app/api/auth/linkedin/__tests__/callback.property.test.ts`

- [ ] 7. Implement Twitter/X OAuth API routes
  - [ ] 7.1 Create `app/api/auth/twitter/route.ts` — initiate Twitter/X OAuth
    - Generate `code_verifier` using `lib/pkce.ts`, compute `code_challenge`
    - Generate random `state`
    - Store `code_verifier` and `state` in session
    - Build Twitter authorization URL with PKCE params (`code_challenge`, `code_challenge_method=S256`)
    - Return `302` redirect
    - _Requirements: 2.2, 7.2, 7.6_
  - [ ] 7.2 Create `app/api/auth/twitter/callback/route.ts` — Twitter/X OAuth callback
    - Validate `state` — return `400` on mismatch
    - If `error` param present, redirect to `/settings?error=twitter_denied`
    - Retrieve `code_verifier` from session
    - Exchange `code` for tokens via `POST https://api.twitter.com/2/oauth2/token` (include `code_verifier`)
    - Fetch username via `GET https://api.twitter.com/2/users/me`
    - Store tokens and username in session
    - Clear temporary `state` and `code_verifier` from session
    - Redirect to `/settings?connected=twitter`
    - _Requirements: 2.3, 2.4, 7.1, 7.2, 7.3, 7.6_

- [ ] 8. Implement auth status and disconnect API routes
  - [ ] 8.1 Create `app/api/auth/status/route.ts` — GET connection status
    - Read session via `tokenStore` helpers
    - Return `ConnectionStatus` JSON with `connected` flag and `accountIdentifier` (no token values)
    - _Requirements: 8.2, 7.3, 9.4_
  - [ ] 8.2 Create `app/api/auth/disconnect/route.ts` — POST disconnect account
    - Read `platform` from request body
    - Call `clearLinkedInTokens` or `clearTwitterTokens` accordingly
    - Return `200 { "ok": true }`
    - _Requirements: 1.6, 2.6_
  - [ ]* 8.3 Write property test: API responses never contain token values
    - **Property 7: API responses never contain token values**
    - **Validates: Requirements 7.3, 9.4**
    - File: `app/api/auth/__tests__/status.property.test.ts`

- [ ] 9. Implement LinkedIn post API route (`app/api/post/linkedin/route.ts`)
  - [ ] 9.1 Create the route handler
    - Return `401` if no valid session/tokens (no external API call)
    - If access token expired, attempt refresh via LinkedIn token endpoint; update stored tokens; clear and treat as disconnected if refresh fails
    - Read `content` from request body
    - Call `POST https://api.linkedin.com/v2/ugcPosts` with Bearer token
    - Return `200 { "message": "Posted to LinkedIn successfully" }` on success
    - Return `500 { "error": "..." }` on LinkedIn API error — no retry
    - _Requirements: 4.1, 4.4, 4.6, 9.1, 9.2, 9.3_
  - [ ]* 9.2 Write property test: unauthenticated post requests return 401
    - **Property 8: Unauthenticated post requests return 401**
    - **Validates: Requirements 9.2, 9.3**
    - File: `app/api/post/__tests__/linkedin.property.test.ts`

- [ ] 10. Implement Twitter/X post API route (`app/api/post/twitter/route.ts`)
  - [ ] 10.1 Create the route handler
    - Return `401` if no valid session/tokens
    - If access token expired, attempt refresh; update stored tokens; clear and treat as disconnected if refresh fails
    - Read `content` from request body
    - Call `tweetSplitter(content)` to get ordered tweet array
    - Post first tweet via `POST https://api.twitter.com/2/tweets`
    - Post each subsequent tweet as a reply to the previous tweet's `id` (using `reply.in_reply_to_tweet_id`)
    - If any tweet fails, return `500 { "error": "Posted N of M tweets before failure" }`
    - Return `200 { "message": "Thread posted successfully (N tweets)" }` on full success
    - _Requirements: 5.1, 5.2, 5.4, 5.6, 5.9, 9.1, 9.2, 9.3_
  - [ ]* 10.2 Write property test: thread reply chain ordering
    - **Property 13: Tweet thread reply chain ordering**
    - **Validates: Requirements 5.4**
    - File: `app/api/post/__tests__/twitter.property.test.ts`
  - [ ]* 10.3 Write property test: partial failure message reflects count
    - **Property 14: Partial thread failure message reflects count**
    - **Validates: Requirements 5.6**
    - File: `app/api/post/__tests__/twitter.property.test.ts`
  - [ ]* 10.4 Write property test: unauthenticated post requests return 401
    - **Property 8: Unauthenticated post requests return 401 (Twitter)**
    - **Validates: Requirements 9.2, 9.3**
    - File: `app/api/post/__tests__/twitter.property.test.ts`

- [ ] 11. Checkpoint — Ensure all API route tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Update `OutputPanel` component with social media props
  - [ ] 12.1 Extend `OutputPanelProps` in `components/OutputPanel.tsx` with new optional props
    - Add `contentType?: ContentType`, `onPostLinkedIn?: () => void`, `onPostTwitter?: () => void`, `isPosting?: boolean`, `postResult?: PostResult | null`
    - All new props are optional — existing callers remain unaffected
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ] 12.2 Add Post button rendering logic to `OutputPanel`
    - Render "Post to LinkedIn" button only when `output` is non-empty AND `contentType === 'LinkedIn Post'` AND not loading/error
    - Render "Post to Twitter/X" button only when `output` is non-empty AND `contentType === 'Tweet Thread'` AND not loading/error
    - Disable the active Post button and show posting indicator when `isPosting` is true
    - Display `postResult` success or error message below the action buttons
    - _Requirements: 3.1, 3.2, 3.3, 4.3, 4.4, 4.5, 5.5, 5.6, 5.7_
  - [ ]* 12.3 Write property test: Post button visibility matches content type
    - **Property 1: Post button visibility matches content type**
    - **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
    - File: `components/__tests__/OutputPanel.property.test.tsx` (extend existing file)
  - [ ]* 12.4 Write property test: No Post buttons in empty, loading, or error states
    - **Property 2: No Post buttons in empty, loading, or error states**
    - **Validates: Requirements 3.3**
    - File: `components/__tests__/OutputPanel.property.test.tsx` (extend existing file)

- [ ] 13. Create `SettingsPanel` component
  - [ ] 13.1 Create `components/SettingsPanel.tsx` and `components/SettingsPanel.module.css`
    - Accept `SettingsPanelProps`: `connectionStatus`, `onConnectLinkedIn`, `onConnectTwitter`, `onDisconnectLinkedIn`, `onDisconnectTwitter`
    - LinkedIn section: show account name + "Disconnect" button when connected; show "Connect LinkedIn" button when disconnected
    - Twitter/X section: show username + "Disconnect" button when connected; show "Connect Twitter/X" button when disconnected
    - Never render raw token values
    - Use `role="status"` or `aria-live="polite"` for status messages
    - _Requirements: 1.5, 1.6, 2.5, 2.6, 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ]* 13.2 Write property test: connected account identifier is always displayed
    - **Property 3: Connected account identifier is always displayed**
    - **Validates: Requirements 1.5, 2.5, 8.4**
    - File: `components/__tests__/SettingsPanel.property.test.tsx`
  - [ ]* 13.3 Write property test: Settings Panel never leaks token values
    - **Property 4: Settings Panel never leaks token values**
    - **Validates: Requirements 8.5, 7.3, 9.4**
    - File: `components/__tests__/SettingsPanel.property.test.tsx`
  - [ ]* 13.4 Write property test: Settings Panel displays correct status for all connection combinations
    - **Property 15: Settings Panel displays correct status for all connection combinations**
    - **Validates: Requirements 8.2, 8.3**
    - File: `components/__tests__/SettingsPanel.property.test.tsx`

- [ ] 14. Create Settings page (`app/settings/page.tsx`)
  - Create `app/settings/page.tsx` as a client component
  - Fetch connection status from `/api/auth/status` on mount
  - Handle `?connected=` and `?error=` query params to display success/error messages from OAuth redirects
  - Wire `onConnectLinkedIn` → redirect to `/api/auth/linkedin`
  - Wire `onConnectTwitter` → redirect to `/api/auth/twitter`
  - Wire `onDisconnectLinkedIn` / `onDisconnectTwitter` → POST to `/api/auth/disconnect` then refresh status
  - _Requirements: 1.1, 1.4, 1.5, 1.6, 2.1, 2.4, 2.5, 2.6, 8.1_

- [ ] 15. Update `ContentGenerator` to wire social media posting
  - [ ] 15.1 Fetch connection status on mount and manage `connectionStatus` state
    - Call `GET /api/auth/status` on component mount; store result in state
    - _Requirements: 3.1, 3.2, 4.2, 5.8_
  - [ ] 15.2 Pass `contentType` and post handlers to `OutputPanel`
    - Pass `textInputs.contentType` as `contentType` prop to `OutputPanel`
    - Implement `handlePostLinkedIn`: POST to `/api/post/linkedin` with current `output`; manage `isPosting` and `postResult` state
    - Implement `handlePostTwitter`: POST to `/api/post/twitter` with current `output`; manage `isPosting` and `postResult` state
    - If post returns `401`, display prompt directing user to Settings
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.5, 5.6, 5.7, 5.8_

- [ ] 16. Add Settings navigation link to main layout
  - Add a "Settings" link/button to `app/layout.tsx` or `components/ContentGenerator.tsx` that navigates to `/settings`
  - _Requirements: 8.1_

- [ ] 17. Update environment variable files
  - Add LinkedIn, Twitter/X, and `SESSION_SECRET` variable names to `.env.example` (no values)
  - Verify `.env.local` is in `.gitignore`
  - _Requirements: 7.4_

- [ ] 18. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All new API routes are server-side only — no `NEXT_PUBLIC_` env vars
- `iron-session` encrypts the cookie with `SESSION_SECRET`; the app should fail clearly at startup if this variable is missing
- The new `OutputPanel` props are all optional, preserving full backward compatibility with existing callers
- Property tests use `fast-check` (already in devDependencies) with tag format: `// Feature: social-media-posting, Property {N}: {property_text}`
- Each property test runs a minimum of 100 iterations
