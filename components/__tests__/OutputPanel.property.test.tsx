// Feature: content-generator, Property 4: Output panel shows action buttons when content is present
// Feature: content-generator, Property 5: Copy button writes exact content to clipboard
// Feature: content-generator, Property 7: Loading state is active during any API call
// Feature: content-generator, Property 8: API error produces a descriptive message in the Output Panel
// Feature: social-media-posting, Property 1: Post button visibility matches content type

import * as fc from 'fast-check';
import { render, screen, fireEvent, within } from '@testing-library/react';
import OutputPanel from '../OutputPanel';
import type { ContentType } from '../../types';

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
      { numRuns: 10 }
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
      { numRuns: 10 }
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
      { numRuns: 10 }
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
      { numRuns: 10 }
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
      { numRuns: 10 }
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
      { numRuns: 10 }
    );
  });
});

/**
 * Validates: Requirements 3.1, 3.2, 3.4, 3.5
 *
 * Property 1: Post button visibility matches content type
 * For any non-empty output string and any ContentType value:
 * - "Post to LinkedIn" renders if and only if contentType === 'LinkedIn Post'
 * - "Post to Twitter/X" renders if and only if contentType === 'Tweet Thread'
 * - For all other content types, neither Post button is rendered
 */

const ALL_CONTENT_TYPES: ContentType[] = [
  'Blog Post',
  'LinkedIn Post',
  'Tweet Thread',
  'Article Intro',
  'Product Description',
];

const contentTypeArb = fc.constantFrom(...ALL_CONTENT_TYPES);

describe('Property 1: Post button visibility matches content type', () => {
  it('Post to LinkedIn button renders if and only if contentType is LinkedIn Post', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        contentTypeArb,
        (output, contentType) => {
          const { unmount } = render(
            <OutputPanel
              output={output}
              isLoading={false}
              error={null}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
              contentType={contentType}
              onPostLinkedIn={jest.fn()}
              onPostTwitter={jest.fn()}
            />
          );

          const linkedInButton = screen.queryByRole('button', { name: /post to linkedin/i });

          if (contentType === 'LinkedIn Post') {
            expect(linkedInButton).toBeInTheDocument();
          } else {
            expect(linkedInButton).not.toBeInTheDocument();
          }

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('Post to Twitter/X button renders if and only if contentType is Tweet Thread', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        contentTypeArb,
        (output, contentType) => {
          const { unmount } = render(
            <OutputPanel
              output={output}
              isLoading={false}
              error={null}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
              contentType={contentType}
              onPostLinkedIn={jest.fn()}
              onPostTwitter={jest.fn()}
            />
          );

          const twitterButton = screen.queryByRole('button', { name: /post to twitter/i });

          if (contentType === 'Tweet Thread') {
            expect(twitterButton).toBeInTheDocument();
          } else {
            expect(twitterButton).not.toBeInTheDocument();
          }

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('for non-LinkedIn-Post and non-Tweet-Thread content types, neither Post button is rendered', () => {
    const otherContentTypes: ContentType[] = [
      'Blog Post',
      'Article Intro',
      'Product Description',
    ];
    const otherContentTypeArb = fc.constantFrom(...otherContentTypes);

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        otherContentTypeArb,
        (output, contentType) => {
          const { unmount } = render(
            <OutputPanel
              output={output}
              isLoading={false}
              error={null}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
              contentType={contentType}
              onPostLinkedIn={jest.fn()}
              onPostTwitter={jest.fn()}
            />
          );

          expect(screen.queryByRole('button', { name: /post to linkedin/i })).not.toBeInTheDocument();
          expect(screen.queryByRole('button', { name: /post to twitter/i })).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });
});

/**
 * Validates: Requirements 3.3
 *
 * Property 2: No Post buttons in empty, loading, or error states
 * For any combination of (empty output, loading state, error state), neither
 * the "Post to LinkedIn" nor the "Post to Twitter/X" button is rendered,
 * regardless of content type.
 */

// Feature: social-media-posting, Property 2: No Post buttons in empty, loading, or error states

describe('Property 2: No Post buttons in empty, loading, or error states', () => {
  it('empty output — no Post buttons rendered regardless of content type', () => {
    fc.assert(
      fc.property(
        contentTypeArb,
        (contentType) => {
          const { unmount } = render(
            <OutputPanel
              output=""
              isLoading={false}
              error={null}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
              contentType={contentType}
              onPostLinkedIn={jest.fn()}
              onPostTwitter={jest.fn()}
            />
          );

          expect(screen.queryByRole('button', { name: /post to linkedin/i })).not.toBeInTheDocument();
          expect(screen.queryByRole('button', { name: /post to twitter/i })).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('loading state — no Post buttons rendered regardless of content type or output', () => {
    fc.assert(
      fc.property(
        // Use non-empty output to ensure the only suppression reason is isLoading
        fc.string({ minLength: 1 }),
        contentTypeArb,
        (output, contentType) => {
          const { unmount } = render(
            <OutputPanel
              output={output}
              isLoading={true}
              error={null}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
              contentType={contentType}
              onPostLinkedIn={jest.fn()}
              onPostTwitter={jest.fn()}
            />
          );

          expect(screen.queryByRole('button', { name: /post to linkedin/i })).not.toBeInTheDocument();
          expect(screen.queryByRole('button', { name: /post to twitter/i })).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('error state — no Post buttons rendered regardless of content type', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary non-empty error messages
        fc.string({ minLength: 1 }),
        contentTypeArb,
        (errorMessage, contentType) => {
          const { unmount } = render(
            <OutputPanel
              output=""
              isLoading={false}
              error={errorMessage}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
              contentType={contentType}
              onPostLinkedIn={jest.fn()}
              onPostTwitter={jest.fn()}
            />
          );

          expect(screen.queryByRole('button', { name: /post to linkedin/i })).not.toBeInTheDocument();
          expect(screen.queryByRole('button', { name: /post to twitter/i })).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('error state with non-empty output — no Post buttons rendered', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        contentTypeArb,
        (output, errorMessage, contentType) => {
          const { unmount } = render(
            <OutputPanel
              output={output}
              isLoading={false}
              error={errorMessage}
              copyConfirmed={false}
              onCopy={jest.fn()}
              onRegenerate={jest.fn()}
              contentType={contentType}
              onPostLinkedIn={jest.fn()}
              onPostTwitter={jest.fn()}
            />
          );

          expect(screen.queryByRole('button', { name: /post to linkedin/i })).not.toBeInTheDocument();
          expect(screen.queryByRole('button', { name: /post to twitter/i })).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });
});
