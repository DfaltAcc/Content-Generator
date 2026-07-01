# Design Document — Content Generator

## Overview

The Content Generator is a Next.js web application that lets users produce AI-generated content across three categories: written text, image prompts, and emails. All generation is powered by the Anthropic Claude API, called exclusively from server-side API routes so the API key is never exposed to the browser.

The UI is a single-page application with three tabs (Text, Image Prompt, Email). Each tab has its own input form. A Prompt Library panel provides nine pre-built prompts (three per tab) that users can click to auto-populate the active tab's fields. An Output Panel displays the generated result with Copy and Regenerate controls.

The design prioritises simplicity: no icons, clean typography, a neutral colour palette, and a layout that works from 375 px to 1440 px.

---

## Architecture

### High-Level Architecture

```
Browser (React / Next.js Client Components)
  │
  │  POST /api/generate
  │  { tab, inputs }
  ▼
Next.js API Route (Server-Side)
  │  Reads ANTHROPIC_API_KEY from process.env
  │  Builds prompt string
  │  Sets 30-second AbortController timeout
  ▼
Anthropic Claude API
  │  Returns generated text
  ▼
Next.js API Route
  │  Extracts text from response
  ▼
Browser
  Renders text in Output Panel
```

### Technology Choices

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server-side API routes keep the API key secure; React for UI |
| Language | TypeScript | Type safety for prompt data structures and API payloads |
| Styling | CSS Modules | Scoped styles, no runtime overhead, no icon library needed |
| AI API | Anthropic Claude (`claude-3-5-haiku-20241022`) | Fast, cost-effective, high-quality text generation |
| HTTP client | Native `fetch` with `AbortController` | No extra dependency; built-in timeout support |
| State management | React `useState` / `useReducer` | No external state library needed for this scope |

### Directory Structure

```
/
├── app/
│   ├── layout.tsx          # Root layout, global CSS import
│   ├── page.tsx            # Single page — renders <ContentGenerator />
│   └── api/
│       └── generate/
│           └── route.ts    # POST handler — calls Claude API
├── components/
│   ├── ContentGenerator.tsx  # Root component, owns all state
│   ├── TabBar.tsx            # Tab navigation
│   ├── TextForm.tsx          # Text tab inputs
│   ├── ImagePromptForm.tsx   # Image Prompt tab inputs
│   ├── EmailForm.tsx         # Email tab inputs
│   ├── OutputPanel.tsx       # Generated content display + controls
│   └── PromptLibrary.tsx     # Pre-built prompt cards
├── lib/
│   ├── prompts.ts            # Prompt builder functions (one per tab)
│   └── promptLibrary.ts      # Static prompt library data
├── styles/
│   └── globals.css           # CSS custom properties, reset, typography
├── types/
│   └── index.ts              # Shared TypeScript types
├── .env.local                # ANTHROPIC_API_KEY (gitignored)
├── .env.example              # Template with variable names, no values
└── README.md
```

---

## Components and Interfaces

### Component Tree

```
ContentGenerator (state owner)
├── TabBar
├── TextForm          (shown when activeTab === 'text')
├── ImagePromptForm   (shown when activeTab === 'image')
├── EmailForm         (shown when activeTab === 'email')
├── PromptLibrary
└── OutputPanel
```

### ContentGenerator

The root client component. Owns all application state and passes props/callbacks down.

**State:**
```typescript
type ActiveTab = 'text' | 'image' | 'email';

interface TextInputs {
  contentType: ContentType;
  topic: string;
  tone: Tone;
}

interface ImageInputs {
  depiction: string;
}

interface EmailInputs {
  recipient: string;
  purpose: string;
  keyPoints: string;
}

interface AppState {
  activeTab: ActiveTab;
  textInputs: TextInputs;
  imageInputs: ImageInputs;
  emailInputs: EmailInputs;
  output: string;
  isLoading: boolean;
  error: string | null;
  copyConfirmed: boolean;
  // Stores the last submitted inputs for Regenerate
  lastRequest: GenerateRequest | null;
}
```

**Key responsibilities:**
- Switching tabs (preserves per-tab input state)
- Receiving form submissions and calling `/api/generate`
- Handling the 30-second timeout via `AbortController`
- Storing `lastRequest` so Regenerate can replay the same call
- Managing `copyConfirmed` timer (2-second reset)

### TabBar

Renders three tab buttons. Receives `activeTab` and `onTabChange` as props. Uses `role="tablist"` / `role="tab"` / `aria-selected` for accessibility.

```typescript
interface TabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}
```

### TextForm

