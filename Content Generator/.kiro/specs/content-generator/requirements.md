# Requirements Document

## Introduction

The Content Generator is a web application built for the Clickatell AI Bootcamp (Week 2 project). It allows users to generate AI-powered content across three categories — written text, image prompts, and emails — using the Anthropic Claude API. The app features a tabbed interface where each tab presents context-appropriate input fields, a prompt library for quick-start inspiration, and output controls (Copy and Regenerate) for a smooth user experience.

---

## Glossary

- **App**: The Content Generator web application.
- **Claude_API**: The Anthropic Claude API used to generate all content.
- **Tab**: One of three top-level navigation sections — Text, Image Prompt, or Email.
- **Text_Tab**: The tab for generating written content such as blog posts, LinkedIn posts, tweet threads, article intros, and product descriptions.
- **Image_Prompt_Tab**: The tab for generating detailed, ready-to-use prompts for image generation tools such as Midjourney, DALL-E, or Stable Diffusion.
- **Email_Tab**: The tab for generating a complete email with a subject line and body.
- **Prompt_Library**: A curated set of pre-built prompts that users can click to load into the active tab's input fields.
- **Output_Panel**: The area of the UI that displays the generated content returned by the Claude_API.
- **Tone**: A user-selectable attribute (e.g., Professional, Casual, Persuasive, Humorous) that influences the style of generated text content.
- **Recipient**: The intended audience or addressee of a generated email.

---

## Requirements

### Requirement 1: Tabbed Navigation

**User Story:** As a user, I want to switch between content types using tabs, so that I can access the right input fields for what I want to generate.

#### Acceptance Criteria

1. THE App SHALL display three tabs: Text, Image Prompt, and Email.
2. WHEN a user selects a tab, THE App SHALL display the input fields specific to that tab and hide the input fields of all other tabs.
3. WHEN a user switches tabs, THE App SHALL preserve any previously entered values in the tab they are leaving.
4. THE App SHALL display the Text tab as the default active tab on initial load.

---

### Requirement 2: Text Content Generation

**User Story:** As a user, I want to generate written content by specifying a content type, topic, and tone, so that I can produce ready-to-use copy for various platforms.

#### Acceptance Criteria

1. THE Text_Tab SHALL provide a content type selector with the following options: Blog Post, LinkedIn Post, Tweet Thread, Article Intro, and Product Description.
2. THE Text_Tab SHALL provide a topic or subject text input field.
3. THE Text_Tab SHALL provide a tone selector with the following options: Professional, Casual, Persuasive, and Humorous.
4. WHEN a user submits the Text form, THE App SHALL send the selected content type, topic, and tone to the Claude_API and display the response in the Output_Panel.
5. IF the topic field is empty when the user submits the Text form, THEN THE App SHALL display a validation message and SHALL NOT call the Claude_API.

---

### Requirement 3: Image Prompt Generation

**User Story:** As a user, I want to generate a detailed image generation prompt by describing what I want to depict, so that I can use it directly in tools like Midjourney, DALL-E, or Stable Diffusion.

#### Acceptance Criteria

1. THE Image_Prompt_Tab SHALL provide a single "What to depict" text input field.
2. WHEN a user submits the Image Prompt form, THE App SHALL send the depiction description to the Claude_API and display a detailed, ready-to-use image generation prompt in the Output_Panel.
3. IF the "What to depict" field is empty when the user submits the Image Prompt form, THEN THE App SHALL display a validation message and SHALL NOT call the Claude_API.
4. THE Image_Prompt_Tab SHALL NOT display a style selector or mood selector.

---

### Requirement 4: Email Generation

**User Story:** As a user, I want to generate a complete email by specifying the recipient, purpose, and key points, so that I can quickly draft professional or personal emails.

#### Acceptance Criteria

