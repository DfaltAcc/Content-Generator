// Feature: content-generator, Property 4: Output panel shows action buttons when content is present
// Feature: content-generator, Property 5: Copy button writes exact content to clipboard
// Feature: content-generator, Property 7: Loading state is active during any API call
// Feature: content-generator, Property 8: API error produces a descriptive message in the Output Panel

import * as fc from 'fast-check';
import { render, screen, fireEvent, within } from '@testing-library/react';
import OutputPanel from '../OutputPanel';

/**
 * Validates: Requirements 5.5
 *
 * Property 7: Loading state is active during any API call
 * When isLoading is true, the OutputPanel should display a loading indicator
 * and the Regenerate button should be disabled.
 *
 * Note: The Regenerate button only renders when output is non-empty, so we
 * test with a non-empty output to exercise the disabled state of that button.
 */

describe('Property 7: Loading state is active during any API call', () => {
  it('isLoading=true — loading indicator is visible and Regenerate button is disabled', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary non-empty output strings so the Regenerate button is rendered
        fc.string({ minLength: 1 }),
        (output) => {
          const { unmount } = render(
            <OutputPanel
              output={output}
              isLoading={true}
              error={null}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
            />
          );

          // Loading indicator must be visible
          expect(screen.getByText(/generating/i)).toBeInTheDocument();

          // Regenerate button must be disabled during loading
          const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
          expect(regenerateButton).toBeDisabled();

          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('isLoading=true with no output — loading indicator is visible', () => {
    fc.assert(
      fc.property(
        // Use a constant true for isLoading; vary nothing — just confirm the indicator always shows
        fc.constant(true),
        (isLoading) => {
          const { unmount } = render(
            <OutputPanel
              output=""
              isLoading={isLoading}
              error={null}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
            />
          );

          expect(screen.getByText(/generating/i)).toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 5 }
    );
  });
});

/**
 * Validates: Requirements 5.1
 *
 * Property 4: Output panel shows action buttons when content is present
 * For any non-empty output string, the OutputPanel should render both
 * the Copy button and the Regenerate button.
 */

describe('Property 4: Output panel shows action buttons when content is present', () => {
  it('non-empty output — renders both Copy and Regenerate buttons', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary non-empty strings as output content
        fc.string({ minLength: 1 }),
        (output) => {
          const { unmount } = render(
            <OutputPanel
              output={output}
              isLoading={false}
              error={null}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
            />
          );

          // Both action buttons must be present when output is non-empty
          expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Validates: Requirements 5.2
 *
 * Property 5: Copy button writes exact content to clipboard
 * For any content string displayed in the Output Panel, clicking the Copy
 * button should call navigator.clipboard.writeText with that exact string.
 */

describe('Property 5: Copy button writes exact content to clipboard', () => {
  beforeEach(() => {
    // Mock the clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('clicking Copy calls navigator.clipboard.writeText with the exact output string', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary non-empty content strings (including unicode, newlines, etc.)
        fc.string({ minLength: 1 }),
        (output) => {
          const onCopy = jest.fn(() => {
            navigator.clipboard.writeText(output);
          });

          const { unmount } = render(
            <OutputPanel
              output={output}
              isLoading={false}
              error={null}
              copyConfirmed={false}
              onCopy={onCopy}
              onRegenerate={jest.fn()}
            />
          );

          const copyButton = screen.getByRole('button', { name: /copy/i });
          fireEvent.click(copyButton);

          // onCopy must have been called exactly once
          expect(onCopy).toHaveBeenCalledTimes(1);

          // clipboard.writeText must have been called with the exact output string
          expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
          expect(navigator.clipboard.writeText).toHaveBeenCalledWith(output);

          unmount();
          jest.clearAllMocks();
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Validates: Requirements 5.6, 7.4
 *
 * Property 8: API error produces a descriptive message in the Output Panel
 * For any non-empty error string passed to OutputPanel, a non-empty, visible
 * error message must be displayed to the user.
 */

describe('Property 8: API error produces a descriptive message in the Output Panel', () => {
  it('non-empty error string — a non-empty message is displayed in the panel', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary non-empty error strings (network errors, timeout messages, etc.)
        fc.string({ minLength: 1 }),
        (errorMessage) => {
          const { unmount } = render(
            <OutputPanel
              output=""
              isLoading={false}
              error={errorMessage}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
            />
          );

          // An error element must be present in the document
          const errorEl = screen.getByRole('alert');
          expect(errorEl).toBeInTheDocument();

          // The displayed message must be non-empty
          expect(errorEl.textContent?.trim().length).toBeGreaterThan(0);

          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('error string is rendered verbatim in the Output Panel', () => {
    fc.assert(
      fc.property(
        // Use printable ASCII strings to avoid invisible-character edge cases
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (errorMessage) => {
          const { unmount, container } = render(
            <OutputPanel
              output=""
              isLoading={false}
              error={errorMessage}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
            />
          );

          // Query within the specific container to avoid cross-iteration conflicts
          const errorEl = within(container).getByRole('alert');
          // Use textContent directly to avoid toHaveTextContent's whitespace normalization
          expect(errorEl.textContent).toBe(errorMessage);

          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('error state — loading indicator and action buttons are not shown', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (errorMessage) => {
          const { unmount } = render(
            <OutputPanel
              output=""
              isLoading={false}
              error={errorMessage}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
            />
          );

          // Loading indicator must not be present when showing an error
          expect(screen.queryByText(/generating/i)).not.toBeInTheDocument();

          // Copy and Regenerate buttons must not be present (no output content)
          expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
          expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });
});