```typescript
interface TextFormProps {
  inputs: TextInputs;
  onChange: (inputs: TextInputs) => void;
  onSubmit: (inputs: TextInputs) => void;
  isLoading: boolean;
}
```

Renders:
- `<select>` for content type (Blog Post, LinkedIn Post, Tweet Thread, Article Intro, Product Description)
- `<input type="text">` for topic
- `<select>` for tone (Professional, Casual, Persuasive, Humorous)
- `<button type="submit">` — disabled while `isLoading`
- Inline validation message when topic is empty on submit attempt

### ImagePromptForm

```typescript
interface ImagePromptFormProps {
  inputs: ImageInputs;
  onChange: (inputs: ImageInputs) => void;
  onSubmit: (inputs: ImageInputs) => void;
  isLoading: boolean;
}
```

Renders:
- `<textarea>` for "What to depict"
- `<button type="submit">` — disabled while `isLoading`
- Inline validation message when depiction is empty on submit attempt

### EmailForm

```typescript
interface EmailFormProps {
  inputs: EmailInputs;
  onChange: (inputs: EmailInputs) => void;
  onSubmit: (inputs: EmailInputs) => void;
  isLoading: boolean;
}
```

Renders:
- `<input type="text">` for recipient
- `<input type="text">` for purpose
- `<textarea>` for key points
- `<button type="submit">` — disabled while `isLoading`
- Inline validation message when purpose is empty on submit attempt

### OutputPanel

```typescript
interface OutputPanelProps {
  output: string;
  isLoading: boolean;
  error: string | null;
  copyConfirmed: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
}
```

Renders:
- Loading spinner (text-based, e.g. "Generating…") when `isLoading`
- Error message when `error` is set
- Generated text in a `<pre>` or `<div>` with `white-space: pre-wrap` when `output` is set
- Copy button (shows "Copied!" for 2 s when `copyConfirmed`)
- Regenerate button (disabled when `isLoading`)
- Empty state placeholder when none of the above apply

### PromptLibrary

```typescript
interface PromptLibraryProps {
  onSelectPrompt: (prompt: LibraryPrompt) => void;
}
```

Renders prompt cards grouped under three headings (Text, Image Prompt, Email). Each card shows the prompt title. Clicking a card calls `onSelectPrompt`, which causes `ContentGenerator` to switch to the correct tab and populate the inputs.

---

## Data Models

### TypeScript Types

```typescript
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
```

### Prompt Library Data

Stored as a static array in `lib/promptLibrary.ts`. Minimum 9 entries, 3 per tab.

```typescript
// lib/promptLibrary.ts  (illustrative — actual titles/values TBD during implementation)

export const PROMPT_LIBRARY: LibraryPrompt[] = [
  // --- Text (3) ---
  {
    id: 'text-1',
    tab: 'text',
    title: 'LinkedIn thought leadership post',
    inputs: { contentType: 'LinkedIn Post', topic: 'The future of remote work', tone: 'Professional' },
  },
  {
    id: 'text-2',
    tab: 'text',
    title: 'Humorous tweet thread about coffee',
    inputs: { contentType: 'Tweet Thread', topic: 'Why developers run on coffee', tone: 'Humorous' },
  },
  {
    id: 'text-3',
    tab: 'text',
    title: 'Persuasive product description',
    inputs: { contentType: 'Product Description', topic: 'Noise-cancelling wireless headphones', tone: 'Persuasive' },
  },

  // --- Image Prompt (3) ---
  {
    id: 'image-1',
    tab: 'image',
    title: 'Cyberpunk cityscape at night',
    inputs: { depiction: 'A sprawling cyberpunk city at night with neon signs reflecting on wet streets' },
  },
  {
    id: 'image-2',
    tab: 'image',
    title: 'Cosy autumn reading nook',
    inputs: { depiction: 'A cosy reading nook by a window with autumn leaves outside, warm lighting, and stacked books' },
  },
  {
    id: 'image-3',
    tab: 'image',
    title: 'Minimalist product photography',
    inputs: { depiction: 'A minimalist flat-lay product photo of a white ceramic coffee mug on a marble surface' },
  },

  // --- Email (3) ---
  {
    id: 'email-1',
    tab: 'email',
    title: 'Request a meeting with your manager',
    inputs: { recipient: 'my manager', purpose: 'Request a one-on-one meeting to discuss career growth', keyPoints: 'Recent project contributions, goals for next quarter, request for mentorship' },
  },
  {
    id: 'email-2',
    tab: 'email',
    title: 'Follow up with a potential client',
    inputs: { recipient: 'a potential client', purpose: 'Follow up after an initial sales call', keyPoints: 'Recap of their pain points, how our solution addresses them, next steps and demo offer' },
  },
  {
    id: 'email-3',
    tab: 'email',
    title: 'Announce a product launch to subscribers',
    inputs: { recipient: 'email subscribers', purpose: 'Announce the launch of a new product feature', keyPoints: 'What the feature does, how to access it, early-access discount code, link to documentation' },
  },
];
```

