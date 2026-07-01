import type { LibraryPrompt } from '../types';

export const PROMPT_LIBRARY: LibraryPrompt[] = [
  // --- Text (3) ---
  {
    id: 'text-1',
    tab: 'text',
    title: 'LinkedIn thought leadership post',
    inputs: {
      contentType: 'LinkedIn Post',
      topic: 'The future of remote work',
      tone: 'Professional',
    },
  },
  {
    id: 'text-2',
    tab: 'text',
    title: 'Humorous tweet thread about coffee',
    inputs: {
      contentType: 'Tweet Thread',
      topic: 'Why developers run on coffee',
      tone: 'Humorous',
    },
  },
  {
    id: 'text-3',
    tab: 'text',
    title: 'Persuasive product description',
    inputs: {
      contentType: 'Product Description',
      topic: 'Noise-cancelling wireless headphones',
      tone: 'Persuasive',
    },
  },

  // --- Image Prompt (3) ---
  {
    id: 'image-1',
    tab: 'image',
    title: 'Cyberpunk cityscape at night',
    inputs: {
      depiction:
        'A sprawling cyberpunk city at night with neon signs reflecting on wet streets',
    },
  },
  {
    id: 'image-2',
    tab: 'image',
    title: 'Cosy autumn reading nook',
    inputs: {
      depiction:
        'A cosy reading nook by a window with autumn leaves outside, warm lighting, and stacked books',
    },
  },
  {
    id: 'image-3',
    tab: 'image',
    title: 'Minimalist product photography',
    inputs: {
      depiction:
        'A minimalist flat-lay product photo of a white ceramic coffee mug on a marble surface',
    },
  },

  // --- Email (3) ---
  {
    id: 'email-1',
    tab: 'email',
    title: 'Request a meeting with your manager',
    inputs: {
      recipient: 'my manager',
      purpose: 'Request a one-on-one meeting to discuss career growth',
      keyPoints:
        'Recent project contributions, goals for next quarter, request for mentorship',
    },
  },
  {
    id: 'email-2',
    tab: 'email',
    title: 'Follow up with a potential client',
    inputs: {
      recipient: 'a potential client',
      purpose: 'Follow up after an initial sales call',
      keyPoints:
        'Recap of their pain points, how our solution addresses them, next steps and demo offer',
    },
  },
  {
    id: 'email-3',
    tab: 'email',
    title: 'Announce a product launch to subscribers',
    inputs: {
      recipient: 'email subscribers',
      purpose: 'Announce the launch of a new product feature',
      keyPoints:
        'What the feature does, how to access it, early-access discount code, link to documentation',
    },
  },
];
