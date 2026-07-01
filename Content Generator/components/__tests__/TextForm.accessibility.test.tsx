/**
 * Accessibility tests for TextForm component
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
import TextForm from '../TextForm';
import type { TextInputs } from '@/types';

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

const defaultInputs: TextInputs = {
  contentType: 'Blog Post',
  topic: '',
  tone: 'Professional',
};

describe('TextForm accessibility (Requirement 8.5)', () => {
  it('has no WCAG 2.1 AA violations in the default (idle) state', async () => {
    const { container } = render(
      <TextForm
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
      <TextForm
        inputs={{ ...defaultInputs, topic: 'AI trends' }}
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
      <TextForm
        inputs={{ ...defaultInputs, topic: '' }}
        onChange={jest.fn()}
        onSubmit={jest.fn()}
        isLoading={false}
      />
    );

    // Trigger the validation state (empty topic → shows error message)
    await act(async () => {
      fireEvent.submit(
        getByRole('button', { name: /generate/i }).closest('form')!
      );
    });

    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });
});
