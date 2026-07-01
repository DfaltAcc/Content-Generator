// Feature: content-generator, Property 10: Prompt library data integrity

import * as fc from 'fast-check';
import { PROMPT_LIBRARY } from '../promptLibrary';
import type { ActiveTab, TextInputs, ImageInputs, EmailInputs } from '../../types/index';

/**
 * Validates: Requirements 6.3, 6.4
 *
 * Property 10: Prompt library data integrity
 * Each of the three content types has ≥ 3 prompts.
 * Every prompt has a non-empty id, non-empty title, and a valid inputs
 * object matching its tab.
 */

const TABS: ActiveTab[] = ['text', 'image', 'email'];

describe('Property 10: Prompt library data integrity', () => {
  it('each tab has at least 3 prompts in PROMPT_LIBRARY', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TABS), (tab) => {
        const count = PROMPT_LIBRARY.filter((p) => p.tab === tab).length;
        expect(count).toBeGreaterThanOrEqual(3);
      })
    );
  });

  it('every prompt has a non-empty id and non-empty title', () => {
    fc.assert(
      fc.property(fc.constant(PROMPT_LIBRARY), (library) => {
        for (const prompt of library) {
          expect(typeof prompt.id).toBe('string');
          expect(prompt.id.length).toBeGreaterThan(0);

          expect(typeof prompt.title).toBe('string');
          expect(prompt.title.length).toBeGreaterThan(0);
        }
      })
    );
  });

  it('every prompt has a valid inputs object matching its tab', () => {
    fc.assert(
      fc.property(fc.constant(PROMPT_LIBRARY), (library) => {
        for (const prompt of library) {
          expect(prompt.inputs).toBeDefined();
          expect(typeof prompt.inputs).toBe('object');

          if (prompt.tab === 'text') {
            const inputs = prompt.inputs as TextInputs;
            expect(inputs).toHaveProperty('contentType');
            expect(inputs).toHaveProperty('topic');
            expect(inputs).toHaveProperty('tone');
          } else if (prompt.tab === 'image') {
            const inputs = prompt.inputs as ImageInputs;
            expect(inputs).toHaveProperty('depiction');
          } else if (prompt.tab === 'email') {
            const inputs = prompt.inputs as EmailInputs;
            expect(inputs).toHaveProperty('recipient');
            expect(inputs).toHaveProperty('purpose');
            expect(inputs).toHaveProperty('keyPoints');
          }
        }
      })
    );
  });
});
