import { render, screen, fireEvent } from '@testing-library/react';
import TextForm from '../TextForm';
import type { TextInputs } from '@/types';

/**
 * Unit tests for TextForm component
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

const defaultInputs: TextInputs = {
  contentType: 'Blog Post',
  topic: '',
  tone: 'Professional',
};

function renderTextForm(
  overrides: Partial<{
    inputs: TextInputs;
    onChange: jest.Mock;
    onSubmit: jest.Mock;
    isLoading: boolean;
  }> = {}
) {
  const props = {
    inputs: defaultInputs,
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    isLoading: false,
    ...overrides,
  };
  render(<TextForm {...props} />);
  return props;
}

// ---------------------------------------------------------------------------
// Requirement 2.1 — Content type selector with all five options
// ---------------------------------------------------------------------------
describe('Content type selector (Requirement 2.1)', () => {
  it('renders all five content type options', () => {
    renderTextForm();

    expect(screen.getByRole('option', { name: 'Blog Post' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'LinkedIn Post' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tweet Thread' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Article Intro' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Product Description' })).toBeInTheDocument();
  });

  it('renders the content type select with a label', () => {
    renderTextForm();

    expect(screen.getByLabelText(/content type/i)).toBeInTheDocument();
  });

  it('reflects the current contentType value', () => {
    renderTextForm({
      inputs: { ...defaultInputs, contentType: 'Tweet Thread' },
    });

    const select = screen.getByLabelText(/content type/i) as HTMLSelectElement;
    expect(select.value).toBe('Tweet Thread');
  });

  it('calls onChange with updated contentType when selection changes', () => {
    const onChange = jest.fn();
    renderTextForm({ onChange });

    fireEvent.change(screen.getByLabelText(/content type/i), {
      target: { value: 'LinkedIn Post' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultInputs,
      contentType: 'LinkedIn Post',
    });
  });
});

// ---------------------------------------------------------------------------
// Requirement 2.2 — Topic text input
// ---------------------------------------------------------------------------
describe('Topic input (Requirement 2.2)', () => {
  it('renders the topic input with a label', () => {
    renderTextForm();

    expect(screen.getByLabelText(/topic or subject/i)).toBeInTheDocument();
  });

  it('reflects the current topic value', () => {
    renderTextForm({
      inputs: { ...defaultInputs, topic: 'The future of AI' },
    });

    const input = screen.getByLabelText(/topic or subject/i) as HTMLInputElement;
    expect(input.value).toBe('The future of AI');
  });

  it('calls onChange with updated topic when the input changes', () => {
    const onChange = jest.fn();
    renderTextForm({ onChange });

    fireEvent.change(screen.getByLabelText(/topic or subject/i), {
      target: { value: 'Remote work trends' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultInputs,
      topic: 'Remote work trends',
    });
  });
});

// ---------------------------------------------------------------------------
// Requirement 2.3 — Tone selector with all four options
// ---------------------------------------------------------------------------
describe('Tone selector (Requirement 2.3)', () => {
  it('renders all four tone options', () => {
    renderTextForm();

    expect(screen.getByRole('option', { name: 'Professional' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Casual' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Persuasive' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Humorous' })).toBeInTheDocument();
  });

  it('renders the tone select with a label', () => {
    renderTextForm();

    expect(screen.getByLabelText(/tone/i)).toBeInTheDocument();
  });

  it('reflects the current tone value', () => {
    renderTextForm({
      inputs: { ...defaultInputs, tone: 'Humorous' },
    });

    const select = screen.getByLabelText(/tone/i) as HTMLSelectElement;
    expect(select.value).toBe('Humorous');
  });

  it('calls onChange with updated tone when selection changes', () => {
    const onChange = jest.fn();
    renderTextForm({ onChange });

    fireEvent.change(screen.getByLabelText(/tone/i), {
      target: { value: 'Casual' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultInputs,
      tone: 'Casual',
    });
  });
});

// ---------------------------------------------------------------------------
// Requirement 2.4 — Submit button
// ---------------------------------------------------------------------------
describe('Submit button (Requirement 2.4)', () => {
  it('renders a Generate button', () => {
    renderTextForm();

    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('is enabled when isLoading is false', () => {
    renderTextForm({ isLoading: false });

    expect(screen.getByRole('button', { name: /generate/i })).not.toBeDisabled();
  });

  it('is disabled when isLoading is true', () => {
    renderTextForm({ isLoading: true });

    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Requirement 2.5 — Validation: empty topic prevents submission
// ---------------------------------------------------------------------------
describe('Validation — empty topic (Requirement 2.5)', () => {
  it('shows a validation message when topic is empty on submit', () => {
    renderTextForm({ inputs: { ...defaultInputs, topic: '' } });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(
      screen.getByText(/please enter a topic before generating/i)
    ).toBeInTheDocument();
  });

  it('shows a validation message when topic is whitespace-only on submit', () => {
    renderTextForm({ inputs: { ...defaultInputs, topic: '   ' } });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(
      screen.getByText(/please enter a topic before generating/i)
    ).toBeInTheDocument();
  });

  it('does not call onSubmit when topic is empty', () => {
    const onSubmit = jest.fn();
    renderTextForm({ inputs: { ...defaultInputs, topic: '' }, onSubmit });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit when topic is whitespace-only', () => {
    const onSubmit = jest.fn();
    renderTextForm({ inputs: { ...defaultInputs, topic: '\t  \n' }, onSubmit });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not show a validation message before any submit attempt', () => {
    renderTextForm({ inputs: { ...defaultInputs, topic: '' } });

    expect(
      screen.queryByText(/please enter a topic before generating/i)
    ).not.toBeInTheDocument();
  });

  it('calls onSubmit with correct inputs when topic is non-empty', () => {
    const onSubmit = jest.fn();
    const inputs: TextInputs = {
      contentType: 'LinkedIn Post',
      topic: 'The rise of AI coding assistants',
      tone: 'Professional',
    };
    renderTextForm({ inputs, onSubmit });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(inputs);
  });

  it('calls onSubmit with all current field values', () => {
    const onSubmit = jest.fn();
    const inputs: TextInputs = {
      contentType: 'Tweet Thread',
      topic: 'Why developers love TypeScript',
      tone: 'Humorous',
    };
    renderTextForm({ inputs, onSubmit });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(onSubmit).toHaveBeenCalledWith(inputs);
  });
});
