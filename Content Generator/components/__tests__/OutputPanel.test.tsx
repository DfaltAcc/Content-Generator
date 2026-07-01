import { render, screen, fireEvent } from '@testing-library/react';
import OutputPanel from '../OutputPanel';

/**
 * Unit tests for OutputPanel component
 * Validates: Requirements 5.1, 5.2, 5.5, 5.6
 */

function renderOutputPanel(
  overrides: Partial<{
    output: string;
    isLoading: boolean;
    error: string | null;
    copyConfirmed: boolean;
    onCopy: jest.Mock;
    onRegenerate: jest.Mock;
  }> = {}
) {
  const props = {
    output: '',
    isLoading: false,
    error: null,
    copyConfirmed: false,
    onCopy: jest.fn(),
    onRegenerate: jest.fn(),
    ...overrides,
  };
  render(<OutputPanel {...props} />);
  return props;
}

// ---------------------------------------------------------------------------
// Loading state (Requirement 5.5)
// ---------------------------------------------------------------------------
describe('Loading state (Requirement 5.5)', () => {
  it('shows "Generating…" text when isLoading is true', () => {
    renderOutputPanel({ isLoading: true });

    expect(screen.getByText(/generating/i)).toBeInTheDocument();
  });

  it('sets aria-busy="true" on the section when isLoading is true', () => {
    renderOutputPanel({ isLoading: true });

    const section = screen.getByRole('region', { name: /generated content/i });
    expect(section).toHaveAttribute('aria-busy', 'true');
  });

  it('does not show loading indicator when isLoading is false', () => {
    renderOutputPanel({ isLoading: false, output: 'some text' });

    expect(screen.queryByText(/generating/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error state (Requirement 5.6)
// ---------------------------------------------------------------------------
describe('Error state (Requirement 5.6)', () => {
  it('shows error message when error is set and isLoading is false', () => {
    renderOutputPanel({ error: 'Something went wrong', isLoading: false });

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('does not show loading indicator when error is set', () => {
    renderOutputPanel({ error: 'Some error', isLoading: false });

    expect(screen.queryByText(/generating/i)).not.toBeInTheDocument();
  });

  it('does not show Copy or Regenerate buttons when error is set and output is empty', () => {
    renderOutputPanel({ error: 'Some error', isLoading: false, output: '' });

    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
  });

  it('does not show error when isLoading is true (loading takes precedence)', () => {
    renderOutputPanel({ error: 'Some error', isLoading: true });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Content state — output present (Requirement 5.1, 5.2)
// ---------------------------------------------------------------------------
describe('Content state (Requirements 5.1, 5.2)', () => {
  it('shows output text when output is non-empty and not loading', () => {
    renderOutputPanel({ output: 'Hello, world!', isLoading: false, error: null });

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('shows Copy button when output is non-empty', () => {
    renderOutputPanel({ output: 'Some content', isLoading: false, error: null });

    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('shows Regenerate button when output is non-empty', () => {
    renderOutputPanel({ output: 'Some content', isLoading: false, error: null });

    expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
  });

  it('Regenerate button is enabled when output is present and not loading', () => {
    renderOutputPanel({ output: 'Some content', isLoading: false, error: null });

    expect(screen.getByRole('button', { name: /regenerate/i })).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Copy button behaviour (Requirement 5.2)
// ---------------------------------------------------------------------------
describe('Copy button (Requirement 5.2)', () => {
  it('calls onCopy when Copy button is clicked', () => {
    const onCopy = jest.fn();
    renderOutputPanel({ output: 'Some content', onCopy });

    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('shows "Copied!" label when copyConfirmed is true', () => {
    renderOutputPanel({ output: 'Some content', copyConfirmed: true });

    expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument();
  });

  it('shows "Copy" label when copyConfirmed is false', () => {
    renderOutputPanel({ output: 'Some content', copyConfirmed: false });

    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Regenerate button disabled during loading (Requirement 5.5)
// ---------------------------------------------------------------------------
describe('Regenerate button disabled state (Requirement 5.5)', () => {
  it('Regenerate button is disabled when isLoading is true', () => {
    renderOutputPanel({ output: 'Some content', isLoading: true });

    expect(screen.getByRole('button', { name: /regenerate/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Empty state (Requirement 5.1)
// ---------------------------------------------------------------------------
describe('Empty state (Requirement 5.1)', () => {
  it('shows placeholder text when output, error, and isLoading are all falsy', () => {
    renderOutputPanel({ output: '', isLoading: false, error: null });

    expect(
      screen.getByText('Your generated content will appear here.')
    ).toBeInTheDocument();
  });

  it('does not show Copy or Regenerate buttons in empty state', () => {
    renderOutputPanel({ output: '', isLoading: false, error: null });

    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
  });

  it('does not show placeholder when output is present', () => {
    renderOutputPanel({ output: 'Some content', isLoading: false, error: null });

    expect(
      screen.queryByText('Your generated content will appear here.')
    ).not.toBeInTheDocument();
  });

  it('does not show placeholder when isLoading is true', () => {
    renderOutputPanel({ output: '', isLoading: true, error: null });

    expect(
      screen.queryByText('Your generated content will appear here.')
    ).not.toBeInTheDocument();
  });

  it('does not show placeholder when error is set', () => {
    renderOutputPanel({ output: '', isLoading: false, error: 'An error occurred' });

    expect(
      screen.queryByText('Your generated content will appear here.')
    ).not.toBeInTheDocument();
  });
});