### API Route Payload

**Request** — `POST /api/generate`
```json
{
  "tab": "text",
  "inputs": {
    "contentType": "Blog Post",
    "topic": "The rise of AI coding assistants",
    "tone": "Professional"
  }
}
```

**Success Response** — `200 OK`
```json
{
  "content": "## The Rise of AI Coding Assistants\n\n..."
}
```

**Error Response** — `4xx / 5xx`
```json
{
  "error": "Request timed out after 30 seconds. Please try again."
}
```

---

## API Route Design

### `POST /api/generate` — `app/api/generate/route.ts`

```typescript
// Pseudocode — full implementation in tasks phase

export async function POST(request: Request): Promise<Response> {
  // 1. Parse and validate request body
  const body: GenerateRequest = await request.json();
  if (!body.tab || !body.inputs) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 2. Build the prompt string
  const prompt = buildPrompt(body);

  // 3. Set up 30-second AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    // 4. Call Anthropic API (server-side only — API key from process.env)
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create(
      {
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal }
    );

    // 5. Extract text content
    const content = extractText(message);
    return Response.json({ content }, { status: 200 });

  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return Response.json(
        { error: 'Request timed out after 30 seconds. Please try again.' },
        { status: 504 }
      );
    }
    return Response.json(
      { error: 'An error occurred while generating content. Please try again.' },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Security notes:**
- `ANTHROPIC_API_KEY` is read from `process.env` — only available server-side in Next.js (not prefixed with `NEXT_PUBLIC_`)
- The route validates the request body before calling the API
- No user input is ever reflected back unsanitised as HTML (output is rendered as plain text)

---

## Prompt Construction

All prompt building lives in `lib/prompts.ts`. Each function takes typed inputs and returns a string.

### Text Prompt

```typescript
export function buildTextPrompt(inputs: TextInputs): string {
  return `You are an expert copywriter. Write a ${inputs.contentType} about the following topic.

Topic: ${inputs.topic}
Tone: ${inputs.tone}

Requirements:
- Match the tone exactly: ${inputs.tone}
- Format appropriately for a ${inputs.contentType}
- Be engaging, clear, and ready to publish
- Do not include any preamble or meta-commentary — output only the content itself`;
}
```

### Image Prompt

```typescript
export function buildImagePrompt(inputs: ImageInputs): string {
  return `You are an expert prompt engineer for AI image generation tools such as Midjourney, DALL-E, and Stable Diffusion.

The user wants to depict: ${inputs.depiction}

Generate a single, detailed, ready-to-use image generation prompt. Include:
- Subject and composition
- Lighting and atmosphere
- Art style or medium
- Camera angle or perspective (if relevant)
- Quality modifiers (e.g. "highly detailed", "8k", "photorealistic")

Output only the prompt text itself — no explanation, no preamble.`;
}
```

### Email Prompt

```typescript
export function buildEmailPrompt(inputs: EmailInputs): string {
  const keyPointsSection = inputs.keyPoints.trim()
    ? `\nKey points to include:\n${inputs.keyPoints}`
    : '';

  return `You are an expert business writer. Write a complete, professional email.

Recipient: ${inputs.recipient}
Purpose: ${inputs.purpose}${keyPointsSection}

Requirements:
- Begin with a subject line in the format "Subject: ..."
- Follow with a blank line, then the email body
- Use an appropriate greeting and sign-off
- Be concise and clear
- Do not include any preamble or meta-commentary — output only the email itself`;
}
```

### Prompt Router

```typescript
export function buildPrompt(request: GenerateRequest): string {
  switch (request.tab) {
    case 'text':  return buildTextPrompt(request.inputs);
    case 'image': return buildImagePrompt(request.inputs);
    case 'email': return buildEmailPrompt(request.inputs);
  }
}
```

---

## UI Layout

### Desktop Layout (≥ 768 px)

```
┌─────────────────────────────────────────────────────────────┐
│  Content Generator                                          │
├─────────────────────────────────────────────────────────────┤
│  [ Text ]  [ Image Prompt ]  [ Email ]                      │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│   Input Form             │   Output Panel                   │
│   (active tab fields)    │   (generated content)            │
│                          │                                  │
│   [ Generate ]           │   [ Copy ]  [ Regenerate ]       │
│                          │                                  │
├──────────────────────────┴──────────────────────────────────┤
│  Prompt Library                                             │
│  Text: [card] [card] [card]                                 │
│  Image Prompt: [card] [card] [card]                         │
│  Email: [card] [card] [card]                                │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout (< 768 px)

