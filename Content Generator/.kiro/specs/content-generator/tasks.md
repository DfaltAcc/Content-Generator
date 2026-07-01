# Implementation Plan: Content Generator

## Overview

Implement a Next.js 14 (App Router) web application that generates AI-powered content via the Anthropic Claude API. The app has three tabs (Text, Image Prompt, Email), a Prompt Library, and an Output Panel with Copy/Regenerate controls. All API calls are server-side only. Styling uses CSS Modules with no icon libraries.

## Tasks

- [x] 1. Project setup and shared types
  - Initialise a Next.js 14 App Router project with TypeScript (`npx create-next-app@latest --typescript --app --no-tailwind`)
  - Install dependencies: `@anthropic-ai/sdk`, `fast-check`, `jest`, `@testing-library/react`, `@testing-library/jest-dom`, `jest-axe`, `@types/jest`, `jest-environment-jsdom`
  - Configure Jest with `jest.config.ts` (jsdom environment, module name mapper for CSS Modules, `@testing-library/jest-dom` setup file)
  - Create `types/index.ts` with all shared TypeScript types: `ActiveTab`, `ContentType`, `Tone`, `TextInputs`, `ImageInputs`, `EmailInputs`, `GenerateRequest`, `GenerateResponse`, `GenerateErrorResponse`, `LibraryPrompt`
  - Create `styles/globals.css` with CSS custom properties (design tokens), reset, and base typography
  - Create `.env.example` listing `ANTHROPIC_API_KEY=` with no value
  - Create `.env.local` (gitignored) for local development
  - _Requirements: 7.1, 8.1, 9.1, 9.3_

- [x] 2. Prompt builder library (`lib/prompts.ts`)
  - [x] 2.1 Implement `buildTextPrompt`, `buildImagePrompt`, `buildEmailPrompt`, and `buildPrompt` router in `lib/prompts.ts`
    - Each function takes typed inputs and returns a prompt string as specified in the design
    - `buildPrompt` dispatches to the correct builder via a `switch` on `request.tab`
    - _Requirements: 7.2_

  - [x] 2.2 Write property test for prompt builder — Property 11
    - **Property 11: Prompt builder includes all user inputs**
    - For any `GenerateRequest`, `buildPrompt` output contains every user-supplied string value from `inputs`
    - Use `fc.record` arbitraries for each tab's inputs; assert each string appears in the returned prompt
    - Tag: `// Feature: content-generator, Property 11: Prompt builder includes all user inputs`
    - **Validates: Requirements 7.2**

  - [x] 2.3 Write unit tests for `buildPrompt`
    - Each tab's builder includes all input values in the output string
    - `buildPrompt` routes correctly for `'text'`, `'image'`, and `'email'` tabs
    - _Requirements: 7.2_

- [x] 3. Prompt library data (`lib/promptLibrary.ts`)
  - [x] 3.1 Implement `PROMPT_LIBRARY` static array in `lib/promptLibrary.ts`
    - Minimum 9 entries: 3 Text, 3 Image Prompt, 3 Email — use the illustrative data from the design document
    - Every entry has a non-empty `id`, `title`, `tab`, and a valid `inputs` object matching its tab type
    - _Requirements: 6.3, 6.4_

  - [x] 3.2 Write property test for prompt library data integrity — Property 10
    - **Property 10: Prompt library data integrity**
    - Assert each of the three content types has ≥ 3 prompts
    - Assert every prompt has a non-empty `id`, non-empty `title`, and a valid `inputs` object matching its `tab`
    - Tag: `// Feature: content-generator, Property 10: Prompt library data integrity`
    - **Validates: Requirements 6.3, 6.4**

