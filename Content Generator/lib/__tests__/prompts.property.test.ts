// Feature: content-generator, Property 11: Prompt builder includes all user inputs

import * as fc from 'fast-check';
import { buildPrompt } from '../prompts';
import type { ContentType, Tone } from '../../types/index';

/**
 * Validates: Requirements 7.2
 *
 * Property 11: Prompt builder includes all user inputs
 * For any GenerateRequest, buildPrompt output contains every user-supplied
 * string value from inputs.
 */

const contentTypes: ContentType[] = [
  'Blog Post',
  'LinkedIn Post',
  'Tweet Thread',
  'Article Intro',
  'Product Description',
];

const tones: Tone[] = ['Professional', 'Casual', 'Persuasive', 'Humorous'];

describe('Property 11: Prompt builder includes all user inputs', () => {
  it('text tab — buildPrompt output contains contentType, topic, and tone', () => {
    fc.assert(
      fc.property(
        fc.record({
          contentType: fc.constantFrom(...contentTypes),
          topic: fc.string({ minLength: 1 }),
          tone: fc.constantFrom(...tones),
        }),
        (inputs) => {
          const prompt = buildPrompt({ tab: 'text', inputs });

          expect(prompt).toContain(inputs.contentType);
          expect(prompt).toContain(inputs.topic);
          expect(prompt).toContain(inputs.tone);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('image tab — buildPrompt output contains depiction', () => {
    fc.assert(
      fc.property(
        fc.record({
          depiction: fc.string({ minLength: 1 }),
        }),
        (inputs) => {
          const prompt = buildPrompt({ tab: 'image', inputs });

          expect(prompt).toContain(inputs.depiction);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('email tab — buildPrompt output contains recipient, purpose, and keyPoints', () => {
    fc.assert(
      fc.property(
        fc.record({
          recipient: fc.string({ minLength: 1 }),
          purpose: fc.string({ minLength: 1 }),
          // Use a non-whitespace-only string so the keyPoints section is included
          keyPoints: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        }),
        (inputs) => {
          const prompt = buildPrompt({ tab: 'email', inputs });

          expect(prompt).toContain(inputs.recipient);
          expect(prompt).toContain(inputs.purpose);
          expect(prompt).toContain(inputs.keyPoints);
        }
      ),
      { numRuns: 20 }
    );
  });
});