1. THE Email_Tab SHALL provide a recipient description input field (e.g., "my manager", "a potential client").
2. THE Email_Tab SHALL provide a purpose or subject input field describing the goal of the email.
3. THE Email_Tab SHALL provide a key points text area where users can list the main points to include.
4. WHEN a user submits the Email form, THE App SHALL send the recipient, purpose, and key points to the Claude_API and display a complete email — including a subject line and body — in the Output_Panel.
5. IF the purpose field is empty when the user submits the Email form, THEN THE App SHALL display a validation message and SHALL NOT call the Claude_API.

---

### Requirement 5: Output Panel Controls

**User Story:** As a user, I want to copy or regenerate the output, so that I can use the content or get a fresh variation without re-entering my inputs.

#### Acceptance Criteria

1. WHEN the Output_Panel contains generated content, THE App SHALL display a Copy button and a Regenerate button.
2. WHEN a user clicks the Copy button, THE App SHALL copy the full text of the Output_Panel to the system clipboard.
3. WHEN a user clicks the Copy button and the copy operation succeeds, THE App SHALL display a confirmation message for 2 seconds.
4. WHEN a user clicks the Regenerate button, THE App SHALL call the Claude_API again with the same inputs as the previous request and replace the Output_Panel content with the new response.
5. WHEN the Claude_API is processing a request, THE App SHALL display a loading indicator in the Output_Panel and SHALL disable the Regenerate button until the response is received.
6. IF the Claude_API returns an error, THEN THE App SHALL display a descriptive error message in the Output_Panel.

---

### Requirement 6: Prompt Library

**User Story:** As a user, I want to browse and load pre-built prompts, so that I can quickly start generating content without writing inputs from scratch.

#### Acceptance Criteria

1. THE App SHALL display a Prompt_Library section containing pre-built prompts organised by content type (Text, Image Prompt, Email).
2. WHEN a user clicks a prompt in the Prompt_Library, THE App SHALL switch to the corresponding tab and populate the input fields with the values from that prompt.
3. THE Prompt_Library SHALL contain at least three pre-built prompts for each content type (minimum nine prompts total).
4. THE Prompt_Library SHALL display each prompt with a short descriptive title so users can identify it at a glance.

---

### Requirement 7: Claude API Integration

**User Story:** As a developer, I want all content generation to go through the Anthropic Claude API, so that the app produces high-quality, contextually relevant output.

#### Acceptance Criteria

1. THE App SHALL read the Anthropic API key from an environment variable and SHALL NOT hard-code it in source files.
2. WHEN constructing a request, THE App SHALL build a prompt that incorporates all user-supplied inputs for the active tab.
3. WHEN the Claude_API returns a successful response, THE App SHALL extract the generated text and display it in the Output_Panel within 30 seconds of the request being sent.
4. IF the Claude_API request exceeds 30 seconds without a response, THEN THE App SHALL cancel the request and display a timeout error message in the Output_Panel.
5. THE App SHALL send requests to the Claude_API from a server-side component so that the API key is never exposed to the browser.

---

### Requirement 8: UI Design and Accessibility

**User Story:** As a user, I want a clean, minimal, and modern interface, so that I can focus on generating content without visual distraction.

#### Acceptance Criteria

1. THE App SHALL use a clean, minimal, and modern visual design with no icons.
2. THE App SHALL be responsive and SHALL render correctly on viewport widths from 375px to 1440px.
3. THE App SHALL provide visible focus indicators on all interactive elements to support keyboard navigation.
4. THE App SHALL use sufficient colour contrast on all text elements to meet WCAG 2.1 AA contrast requirements.
5. WHEN a form is submitted, THE App SHALL associate all form inputs with descriptive labels so that screen readers can identify each field.

---

### Requirement 9: Documentation and Source Control

**User Story:** As a bootcamp reviewer, I want the project to be well-documented and hosted on GitHub, so that I can evaluate the code quality and understand how to run the app.

#### Acceptance Criteria

1. THE App SHALL include a README.md file at the repository root with setup instructions, environment variable configuration steps, and a description of each feature.
2. THE App SHALL be pushed to a public GitHub repository.
3. THE App SHALL include a `.env.example` file listing all required environment variables without real values.