- [x] 4. Server-side API route (`app/api/generate/route.ts`)
  - [x] 4.1 Implement `POST /api/generate` handler
    - Parse and validate request body; return `400` if `tab` or `inputs` is missing
    - Read `ANTHROPIC_API_KEY` from `process.env` only (never expose to client)
    - Call `buildPrompt` to construct the prompt string
    - Set up a 30-second `AbortController` timeout
    - Call `anthropic.messages.create` with model `claude-3-5-haiku-20241022`, `max_tokens: 1024`
    - On success: return `{ content }` with status `200`
    - On `AbortError`: return `{ error: 'Request timed out after 30 seconds. Please try again.' }` with status `504`
    - On other errors: return `{ error: 'An error occurred while generating content. Please try again.' }` with status `500`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.2 Write unit tests for the API route
    - Returns `400` for missing `tab` or `inputs`
    - Returns `504` with timeout message when `AbortController` fires (mock Anthropic client)
    - Returns `200` with `content` on a successful mocked Anthropic response
    - Returns `500` on a generic Anthropic error
    - _Requirements: 7.1, 7.3, 7.4, 7.5_

- [x] 5. Checkpoint — core logic complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. `TabBar` component
  - [x] 6.1 Implement `components/TabBar.tsx` with CSS Module `TabBar.module.css`
    - Render three tab buttons for `'text'`, `'image'`, `'email'`
    - Use `role="tablist"` on the container, `role="tab"` on each button, `aria-selected` reflecting `activeTab`
    - Apply active styling via CSS Module class when `activeTab` matches
    - Call `onTabChange` with the correct `ActiveTab` value on click
    - Visible focus ring using `--color-accent` on `:focus-visible`
    - _Requirements: 1.1, 1.2, 8.3_

  - [x] 6.2 Write unit tests for `TabBar`
    - Renders three tab buttons with correct labels
    - Active tab has `aria-selected="true"`; others have `aria-selected="false"`
    - Clicking a tab calls `onTabChange` with the correct value
    - _Requirements: 1.1, 1.2_

  - [x] 6.3 Write accessibility test for `TabBar`
    - Run `jest-axe` on the rendered `TabBar`; assert no WCAG 2.1 AA violations
    - _Requirements: 8.3, 8.4_

- [x] 7. `TextForm` component
  - [x] 7.1 Implement `components/TextForm.tsx` with CSS Module `TextForm.module.css`
    - `<select>` for content type with all five options (Blog Post, LinkedIn Post, Tweet Thread, Article Intro, Product Description), with matching `<label>`
    - `<input type="text">` for topic with matching `<label>`
    - `<select>` for tone with all four options (Professional, Casual, Persuasive, Humorous), with matching `<label>`
    - `<button type="submit">` disabled while `isLoading`
    - Inline validation message below topic field when topic is empty on submit attempt
    - Call `onChange` on every field change; call `onSubmit` only when topic is non-empty
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.5_

  - [x] 7.2 Write property test for empty required field — Property 3 (Text tab)
    - **Property 3: Empty required field prevents API call (Text tab)**
    - Generate whitespace-only strings for `topic`; assert validation message is shown and `onSubmit` is not called
    - Tag: `// Feature: content-generator, Property 3: Empty required field prevents API call`
    - **Validates: Requirements 2.5**

  - [x] 7.3 Write unit tests for `TextForm`
    - All five content type options render
    - All four tone options render
    - Validation message appears when topic is empty on submit
    - `onSubmit` is not called when topic is empty
    - `onSubmit` is called with correct inputs when topic is non-empty
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 7.4 Write accessibility test for `TextForm`
    - Run `jest-axe` on the rendered `TextForm`; assert no WCAG 2.1 AA violations
    - _Requirements: 8.5_

- [x] 8. `ImagePromptForm` component
  - [x] 8.1 Implement `components/ImagePromptForm.tsx` with CSS Module `ImagePromptForm.module.css`
    - `<textarea>` for "What to depict" with matching `<label>`
    - `<button type="submit">` disabled while `isLoading`
    - Inline validation message when depiction is empty on submit attempt
    - No style or mood selector fields
    - Call `onChange` on field change; call `onSubmit` only when depiction is non-empty
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.5_

  - [x] 8.2 Write property test for empty required field — Property 3 (Image tab)
    - **Property 3: Empty required field prevents API call (Image tab)**
    - Generate whitespace-only strings for `depiction`; assert validation message shown and `onSubmit` not called
    - Tag: `// Feature: content-generator, Property 3: Empty required field prevents API call`
    - **Validates: Requirements 3.3**

  - [x] 8.3 Write unit tests for `ImagePromptForm`
    - Depiction textarea renders with label
    - No style or mood selector is present
    - Validation message appears when depiction is empty on submit
    - `onSubmit` not called when depiction is empty
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 8.4 Write accessibility test for `ImagePromptForm`
    - Run `jest-axe` on the rendered `ImagePromptForm`; assert no WCAG 2.1 AA violations
    - _Requirements: 8.5_

