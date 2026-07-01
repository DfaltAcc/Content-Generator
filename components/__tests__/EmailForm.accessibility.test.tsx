/**
 * Accessibility tests for EmailForm component
 * Validates: Requirements 8.5
 *
 * Requirement 8.5: WHEN a form is submitted, THE App SHALL associate all form
 * inputs with descriptive labels so that screen readers can identify each field.
 *
 * Uses jest-axe to assert no WCAG 2.1 AA violations.
 *
 * Note: The `color-contrast` rule is excluded because jsdom does not implement
 * HTMLCanvasElement.getContext, which axe-core requires for contrast analysis.
 * Colour contrast must be verified through visual/manual review or a real browser.
 */

import { act } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import EmailForm from '../EmailForm';
import type { EmailInputs } from '@/types';

expect.extend(toHaveNoViolations);

/** axe options shared across all tests: WCAG 2.1 AA, colour-contrast excluded (jsdom limitation) */
const axeOptions = {
  runOnly: {
    type: 'tag' as const,
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
  rules: {
    'color-contrast': { enabled: false },
  },
};

const defaultInputs: EmailInputs = {
  recipient: '',
  purpose: '',
  keyPoints: '',
};

describe('EmailForm accessibility (Requirement 8.5)', () => {
  it('has no WCAG 2.1 AA violations in the default (idle) state', async () => {
    const { container } = render(
      <EmailForm
        inputs={defaultInputs}
        onChange={jest.fn()}
        onSubmit={jest.fn()}
        isLoading={false}
      />
    );

    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });

  it('has no WCAG 2.1 AA violations while loading', async () => {
    const { container } = render(
      <EmailForm
        inputs={{
          recipient: 'my manager',
          purpose: 'Request a one-on-one meeting',
          keyPoints: 'Career growth, project contributions',
        }}
        onChange={jest.fn()}
        onSubmit={jest.fn()}
        isLoading={true}
      />
    );

    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });

  it('has no WCAG 2.1 AA violations when the validation error is visible', async () => {
    const { container, getByRole } = render(
      <EmailForm
        inputs={{ ...defaultInputs, purpose: '' }}
        onChange={jest.fn()}
        onSubmit={jest.fn()}
        isLoading={false}
      />
    );

    // Trigger the validation state (empty purpose → shows error message)
    await act(async () => {
      fireEvent.submit(
        getByRole('button', { name: /generate/i }).closest('form')!
      );
    });

    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });
});
