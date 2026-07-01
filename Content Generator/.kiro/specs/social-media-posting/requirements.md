# Requirements Document

## Introduction

This feature adds direct social media publishing to the existing Content Generator app. After generating a LinkedIn Post or Tweet Thread, users can connect their LinkedIn or Twitter/X account via OAuth 2.0 and post the content directly to that platform without leaving the app. OAuth tokens are stored server-side only; no credentials are ever exposed to the browser. Tweet threads are automatically split into individual tweets respecting the 280-character limit before posting.

---

## Glossary

- **App**: The Content Generator Next.js web application.
- **OAuth_Flow**: The OAuth 2.0 Authorization Code flow used to obtain a user access token from LinkedIn or Twitter/X.
- **LinkedIn_API**: The LinkedIn REST API (v2) used to publish posts on behalf of a connected user.
- **Twitter_API**: The Twitter/X API v2 used to publish tweets and tweet threads on behalf of a connected user.
- **Social_Account**: A LinkedIn or Twitter/X account that the user has connected to the App via OAuth_Flow.
- **Connection_Status**: The current state of a Social_Account — either `connected` or `disconnected`.
- **Output_Panel**: The existing area of the UI that displays generated content with Copy and Regenerate controls.
- **Post_Button**: A platform-specific action button ("Post to LinkedIn" or "Post to Twitter/X") rendered in the Output_Panel.
- **Tweet_Splitter**: The server-side utility that divides a Tweet Thread body into individual tweets, each no longer than 280 characters.
- **Thread_Reply_Chain**: A sequence of tweets posted in reply to each other, forming a visible thread on Twitter/X.
- **Token_Store**: The server-side storage mechanism (encrypted, in-memory or persistent) that holds OAuth access tokens and refresh tokens.
- **PKCE**: Proof Key for Code Exchange — the OAuth 2.0 extension used to secure the Authorization Code flow for public clients.
- **Settings_Panel**: A UI section where users can view and manage their connected Social_Accounts.

---

## Requirements

### Requirement 1: Social Account Connection — LinkedIn

**User Story:** As a user, I want to connect my LinkedIn account to the App, so that I can post generated LinkedIn Posts directly to my profile.

#### Acceptance Criteria

1. THE App SHALL provide a "Connect LinkedIn" button in the Settings_Panel.
2. WHEN a user clicks "Connect LinkedIn", THE App SHALL initiate an OAuth_Flow by redirecting the user to the LinkedIn authorisation endpoint with the required scopes (`w_member_social`, `openid`, `profile`).
3. WHEN LinkedIn redirects back to the App with an authorisation code, THE App SHALL exchange the code for an access token and refresh token using a server-side API route, and SHALL store both tokens in the Token_Store.
4. IF the OAuth_Flow returns an error or the user denies authorisation, THEN THE App SHALL display a descriptive error message in the Settings_Panel and SHALL NOT store any tokens.
5. WHEN a LinkedIn account is connected, THE App SHALL display the connected account name and a "Disconnect" button in the Settings_Panel.
6. WHEN a user clicks "Disconnect" for a LinkedIn account, THE App SHALL remove the stored tokens from the Token_Store and update the Connection_Status to `disconnected`.

---

### Requirement 2: Social Account Connection — Twitter/X

**User Story:** As a user, I want to connect my Twitter/X account to the App, so that I can post generated Tweet Threads directly to my profile.

#### Acceptance Criteria

1. THE App SHALL provide a "Connect Twitter/X" button in the Settings_Panel.
2. WHEN a user clicks "Connect Twitter/X", THE App SHALL initiate an OAuth_Flow using OAuth 2.0 with PKCE by redirecting the user to the Twitter/X authorisation endpoint with the required scopes (`tweet.write`, `users.read`, `offline.access`).
3. WHEN Twitter/X redirects back to the App with an authorisation code, THE App SHALL exchange the code for an access token and refresh token using a server-side API route, and SHALL store both tokens in the Token_Store.
4. IF the OAuth_Flow returns an error or the user denies authorisation, THEN THE App SHALL display a descriptive error message in the Settings_Panel and SHALL NOT store any tokens.
5. WHEN a Twitter/X account is connected, THE App SHALL display the connected account username and a "Disconnect" button in the Settings_Panel.
6. WHEN a user clicks "Disconnect" for a Twitter/X account, THE App SHALL remove the stored tokens from the Token_Store and update the Connection_Status to `disconnected`.

---

### Requirement 3: Post Button Visibility

**User Story:** As a user, I want to see a "Post to LinkedIn" button only when I have generated a LinkedIn Post, so that the UI stays uncluttered and context-relevant.

#### Acceptance Criteria

1. WHEN the Output_Panel contains generated content AND the active content type is "LinkedIn Post", THE App SHALL display a "Post to LinkedIn" button in the Output_Panel.
2. WHEN the Output_Panel contains generated content AND the active content type is "Tweet Thread", THE App SHALL display a "Post to Twitter/X" button in the Output_Panel.
3. THE App SHALL NOT display a Post_Button when the Output_Panel is empty, loading, or showing an error.
4. THE App SHALL NOT display a "Post to LinkedIn" button when the active content type is anything other than "LinkedIn Post".
5. THE App SHALL NOT display a "Post to Twitter/X" button when the active content type is anything other than "Tweet Thread".

---

### Requirement 4: Post to LinkedIn

**User Story:** As a user, I want to click "Post to LinkedIn" and have the generated content published to my LinkedIn profile, so that I can share content without switching apps.

#### Acceptance Criteria