- [x] 9. `EmailForm` component
  - [x] 9.1 Implement `components/EmailForm.tsx` with CSS Module `EmailForm.module.css`
    - `<input type="text">` for recipient with matching `<label>`
    - `<input type="text">` for purpose with matching `<label>`
    - `<textarea>` for key points with matching `<label>`
    - `<button type="submit">` disabled while `isLoading`
    - Inline validation message when purpose is empty on submit attempt
    - Call `onChange` on field changes; call `onSubmit` only when purpose is non-empty
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.5_

  - [x] 9.2 Write property test for empty required field — Property 3 (Email tab)
    - **Property 3: Empty required field prevents API call (Email tab)**
    - Generate whitespace-only strings for `purpose`; assert validation message shown and `onSubmit` not called
    - Tag: `// Feature: content-generator, Property 3: Empty required field prevents API call`
    - **Validates: Requirements 4.5**

  - [x] 9.3 Write unit tests for `EmailForm`
    - All three fields render with labels
    - Validation message appears when purpose is empty on submit
    - `onSubmit` not called when purpose is empty
    - `onSubmit` called with correct inputs when purpose is non-empty
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 9.4 Write accessibility test for `EmailForm`
    - Run `jest-axe` on the rendered `EmailForm`; assert no WCAG 2.1 AA violations
    - _Requirements: 8.5_

- [x] 10. `OutputPanel` component
  - [x] 10.1 Implement `components/OutputPanel.tsx` with CSS Module `OutputPanel.module.css`
    - Wrap in `<section role="region" aria-label="Generated content" aria-live="polite">`
    - Set `aria-busy="true"` during loading
    - Show "Generating…" loading indicator when `isLoading` is true
    - Show error message styled with `--color-error` when `error` is set
    - Render output text in a `<div style={{ whiteSpace: 'pre-wrap' }}>` when `output` is non-empty
    - Show Copy button and Regenerate button only when `output` is non-empty
    - Copy button label changes to "Copied!" for 2 s when `copyConfirmed` is true
    - Regenerate button is disabled when `isLoading` is true
    - Show empty-state placeholder text when `output`, `error`, and `isLoading` are all falsy
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.3_

  - [x] 10.2 Write property test for output panel buttons — Property 4
    - **Property 4: Output panel shows action buttons when content is present**
    - Generate arbitrary non-empty strings as `output`; assert both Copy and Regenerate buttons are rendered
    - Tag: `// Feature: content-generator, Property 4: Output panel shows action buttons when content is present`
    - **Validates: Requirements 5.1**

  - [x] 10.3 Write property test for copy button — Property 5
    - **Property 5: Copy button writes exact content to clipboard**
    - Generate arbitrary content strings; mock `navigator.clipboard.writeText`; simulate Copy click; assert `writeText` called with the exact string
    - Tag: `// Feature: content-generator, Property 5: Copy button writes exact content to clipboard`
    - **Validates: Requirements 5.2**

  - [x] 10.4 Write property test for loading state — Property 7
    - **Property 7: Loading state is active during any API call**
    - Render `OutputPanel` with `isLoading=true`; assert loading indicator is visible and Regenerate button is disabled
    - Tag: `// Feature: content-generator, Property 7: Loading state is active during any API call`
    - **Validates: Requirements 5.5**

  - [x] 10.5 Write property test for API error message — Property 8
    - **Property 8: API error produces a descriptive message in the Output Panel**
    - Generate arbitrary non-empty error strings; render `OutputPanel` with `error` set; assert a non-empty message is displayed
    - Tag: `// Feature: content-generator, Property 8: API error produces a descriptive message in the Output Panel`
    - **Validates: Requirements 5.6, 7.4**

  - [x] 10.6 Write unit tests for `OutputPanel`
    - Shows loading indicator when `isLoading` is true
    - Shows error message when `error` is set
    - Shows output text with Copy and Regenerate buttons when `output` is non-empty
    - Copy button calls `onCopy`
    - Regenerate button is disabled when `isLoading` is true
    - Shows empty-state placeholder when all props are falsy/empty
    - _Requirements: 5.1, 5.2, 5.5, 5.6_

  - [x] 10.7 Write accessibility test for `OutputPanel`
    - Run `jest-axe` on the rendered `OutputPanel` in each state (loading, error, content, empty); assert no WCAG 2.1 AA violations
    - _Requirements: 8.3, 8.4_

