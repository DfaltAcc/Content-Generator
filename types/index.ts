// types/index.ts

export type ActiveTab = 'text' | 'image' | 'email';

export type ContentType =
  | 'Blog Post'
  | 'LinkedIn Post'
  | 'Tweet Thread'
  | 'Article Intro'
  | 'Product Description';

export type Tone = 'Professional' | 'Casual' | 'Persuasive' | 'Humorous';

export interface TextInputs {
  contentType: ContentType;
  topic: string;
  tone: Tone;
}

export interface ImageInputs {
  depiction: string;
}

export interface EmailInputs {
  recipient: string;
  purpose: string;
  keyPoints: string;
}

// Union type for the API route payload
export type GenerateRequest =
  | { tab: 'text'; inputs: TextInputs }
  | { tab: 'image'; inputs: ImageInputs }
  | { tab: 'email'; inputs: EmailInputs };

export interface GenerateResponse {
  content: string;
}

export interface GenerateErrorResponse {
  error: string;
}

export interface LibraryPrompt {
  id: string;
  tab: ActiveTab;
  title: string;
  inputs: TextInputs | ImageInputs | EmailInputs;
}

// Social media posting types

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