```
┌─────────────────────────┐
│  Content Generator      │
├─────────────────────────┤
│  [ Text ] [Image] [Email]│
├─────────────────────────┤
│  Input Form             │
│  (active tab fields)    │
│  [ Generate ]           │
├─────────────────────────┤
│  Output Panel           │
│  (generated content)    │
│  [ Copy ]  [ Regenerate]│
├─────────────────────────┤
│  Prompt Library         │
│  Text:                  │
│  [card] [card] [card]   │
│  Image Prompt:          │
│  [card] [card] [card]   │
│  Email:                 │
│  [card] [card] [card]   │
└─────────────────────────┘
```

### CSS Design Tokens

```css
/* styles/globals.css */
:root {
  --color-bg:          #ffffff;
  --color-surface:     #f8f9fa;
  --color-border:      #e2e8f0;
  --color-text:        #1a202c;
  --color-text-muted:  #718096;
  --color-primary:     #2d3748;
  --color-primary-hover: #1a202c;
  --color-accent:      #4a90d9;
  --color-error:       #e53e3e;
  --color-success:     #38a169;

  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  --font-sans: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'Courier New', Courier, monospace;
}
```

### Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| 375 px – 767 px | Single column, stacked vertically |
| 768 px – 1023 px | Two-column (form left, output right), prompt library below |
| 1024 px – 1440 px | Two-column with wider output panel, prompt library below |

### Accessibility

- All `<input>`, `<select>`, `<textarea>` elements have a corresponding `<label>` with matching `htmlFor` / `id`
- Tab bar uses `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- Output panel uses `role="region"` with `aria-label="Generated content"` and `aria-live="polite"` so screen readers announce new content
- Focus ring: `outline: 2px solid var(--color-accent); outline-offset: 2px` on `:focus-visible`
- Colour contrast: all text/background combinations target ≥ 4.5:1 (AA)
- Loading state: `aria-busy="true"` on the output region during generation

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Tab input state is preserved across switches

*For any* tab with any set of user-entered input values, switching to a different tab and then switching back should result in all original input values being unchanged.

**Validates: Requirements 1.3**

---

### Property 2: Form submission includes all inputs in the API call

*For any* valid combination of inputs for any tab (text, image, or email), submitting the form should result in an API call whose prompt string contains all user-supplied input values.

**Validates: Requirements 2.4, 3.2, 4.4, 7.2, 7.3**

---

### Property 3: Empty required field prevents API call

*For any* tab, if the required field (topic for Text, depiction for Image Prompt, purpose for Email) is empty or contains only whitespace, submitting the form should display a validation error message and must not trigger an API call.

**Validates: Requirements 2.5, 3.3, 4.5**

---

### Property 4: Output panel shows action buttons when content is present

*For any* non-empty generated content string, the Output Panel should display both the Copy button and the Regenerate button.

**Validates: Requirements 5.1**

---

### Property 5: Copy button writes exact content to clipboard

*For any* content string displayed in the Output Panel, clicking the Copy button should call `navigator.clipboard.writeText` with that exact string.

**Validates: Requirements 5.2**

---

### Property 6: Regenerate uses the same inputs as the original request

*For any* set of form inputs that produced a generation, clicking Regenerate should call the API with a request payload identical to the original submission.

**Validates: Requirements 5.4**

---

### Property 7: Loading state is active during any API call

*For any* API request in progress, the Output Panel should display a loading indicator and the Regenerate button should be disabled until the response is received.

**Validates: Requirements 5.5**

---

### Property 8: API error produces a descriptive message in the Output Panel

*For any* error returned by the API route (network failure, 4xx, 5xx, or timeout), the Output Panel should display a non-empty, human-readable error message.

**Validates: Requirements 5.6, 7.4**

---

### Property 9: Prompt library click switches tab and populates all fields

*For any* prompt in the library, clicking it should (a) set the active tab to the prompt's `tab` value and (b) populate every input field of that tab with the corresponding values from the prompt's `inputs` object.

**Validates: Requirements 6.2**

---

### Property 10: Prompt library data integrity

*For any* content type (Text, Image Prompt, Email), the prompt library should contain at least three prompts, and every prompt in the library should have a non-empty `id`, a non-empty `title`, and a valid `inputs` object matching its tab type.

**Validates: Requirements 6.3, 6.4**

---

### Property 11: Prompt builder includes all user inputs

*For any* `GenerateRequest`, the string returned by `buildPrompt` should contain every user-supplied string value from the `inputs` object.

**Validates: Requirements 7.2**

---

### Property 12: All form inputs have associated labels

*For any* form rendered by the app, every `<input>`, `<select>`, and `<textarea>` element should have an associated `<label>` element (via matching `htmlFor`/`id` pair or `aria-label` attribute).

**Validates: Requirements 8.5**

---

## Error Handling

| Scenario | Handling |
|---|---|
| Required field empty on submit | Inline validation message below the field; API not called |
| API key missing (`ANTHROPIC_API_KEY` not set) | Route returns 500 with "Server configuration error" |
| Anthropic API returns 4xx (bad request) | Route returns 500 with generic error message |
| Anthropic API returns 5xx | Route returns 500 with "Service temporarily unavailable" |
| Request exceeds 30 seconds | `AbortController` fires; route returns 504 with timeout message |
| Network error (fetch fails) | Client catches error; displays "Network error — please check your connection" |
| Clipboard API unavailable | `onCopy` catches the rejection; displays "Copy failed — please select and copy manually" |

All error messages are displayed in the Output Panel, replacing any previous content. Errors are never shown as browser alerts.

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

Focus on specific examples, edge cases, and component behaviour:

- **TabBar**: renders three tabs; correct tab is marked active; `onTabChange` fires on click
- **TextForm**: all content type and tone options render; validation fires on empty topic submit; `onSubmit` not called when topic is empty
- **ImagePromptForm**: depiction field renders; validation fires on empty submit
- **EmailForm**: all three fields render; validation fires on empty purpose submit
- **OutputPanel**: shows loading state; shows error state; shows content with Copy/Regenerate buttons; Copy button triggers `onCopy`; Regenerate disabled during loading
- **PromptLibrary**: renders all 9 prompts; clicking a prompt calls `onSelectPrompt` with correct data
- **ContentGenerator (integration)**: tab switching preserves input state; prompt library click switches tab and populates fields; copy confirmation resets after 2 seconds
- **`buildPrompt`**: each tab's prompt builder includes all input values in the output string
- **`/api/generate` route**: returns 400 for missing body; returns 504 on timeout; returns 200 with content on success (mock Anthropic client)

### Property-Based Tests (fast-check)

Property-based testing is appropriate here because several behaviours must hold universally across a large input space (arbitrary strings, arbitrary prompt combinations, arbitrary content values). Each property test runs a minimum of 100 iterations.

**Library**: [`fast-check`](https://github.com/dubzzz/fast-check)

Tag format: `// Feature: content-generator, Property {N}: {property_text}`

