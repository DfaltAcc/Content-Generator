// Feature: content-generator, Property 3: Empty required field prevents API call

import * as fc from 'fast-check';
import { render, screen, fireEvent } from '@testing-library/react';
import EmailForm from '../EmailForm';
import type { EmailInputs } from '@/types';

/**
 * Validates: Requirements 4.5
 *
 * Property 3: Empty required field prevents API call (Email tab)
 * For any whitespace-only purpose string, submitting the EmailForm should
 * display a validation error message and must NOT trigger the onSubmit callback.
 */

const defaultInputs: EmailInputs = {
  recipient: '',
  purpose: '',
  keyPoints: '',
};

describe('Property 3: Empty required field prevents API call (Email tab)', () => {
  it('whitespace-only purpose — shows validation message and does not call onSubmit', () => {
    fc.assert(
      fc.property(
        // Generate whitespace-only strings (spaces, tabs, newlines, etc.)
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r', '\u00a0')),
        (whitespaceOnlyPurpose) => {
          const onSubmit = jest.fn();
          const onChange = jest.fn();

          const inputs: EmailInputs = {
            ...defaultInputs,
            purpose: whitespaceOnlyPurpose,
          };

          const { unmount } = render(
            <EmailForm
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
            screen.getByText(/please enter a purpose before generating/i)
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
