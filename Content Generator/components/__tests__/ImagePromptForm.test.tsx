import { render, screen, fireEvent } from '@testing-library/react';
import ImagePromptForm from '../ImagePromptForm';
import type { ImageInputs } from '@/types';

/**
 * Unit tests for ImagePromptForm component
 * Validates: Requirements 3.1, 3.3, 3.4
 */

const defaultInputs: ImageInputs = {
  depiction: '',
};

function renderImagePromptForm(
  overrides: Partial<{
    inputs: ImageInputs;
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
  render(<ImagePromptForm {...props} />);
  return props;
}

// ---------------------------------------------------------------------------
// Requirement 3.1 — Depiction textarea with label
// ---------------------------------------------------------------------------
describe('Depiction textarea (Requirement 3.1)', () => {
  it('renders the depiction textarea with a label', () => {
    renderImagePromptForm();

    expect(screen.getByLabelText(/what to depict/i)).toBeInTheDocument();
  });

  it('renders the depiction field as a textarea', () => {
    renderImagePromptForm();

    const field = screen.getByLabelText(/what to depict/i);
    expect(field.tagName).toBe('TEXTAREA');
  });

  it('reflects the current depiction value', () => {
    renderImagePromptForm({
      inputs: { depiction: 'A cyberpunk city at night' },
    });

    const textarea = screen.getByLabelText(/what to depict/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('A cyberpunk city at night');
  });

  it('calls onChange with updated depiction when the textarea changes', () => {
    const onChange = jest.fn();
    renderImagePromptForm({ onChange });

    fireEvent.change(screen.getByLabelText(/what to depict/i), {
      target: { value: 'A cosy reading nook in autumn' },
    });

    expect(onChange).toHaveBeenCalledWith({
      depiction: 'A cosy reading nook in autumn',
    });
  });
});

// ---------------------------------------------------------------------------
// Requirement 3.4 — No style or mood selector
// ---------------------------------------------------------------------------
describe('No style or mood selector (Requirement 3.4)', () => {
  it('does not render a style selector', () => {
    renderImagePromptForm();

    expect(screen.queryByLabelText(/style/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /style/i })).not.toBeInTheDocument();
  });

  it('does not render a mood selector', () => {
    renderImagePromptForm();

    expect(screen.queryByLabelText(/mood/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /mood/i })).not.toBeInTheDocument();
  });

  it('renders only one interactive field (the depiction textarea)', () => {
    renderImagePromptForm();

    const textareas = screen.getAllByRole('textbox');
    expect(textareas).toHaveLength(1);

    const selects = screen.queryAllByRole('combobox');
    expect(selects).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Submit button
// ---------------------------------------------------------------------------
describe('Submit button', () => {
  it('renders a Generate button', () => {
    renderImagePromptForm();

    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('is enabled when isLoading is false', () => {
    renderImagePromptForm({ isLoading: false });

    expect(screen.getByRole('button', { name: /generate/i })).not.toBeDisabled();
  });

  it('is disabled when isLoading is true', () => {
    renderImagePromptForm({ isLoading: true });

    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Requirement 3.3 — Validation: empty depiction prevents submission
// ---------------------------------------------------------------------------
describe('Validation — empty depiction (Requirement 3.3)', () => {
  it('shows a validation message when depiction is empty on submit', () => {
    renderImagePromptForm({ inputs: { depiction: '' } });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(
      screen.getByText(/please describe what to depict before generating/i)
    ).toBeInTheDocument();
  });

  it('shows a validation message when depiction is whitespace-only on submit', () => {
    renderImagePromptForm({ inputs: { depiction: '   ' } });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(
      screen.getByText(/please describe what to depict before generating/i)
    ).toBeInTheDocument();
  });

  it('does not call onSubmit when depiction is empty', () => {
    const onSubmit = jest.fn();
    renderImagePromptForm({ inputs: { depiction: '' }, onSubmit });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit when depiction is whitespace-only', () => {
    const onSubmit = jest.fn();
    renderImagePromptForm({ inputs: { depiction: '\t  \n' }, onSubmit });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not show a validation message before any submit attempt', () => {
    renderImagePromptForm({ inputs: { depiction: '' } });

    expect(
      screen.queryByText(/please describe what to depict before generating/i)
    ).not.toBeInTheDocument();
  });

  it('calls onSubmit with correct inputs when depiction is non-empty', () => {
    const onSubmit = jest.fn();
    const inputs: ImageInputs = {
      depiction: 'A minimalist flat-lay product photo of a white ceramic coffee mug',
    };
    renderImagePromptForm({ inputs, onSubmit });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(inputs);
  });
});