| Property | Test description |
|---|---|
| P1 — Tab state preservation | Generate random inputs for each tab; switch away; switch back; assert inputs unchanged |
| P2 — Form submission includes all inputs | Generate random valid inputs per tab; call `buildPrompt`; assert all input strings appear in result |
| P3 — Empty required field prevents API call | Generate whitespace-only strings for required fields; assert validation error shown, API mock not called |
| P4 — Buttons present when content exists | Generate arbitrary non-empty strings as output; assert Copy and Regenerate buttons render |
| P5 — Copy writes exact content | Generate arbitrary content strings; simulate copy click; assert `writeText` called with exact string |
| P6 — Regenerate uses same inputs | Generate random inputs; submit; click Regenerate; assert second API call payload equals first |
| P7 — Loading state during API call | For any pending API call, assert loading indicator visible and Regenerate disabled |
| P8 — API error shows message | Generate arbitrary error objects; assert Output Panel shows non-empty message |
| P9 — Prompt library populates fields | For each prompt in library, click it; assert tab and all fields match prompt data |
| P10 — Prompt library data integrity | Assert each content type has ≥ 3 prompts; every prompt has non-empty id, title, and valid inputs |
| P11 — Prompt builder includes all inputs | Generate random string inputs; call `buildPrompt`; assert each input string appears in output |
| P12 — All inputs have labels | For each rendered form, assert every input/select/textarea has an associated label |

### Accessibility Tests

- Run `axe-core` (via `jest-axe`) on each rendered form and the full page
- Verify no WCAG 2.1 AA violations are reported

### Manual / Visual Tests

- Responsive layout at 375 px, 768 px, 1024 px, 1440 px
- Keyboard navigation through all interactive elements
- Screen reader announcement of generated content (VoiceOver / NVDA)
- Visual confirmation that no icons appear anywhere in the UI
