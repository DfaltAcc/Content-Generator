import { render, screen, fireEvent } from '@testing-library/react';
import EmailForm from '../EmailForm';
import type { EmailInputs } from '@/types';

/**
 * Unit tests for EmailForm component
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

const defaultInputs: EmailInputs = {
  recipient: '',
  purpose: '',
  keyPoints: '',
};

function renderEmailForm(
  overrides: Partial<{
    inputs: EmailInputs;
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
  render(<EmailForm {...props} />);
  return props;
}

// ---------------------------------------------------------------------------
// Requirement 4.1 — Recipient input with label
// ---------------------------------------------------------------------------
describe('Recipient input (Requirement 4.1)', () => {
  it('renders the recipient input with a label', () => {
    renderEmailForm();

    expect(screen.getByLabelText(/recipient/i)).toBeInTheDocument();
  });

  it('renders the recipient field as a text input', () => {
    renderEmailForm();

    const field = screen.getByLabelText(/recipient/i) as HTMLInputElement;
    expect(field.tagName).toBe('INPUT');
    expect(field.type).toBe('text');
  });

  it('reflects the current recipient value', () => {
    renderEmailForm({
      inputs: { ...defaultInputs, recipient: 'my manager' },
    });

    const input = screen.getByLabelText(/recipient/i) as HTMLInputElement;
    expect(input.value).toBe('my manager');
  });

  it('calls onChange with updated recipient when the input changes', () => {
    const onChange = jest.fn();
    renderEmailForm({ onChange });

    fireEvent.change(screen.getByLabelText(/recipient/i), {
      target: { value: 'a potential client' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultInputs,
      recipient: 'a potential client',
    });
  });
});

// ---------------------------------------------------------------------------
// Requirement 4.2 — Purpose input with label
// ---------------------------------------------------------------------------
describe('Purpose input (Requirement 4.2)', () => {
  it('renders the purpose input with a label', () => {
    renderEmailForm();

    expect(screen.getByLabelText(/purpose or subject/i)).toBeInTheDocument();
  });

  it('renders the purpose field as a text input', () => {
    renderEmailForm();

    const field = screen.getByLabelText(/purpose or subject/i) as HTMLInputElement;
    expect(field.tagName).toBe('INPUT');
    expect(field.type).toBe('text');
  });

  it('reflects the current purpose value', () => {
    renderEmailForm({
      inputs: { ...defaultInputs, purpose: 'Request a one-on-one meeting' },
    });

    const input = screen.getByLabelText(/purpose or subject/i) as HTMLInputElement;
    expect(input.value).toBe('Request a one-on-one meeting');
  });

  it('calls onChange with updated purpose when the input changes', () => {
    const onChange = jest.fn();
    renderEmailForm({ onChange });

    fireEvent.change(screen.getByLabelText(/purpose or subject/i), {
      target: { value: 'Follow up after sales call' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultInputs,
      purpose: 'Follow up after sales call',
    });
  });
});

// ---------------------------------------------------------------------------
// Requirement 4.3 — Key points textarea with label
// ---------------------------------------------------------------------------
describe('Key points textarea (Requirement 4.3)', () => {
  it('renders the key points textarea with a label', () => {
    renderEmailForm();

    expect(screen.getByLabelText(/key points/i)).toBeInTheDocument();
  });

  it('renders the key points field as a textarea', () => {
    renderEmailForm();

    const field = screen.getByLabelText(/key points/i);
    expect(field.tagName).toBe('TEXTAREA');
  });

  it('reflects the current keyPoints value', () => {
    renderEmailForm({
      inputs: { ...defaultInputs, keyPoints: 'Recent contributions, goals for Q3' },
    });

    const textarea = screen.getByLabelText(/key points/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Recent contributions, goals for Q3');
  });

  it('calls onChange with updated keyPoints when the textarea changes', () => {
    const onChange = jest.fn();
    renderEmailForm({ onChange });

    fireEvent.change(screen.getByLabelText(/key points/i), {
      target: { value: 'Pain points, solution overview, next steps' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultInputs,
      keyPoints: 'Pain points, solution overview, next steps',
    });
  });
});

// ---------------------------------------------------------------------------
// Submit button
// ---------------------------------------------------------------------------
describe('Submit button', () => {
  it('renders a Generate button', () => {
    renderEmailForm();

    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('is enabled when isLoading is false', () => {
    renderEmailForm({ isLoading: false });

    expect(screen.getByRole('button', { name: /generate/i })).not.toBeDisabled();
  });

  it('is disabled when isLoading is true', () => {
    renderEmailForm({ isLoading: true });

    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Requirement 4.5 — Validation: empty purpose prevents submission
// ---------------------------------------------------------------------------
describe('Validation — empty purpose (Requirement 4.5)', () => {
  it('shows a validation message when purpose is empty on submit', () => {
    renderEmailForm({ inputs: { ...defaultInputs, purpose: '' } });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(
      screen.getByText(/please enter a purpose before generating/i)
    ).toBeInTheDocument();
  });

  it('shows a validation message when purpose is whitespace-only on submit', () => {
    renderEmailForm({ inputs: { ...defaultInputs, purpose: '   ' } });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(
      screen.getByText(/please enter a purpose before generating/i)
    ).toBeInTheDocument();
  });

  it('does not call onSubmit when purpose is empty', () => {
    const onSubmit = jest.fn();
    renderEmailForm({ inputs: { ...defaultInputs, purpose: '' }, onSubmit });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit when purpose is whitespace-only', () => {
    const onSubmit = jest.fn();
    renderEmailForm({ inputs: { ...defaultInputs, purpose: '\t  \n' }, onSubmit });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not show a validation message before any submit attempt', () => {
    renderEmailForm({ inputs: { ...defaultInputs, purpose: '' } });

    expect(
      screen.queryByText(/please enter a purpose before generating/i)
    ).not.toBeInTheDocument();
  });

  it('calls onSubmit with correct inputs when purpose is non-empty', () => {
    const onSubmit = jest.fn();
    const inputs: EmailInputs = {
      recipient: 'my manager',
      purpose: 'Request a one-on-one meeting to discuss career growth',
      keyPoints: 'Recent project contributions, goals for next quarter',
    };
    renderEmailForm({ inputs, onSubmit });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(inputs);
  });

  it('calls onSubmit with all current field values including recipient and keyPoints', () => {
    const onSubmit = jest.fn();
    const inputs: EmailInputs = {
      recipient: 'a potential client',
      purpose: 'Follow up after an initial sales call',
      keyPoints: 'Recap of pain points, solution fit, demo offer',
    };
    renderEmailForm({ inputs, onSubmit });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(onSubmit).toHaveBeenCalledWith(inputs);
  });

  it('calls onSubmit even when recipient and keyPoints are empty', () => {
    const onSubmit = jest.fn();
    const inputs: EmailInputs = {
      recipient: '',
      purpose: 'Announce a product launch',
      keyPoints: '',
    };
    renderEmailForm({ inputs, onSubmit });

    fireEvent.submit(screen.getByRole('button', { name: /generate/i }).closest('form')!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(inputs);
  });
});