- [x] 11. `PromptLibrary` component
  - [x] 11.1 Implement `components/PromptLibrary.tsx` with CSS Module `PromptLibrary.module.css`
    - Import `PROMPT_LIBRARY` from `lib/promptLibrary.ts`
    - Group and render prompt cards under three headings: Text, Image Prompt, Email
    - Each card displays the prompt `title` as a clickable button
    - On card click, call `onSelectPrompt` with the full `LibraryPrompt` object
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 11.2 Write property test for prompt library click — Property 9
    - **Property 9: Prompt library click switches tab and populates all fields**
    - For each prompt in `PROMPT_LIBRARY`, simulate a click on its card; assert `onSelectPrompt` is called with the correct `LibraryPrompt` object (tab and all inputs match)
    - Tag: `// Feature: content-generator, Property 9: Prompt library click switches tab and populates all fields`
    - **Validates: Requirements 6.2**

  - [x] 11.3 Write unit tests for `PromptLibrary`
    - Renders all 9 prompt cards
    - Clicking a prompt card calls `onSelectPrompt` with the correct data
    - Cards are grouped under the correct headings
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 11.4 Write accessibility test for `PromptLibrary`
    - Run `jest-axe` on the rendered `PromptLibrary`; assert no WCAG 2.1 AA violations
    - _Requirements: 8.3, 8.4_

