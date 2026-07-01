# Content Generator

A Next.js web application that generates AI-powered content using the Anthropic Claude API. Built for the Clickatell AI Bootcamp (Week 2 project).

Users can generate written text, image generation prompts, and emails through a clean tabbed interface. A prompt library provides nine pre-built starting points, and an output panel lets users copy or regenerate results without re-entering their inputs.

---

## Features

### Text Tab

Generate written content by selecting a content type, entering a topic, and choosing a tone.

- **Content types:** Blog Post, LinkedIn Post, Tweet Thread, Article Intro, Product Description
- **Tones:** Professional, Casual, Persuasive, Humorous

### Image Prompt Tab

Describe what you want to depict and receive a detailed, ready-to-use prompt for image generation tools like Midjourney, DALL-E, or Stable Diffusion.

### Email Tab

Generate a complete email — including subject line and body — by specifying the recipient, purpose, and key points to include.

### Prompt Library

Nine pre-built prompts (three per tab) let you jump straight into generation without writing inputs from scratch. Clicking a prompt switches to the correct tab and populates all fields automatically.

### Output Panel

- **Copy** — copies the full generated text to your clipboard, with a 2-second confirmation message
- **Regenerate** — calls the API again with the same inputs to get a fresh variation

---

## Prerequisites

- **Node.js** 18.17 or later (LTS recommended)
- **npm** 9+ or **yarn** 1.22+ or **bun** 1.0+
- An [Anthropic API key](https://console.anthropic.com/)

---

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd content-generator
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
bun install
```

### 3. Configure environment variables

Copy the example env file and add your Anthropic API key:

```bash
cp .env.example .env.local
```

Open `.env.local` and set your key:

```
ANTHROPIC_API_KEY=your_api_key_here
```

See [Environment Variables](#environment-variables) below for details.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key, used server-side to call the Claude API |

The API key is read exclusively from `process.env` in a Next.js API route — it is never prefixed with `NEXT_PUBLIC_` and is never sent to the browser.

A template listing all required variables (without values) is provided in `.env.example`. Your `.env.local` file is gitignored and must never be committed.

---

## Running Tests

```bash
npm test
```

This runs the full test suite using Jest, including:

- **Unit tests** — component behaviour and edge cases (React Testing Library)
- **Property-based tests** — universal correctness properties across arbitrary inputs (fast-check)
- **Accessibility tests** — WCAG 2.1 AA compliance for each component (jest-axe)

To run tests in watch mode during development:

```bash
npm run test:watch
```

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx              # Root layout, global CSS import
│   ├── page.tsx                # Single page — renders <ContentGenerator />
│   └── api/generate/
│       └── route.ts            # POST /api/generate — calls Claude API server-side
├── components/
│   ├── ContentGenerator.tsx    # Root component, owns all application state
│   ├── TabBar.tsx              # Tab navigation
│   ├── TextForm.tsx            # Text tab input form
│   ├── ImagePromptForm.tsx     # Image Prompt tab input form
│   ├── EmailForm.tsx           # Email tab input form
│   ├── OutputPanel.tsx         # Generated content display + Copy/Regenerate controls
│   └── PromptLibrary.tsx       # Pre-built prompt cards
├── lib/
│   ├── prompts.ts              # Prompt builder functions (one per tab)
│   └── promptLibrary.ts        # Static prompt library data (9 prompts)
├── styles/
│   └── globals.css             # CSS custom properties, reset, base typography
├── types/
│   └── index.ts                # Shared TypeScript types
├── .env.example                # Environment variable template (no real values)
└── .env.local                  # Your local secrets — gitignored, never commit this
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server at http://localhost:3000 |
| `npm run build` | Build the app for production |
| `npm run start` | Start the production server (requires `npm run build` first) |
| `npm test` | Run the full test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
