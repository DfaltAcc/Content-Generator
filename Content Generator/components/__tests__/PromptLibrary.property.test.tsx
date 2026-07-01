// Feature: content-generator, Property 9: Prompt library click switches tab and populates all fields

import * as fc from 'fast-check';
import { render, screen, fireEvent } from '@testing-library/react';
import PromptLibrary from '../PromptLibrary';
import { PROMPT_LIBRARY } from '@/lib/promptLibrary';
import type { LibraryPrompt } from '@/types';

/**
 * Validates: Requirements 6.2
 *
 * Property 9: Prompt library click switches tab and populates all fields
 * For each prompt in PROMPT_LIBRARY, clicking its card button should call
 * onSelectPrompt with the exact LibraryPrompt object — meaning the tab and
 * all inputs fields match the original prompt data.
 */

describe('Property 9: Prompt library click switches tab and populates all fields', () => {
  it('clicking any prompt card calls onSelectPrompt with the correct LibraryPrompt object', () => {
    fc.assert(
      fc.property(
        // Pick an arbitrary prompt from the library by index
        fc.integer({ min: 0, max: PROMPT_LIBRARY.length - 1 }),
        (index) => {
          const expectedPrompt: LibraryPrompt = PROMPT_LIBRARY[index];
          const onSelectPrompt = jest.fn();

          const { unmount } = render(
            <PromptLibrary onSelectPrompt={onSelectPrompt} />
          );

          // Find the card button by its title text and click it
          const cardButton = screen.getByRole('button', { name: expectedPrompt.title });
          fireEvent.click(cardButton);

          // onSelectPrompt must have been called exactly once
          expect(onSelectPrompt).toHaveBeenCalledTimes(1);

          // The argument must be the exact LibraryPrompt object
          const received: LibraryPrompt = onSelectPrompt.mock.calls[0][0];

          // Tab must match
          expect(received.tab).toBe(expectedPrompt.tab);

          // id and title must match
          expect(received.id).toBe(expectedPrompt.id);
          expect(received.title).toBe(expectedPrompt.title);

          // All inputs fields must match exactly
          expect(received.inputs).toEqual(expectedPrompt.inputs);

          unmount();
        }
      ),
      { numRuns: PROMPT_LIBRARY.length }
    );
  });

  it('every prompt in the library triggers onSelectPrompt with matching tab', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PROMPT_LIBRARY),
        (expectedPrompt) => {
          const onSelectPrompt = jest.fn();

          const { unmount } = render(
            <PromptLibrary onSelectPrompt={onSelectPrompt} />
          );

          const cardButton = screen.getByRole('button', { name: expectedPrompt.title });
          fireEvent.click(cardButton);

          expect(onSelectPrompt).toHaveBeenCalledTimes(1);

          const received: LibraryPrompt = onSelectPrompt.mock.calls[0][0];

          // The tab returned must match the prompt's tab — this is what drives tab switching
          expect(received.tab).toBe(expectedPrompt.tab);

          // All inputs must be deeply equal — this is what populates the form fields
          expect(received.inputs).toEqual(expectedPrompt.inputs);

          unmount();
        }
      ),
      { numRuns: PROMPT_LIBRARY.length }
    );
  });

  it('onSelectPrompt receives the full LibraryPrompt object with all required fields', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PROMPT_LIBRARY),
        (expectedPrompt) => {
          const onSelectPrompt = jest.fn();

          const { unmount } = render(
            <PromptLibrary onSelectPrompt={onSelectPrompt} />
          );

          const cardButton = screen.getByRole('button', { name: expectedPrompt.title });
          fireEvent.click(cardButton);

          const received: LibraryPrompt = onSelectPrompt.mock.calls[0][0];

          // The received object must have all required LibraryPrompt fields
          expect(received).toHaveProperty('id');
          expect(received).toHaveProperty('tab');
          expect(received).toHaveProperty('title');
          expect(received).toHaveProperty('inputs');

          // id and title must be non-empty strings
          expect(typeof received.id).toBe('string');
          expect(received.id.length).toBeGreaterThan(0);
          expect(typeof received.title).toBe('string');
          expect(received.title.length).toBeGreaterThan(0);

          // The full object must deeply equal the expected prompt
          expect(received).toEqual(expectedPrompt);

          unmount();
        }
      ),
      { numRuns: PROMPT_LIBRARY.length }
    );
  });
});