1. WHEN a user clicks "Post to LinkedIn" and a LinkedIn Social_Account is connected, THE App SHALL send the generated content to the LinkedIn_API via a server-side API route and publish it as a post on the connected account.
2. WHEN a user clicks "Post to LinkedIn" and no LinkedIn Social_Account is connected, THE App SHALL display a prompt directing the user to connect their LinkedIn account in the Settings_Panel.
3. WHEN the LinkedIn_API accepts the post, THE App SHALL display a success message in the Output_Panel indicating the post was published.
4. IF the LinkedIn_API returns an error, THEN THE App SHALL display a descriptive error message in the Output_Panel and SHALL NOT retry automatically.
5. WHILE a LinkedIn post is being submitted, THE App SHALL disable the "Post to LinkedIn" button and display a posting indicator.
6. IF the LinkedIn access token has expired, THEN THE App SHALL attempt to refresh it using the stored refresh token before retrying the post request.

---

### Requirement 5: Post to Twitter/X — Tweet Thread

**User Story:** As a user, I want to click "Post to Twitter/X" and have the generated Tweet Thread published as a thread on my Twitter/X profile, so that I can share multi-tweet content without manual splitting.

#### Acceptance Criteria

1. WHEN a user clicks "Post to Twitter/X" and a Twitter/X Social_Account is connected, THE Tweet_Splitter SHALL split the generated content into individual tweets, each no longer than 280 characters, before posting.
2. THE Tweet_Splitter SHALL split content at sentence boundaries or paragraph breaks where possible, and SHALL only split mid-sentence when no boundary exists within the 280-character limit.
3. THE Tweet_Splitter SHALL produce at least one tweet for any non-empty input.
4. WHEN the Tweet_Splitter produces multiple tweets, THE App SHALL post them to the Twitter_API as a Thread_Reply_Chain, where each tweet after the first is a reply to the previous one.
5. WHEN the Twitter_API accepts all tweets in the thread, THE App SHALL display a success message in the Output_Panel indicating the thread was posted.
6. IF any tweet in the thread fails to post, THEN THE App SHALL display a descriptive error message in the Output_Panel indicating how many tweets were posted before the failure.
7. WHILE a Twitter/X thread is being submitted, THE App SHALL disable the "Post to Twitter/X" button and display a posting indicator.
8. WHEN a user clicks "Post to Twitter/X" and no Twitter/X Social_Account is connected, THE App SHALL display a prompt directing the user to connect their Twitter/X account in the Settings_Panel.
9. IF the Twitter/X access token has expired, THEN THE App SHALL attempt to refresh it using the stored refresh token before retrying the post request.

---

### Requirement 6: Tweet Splitter

**User Story:** As a developer, I want a reliable utility that splits long text into valid tweets, so that thread posting always produces well-formed content within platform limits.

#### Acceptance Criteria

1. THE Tweet_Splitter SHALL accept a string input and return an ordered array of strings.
2. FOR ALL non-empty input strings, THE Tweet_Splitter SHALL return an array where every element has a length of 280 characters or fewer.
3. FOR ALL non-empty input strings, THE Tweet_Splitter SHALL return an array where the concatenation of all elements (ignoring whitespace normalisation) preserves all substantive content from the input.
4. FOR ALL input strings that are 280 characters or fewer, THE Tweet_Splitter SHALL return an array containing exactly one element equal to the trimmed input.
5. IF the input string is empty or contains only whitespace, THEN THE Tweet_Splitter SHALL return an empty array.
6. THE Tweet_Splitter SHALL prefer splitting at double line breaks (paragraph boundaries) over single line breaks, and SHALL prefer single line breaks over mid-sentence splits.

---

### Requirement 7: OAuth Security

**User Story:** As a developer, I want all OAuth tokens to be handled exclusively server-side, so that user credentials are never exposed to the browser.

#### Acceptance Criteria

1. THE App SHALL perform all OAuth token exchanges in server-side API routes and SHALL NOT expose client secrets or access tokens to the browser.
2. THE App SHALL use PKCE for the Twitter/X OAuth_Flow.
3. THE App SHALL store OAuth tokens in the Token_Store using a server-side session identifier and SHALL NOT include token values in any client-side response payload.
4. THE App SHALL read LinkedIn and Twitter/X developer app credentials (client ID, client secret) exclusively from server-side environment variables.
5. IF a Token_Store entry is missing or corrupted, THEN THE App SHALL treat the corresponding Social_Account as `disconnected` and prompt the user to reconnect.
6. THE App SHALL validate the OAuth `state` parameter on callback to prevent CSRF attacks.

---

### Requirement 8: Settings Panel

**User Story:** As a user, I want a dedicated place to manage my connected social accounts, so that I can see which accounts are active and connect or disconnect them at any time.

#### Acceptance Criteria

1. THE App SHALL provide a Settings_Panel accessible from the main UI (e.g., via a "Settings" link or button).
2. THE Settings_Panel SHALL display the Connection_Status of both LinkedIn and Twitter/X accounts.
3. WHEN no Social_Account is connected, THE Settings_Panel SHALL display a "Connect" button for that platform.
4. WHEN a Social_Account is connected, THE Settings_Panel SHALL display the account identifier (name or username) and a "Disconnect" button.
5. THE Settings_Panel SHALL NOT display raw OAuth tokens or client secrets.

---

### Requirement 9: API Security and Server-Side Enforcement

**User Story:** As a developer, I want all social media API calls to be made server-side, so that platform credentials and user tokens are never accessible from the browser.

#### Acceptance Criteria

1. THE App SHALL make all LinkedIn_API and Twitter_API calls from server-side Next.js API routes.
2. THE App SHALL validate that a valid, non-expired token exists in the Token_Store before attempting any social media post.
3. IF a request to a social media API route is made without a valid server-side session, THEN THE App SHALL return a 401 response and SHALL NOT attempt to call the external API.
4. THE App SHALL never include OAuth access tokens or refresh tokens in JSON responses sent to the browser.

