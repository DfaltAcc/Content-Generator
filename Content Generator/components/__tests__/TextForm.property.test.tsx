// Feature: content-generator, Property 3: Empty required field prevents API call

import * as fc from 'fast-check';
import { render, screen, fireEvent } from '@testing-library/react';
import TextForm from '../TextForm';
import type { TextInputs } from '@/types';

/**
 * Validates: Requirements 2.5
 *
 * Property 3: Empty required field prevents API call (Text tab)
 * For any whitespace-only topic string, submitting the TextForm should
 * display a validation error message and must NOT trigger the onSubmit callback.
 */

const defaultInputs: TextInputs = {
  contentType: 'Blog Post',
  topic: '',
  tone: 'Professional',
};

describe('Property 3: Empty required field prevents API call (Text tab)', () => {
  it('whitespace-only topic — shows validation message and does not call onSubmit', () => {
    fc.assert(
      fc.property(
        // Generate whitespace-only strings (spaces, tabs, newlines, etc.)
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r', '\u00a0')),
        (whitespaceOnlyTopic) => {
          const onSubmit = jest.fn();
          const onChange = jest.fn();

          const inputs: TextInputs = {
            ...defaultInputs,
            topic: whitespaceOnlyTopic,
          };

          const { unmount } = render(
            <TextForm
              inputs={inputs}
              onChange={onChange}
              onSubmit={onSubmit}
              isLoading={false}
            />
          );

          // Submit the form directly via fireEvent (synchronous, no async overhead)
          const form = screen.getByRole('button', { name: /generate/i }).closest('form')!;
          fireEvent.submit(form);

          // Validation message must be shown
          expect(
            screen.getByText(/please enter a topic before generating/i)
          ).toBeInTheDocument();

          // onSubmit must NOT have been called
          expect(onSubmit).not.toHaveBeenCalled();

          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });
});
