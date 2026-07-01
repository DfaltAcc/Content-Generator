// Feature: content-generator, Property 3: Empty required field prevents API call

import * as fc from 'fast-check';
import { render, screen, fireEvent } from '@testing-library/react';
import ImagePromptForm from '../ImagePromptForm';
import type { ImageInputs } from '@/types';

/**
 * Validates: Requirements 3.3
 *
 * Property 3: Empty required field prevents API call (Image tab)
 * For any whitespace-only depiction string, submitting the ImagePromptForm should
 * display a validation error message and must NOT trigger the onSubmit callback.
 */

const defaultInputs: ImageInputs = {
  depiction: '',
};

describe('Property 3: Empty required field prevents API call (Image tab)', () => {
  it('whitespace-only depiction — shows validation message and does not call onSubmit', () => {
    fc.assert(
      fc.property(
        // Generate whitespace-only strings (spaces, tabs, newlines, etc.)
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r', '\u00a0')),
        (whitespaceOnlyDepiction) => {
          const onSubmit = jest.fn();
          const onChange = jest.fn();

          const inputs: ImageInputs = {
            ...defaultInputs,
            depiction: whitespaceOnlyDepiction,
          };

          const { unmount } = render(
            <ImagePromptForm
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
            screen.getByText(/please describe what to depict before generating/i)
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