- [x] 12. Checkpoint — all components complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. `ContentGenerator` root component and application wiring
  - [x] 13.1 Implement `components/ContentGenerator.tsx` with CSS Module `ContentGenerator.module.css`
    - Declare all `AppState` fields using `useState` (or `useReducer`): `activeTab`, `textInputs`, `imageInputs`, `emailInputs`, `output`, `isLoading`, `error`, `copyConfirmed`, `lastRequest`
    - Implement `handleTabChange`: updates `activeTab` without resetting per-tab input state
    - Implement `handleSubmit`: validates inputs, builds `GenerateRequest`, sets `isLoading`, calls `POST /api/generate` with `AbortController` (30 s timeout), updates `output`/`error`, stores `lastRequest`
    - Implement `handleRegenerate`: calls `handleSubmit` with `lastRequest` inputs
    - Implement `handleCopy`: calls `navigator.clipboard.writeText(output)`, sets `copyConfirmed`, resets it after 2 s
    - Implement `handleSelectPrompt`: sets `activeTab` to prompt's `tab` and merges prompt's `inputs` into the correct tab state
    - Render `TabBar`, the active form (`TextForm` / `ImagePromptForm` / `EmailForm`), `OutputPanel`, and `PromptLibrary`
    - Apply two-column desktop layout and single-column mobile layout via CSS Module
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.4, 3.2, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.2, 7.3, 7.4, 8.2_

  - [x] 13.2 Write property test for tab state preservation — Property 1
    - **Property 1: Tab input state is preserved across switches**
    - Generate random inputs for each tab; simulate switching away and back; assert all original input values are unchanged
    - Tag: `// Feature: content-generator, Property 1: Tab input state is preserved across switches`
    - **Validates: Requirements 1.3**

  - [x] 13.3 Write property test for form submission includes all inputs — Property 2
    - **Property 2: Form submission includes all inputs in the API call**
    - Generate random valid inputs per tab; mock `fetch`; submit the form; assert the mocked `fetch` was called with a body whose `buildPrompt` output contains all input strings
    - Tag: `// Feature: content-generator, Property 2: Form submission includes all inputs in the API call`
    - **Validates: Requirements 2.4, 3.2, 4.4, 7.2, 7.3**

  - [x] 13.4 Write property test for regenerate uses same inputs — Property 6
    - **Property 6: Regenerate uses the same inputs as the original request**
    - Generate random inputs; submit; click Regenerate; assert the second mocked `fetch` call payload equals the first
    - Tag: `// Feature: content-generator, Property 6: Regenerate uses the same inputs as the original request`
    - **Validates: Requirements 5.4**

  - [x] 13.5 Write unit/integration tests for `ContentGenerator`
    - Tab switching preserves per-tab input state (Requirements 1.3)
    - Default active tab is Text on initial load (Requirements 1.4)
    - Prompt library click switches tab and populates all fields (Requirements 6.2)
    - Copy confirmation message resets after 2 seconds (Requirements 5.3)
    - Network error displays correct message in Output Panel (Requirements 5.6)
    - _Requirements: 1.3, 1.4, 5.3, 5.6, 6.2_

  - [x] 13.6 Write property test for all inputs have labels — Property 12
    - **Property 12: All form inputs have associated labels**
    - Render each form component (`TextForm`, `ImagePromptForm`, `EmailForm`) and assert every `<input>`, `<select>`, and `<textarea>` has an associated `<label>` via matching `htmlFor`/`id` or `aria-label`
    - Tag: `// Feature: content-generator, Property 12: All form inputs have associated labels`
    - **Validates: Requirements 8.5**

- [x] 14. Root page and layout
  - Update `app/page.tsx` to render `<ContentGenerator />`
  - Update `app/layout.tsx` to import `styles/globals.css`, set `<html lang="en">`, and provide a descriptive `<title>` and `<meta name="description">`
  - Verify the app renders correctly at 375 px, 768 px, 1024 px, and 1440 px viewport widths using responsive CSS in `ContentGenerator.module.css`
  - _Requirements: 1.4, 8.1, 8.2_

- [x] 15. Responsive layout and visual polish
  - Implement single-column mobile layout (< 768 px) and two-column desktop layout (≥ 768 px) in `ContentGenerator.module.css`
  - Ensure all interactive elements have a visible focus ring (`outline: 2px solid var(--color-accent); outline-offset: 2px`) on `:focus-visible`
  - Verify colour contrast for all text/background combinations targets ≥ 4.5:1 (AA)
  - Confirm no icons appear anywhere in the UI
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 16. Final checkpoint — full test suite
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Documentation
  - [x] 17.1 Write `README.md` at the repository root
    - Project description and feature overview
    - Prerequisites (Node.js version, npm/yarn)
    - Setup instructions: clone, install dependencies, configure `.env.local`, run `npm run dev`
    - Environment variable configuration: explain `ANTHROPIC_API_KEY` and reference `.env.example`
    - Description of each feature (tabs, prompt library, output controls)
    - How to run tests (`npm test`)
    - _Requirements: 9.1_

  - [x] 17.2 Verify `.env.example` is committed and lists all required environment variables without real values
    - Confirm `ANTHROPIC_API_KEY=` is present with no value
    - Confirm `.env.local` is listed in `.gitignore`
    - _Requirements: 7.1, 9.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 5, 12, and 16 ensure incremental validation
- Property tests (fast-check) validate universal correctness properties across arbitrary inputs
- Unit tests (Jest + React Testing Library) validate specific examples and edge cases
- Accessibility tests (jest-axe) validate WCAG 2.1 AA compliance for each component
- The API key must never be prefixed with `NEXT_PUBLIC_` — it must remain server-side only
