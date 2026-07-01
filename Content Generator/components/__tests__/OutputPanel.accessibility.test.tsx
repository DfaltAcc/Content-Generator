/**
 * Accessibility tests for OutputPanel component
 * Validates: Requirements 8.3, 8.4
 *
 * Requirement 8.3: THE App SHALL use ARIA live regions so that screen readers
 * announce dynamically updated output without requiring focus changes.
 * Requirement 8.4: THE App SHALL provide accessible labels and roles for all
 * interactive controls and status regions.
 *
 * Uses jest-axe to assert no WCAG 2.1 AA violations across all panel states.
 *
 * Note: The `color-contrast` rule is excluded because jsdom does not implement
 * HTMLCanvasElement.getContext, which axe-core requires for contrast analysis.
 * Colour contrast must be verified through visual/manual review or a real browser.
 */

import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import OutputPanel from '../OutputPanel';

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

describe('OutputPanel accessibility (Requirements 8.3, 8.4)', () => {
  it('has no WCAG 2.1 AA violations in the loading state', async () => {
    const { container } = render(
      <OutputPanel
        isLoading={true}
        output=""
        error={null}
        copyConfirmed={false}
        onCopy={jest.fn()}
        onRegenerate={jest.fn()}
      />
    );

    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });

  it('has no WCAG 2.1 AA violations in the error state', async () => {
    const { container } = render(
      <OutputPanel
        isLoading={false}
        output=""
        error="Something went wrong"
        copyConfirmed={false}
        onCopy={jest.fn()}
        onRegenerate={jest.fn()}
      />
    );

    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });

  it('has no WCAG 2.1 AA violations in the content state', async () => {
    const { container } = render(
      <OutputPanel
        isLoading={false}
        output="Some generated content"
        error={null}
        copyConfirmed={false}
        onCopy={jest.fn()}
        onRegenerate={jest.fn()}
      />
    );

    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });

  it('has no WCAG 2.1 AA violations in the empty state', async () => {
    const { container } = render(
      <OutputPanel
        isLoading={false}
        output=""
        error={null}
        copyConfirmed={false}
        onCopy={jest.fn()}
        onRegenerate={jest.fn()}
      />
    );

    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });
});
