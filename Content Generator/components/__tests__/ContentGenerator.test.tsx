/**
 * Unit/Integration tests for ContentGenerator component
 *
 * Suite 1: Default active tab (Requirement 1.4)
 * Suite 2: Tab switching preserves per-tab input state (Requirement 1.3)
 * Suite 3: Prompt library click switches tab and populates all fields (Requirement 6.2)
 * Suite 4: Copy confirmation resets after 2 seconds (Requirement 5.3)
 * Suite 5: Network error displays correct message in Output Panel (Requirement 5.6)
 */

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import ContentGenerator from '../ContentGenerator';
import { PROMPT_LIBRARY } from '@/lib/promptLibrary';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clickTab(label: string) {
  fireEvent.click(screen.getByRole('tab', { name: label }));
}

function changeById(container: HTMLElement, id: string, value: string) {
  const el = container.querySelector(`#${id}`) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement
    | null;
  if (!el) throw new Error(`Element with id="${id}" not found`);
  fireEvent.change(el, { target: { value } });
}

function getValueById(container: HTMLElement, id: string): string {
  const el = container.querySelector(`#${id}`) as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | null;
  if (!el) throw new Error(`Element with id="${id}" not found`);
  return el.value;
}

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  // Suppress unhandled fetch noise in tests that don't mock fetch
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Suite 1: Default active tab (Requirement 1.4)
// ---------------------------------------------------------------------------

describe('Suite 1: Default active tab (Requirement 1.4)', () => {
  it('Text tab has aria-selected="true" on initial render', () => {
    render(<ContentGenerator />);
    expect(screen.getByRole('tab', { name: 'Text' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('Image Prompt tab has aria-selected="false" on initial render', () => {
    render(<ContentGenerator />);
    expect(screen.getByRole('tab', { name: 'Image Prompt' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('Email tab has aria-selected="false" on initial render', () => {
    render(<ContentGenerator />);
    expect(screen.getByRole('tab', { name: 'Email' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('text form is visible on initial render (#text-topic is present)', () => {
    const { container } = render(<ContentGenerator />);
    expect(container.querySelector('#text-topic')).toBeInTheDocument();
  });

  it('image form is NOT visible on initial render (#image-depiction is absent)', () => {
    const { container } = render(<ContentGenerator />);
    expect(container.querySelector('#image-depiction')).not.toBeInTheDocument();
  });

  it('email form is NOT visible on initial render (#email-purpose is absent)', () => {
    const { container } = render(<ContentGenerator />);
    expect(container.querySelector('#email-purpose')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Tab switching preserves per-tab input state (Requirement 1.3)
// ---------------------------------------------------------------------------

describe('Suite 2: Tab switching preserves per-tab input state (Requirement 1.3)', () => {
  it('Text tab topic is preserved after switching to Image Prompt and back', () => {
    const { container } = render(<ContentGenerator />);

    changeById(container, 'text-topic', 'My preserved topic');

    act(() => clickTab('Image Prompt'));
    act(() => clickTab('Text'));

    expect(getValueById(container, 'text-topic')).toBe('My preserved topic');
  });

  it('Image Prompt depiction is preserved after switching to Email and back', () => {
    const { container } = render(<ContentGenerator />);

    act(() => clickTab('Image Prompt'));
    changeById(container, 'image-depiction', 'A sunset over the mountains');

    act(() => clickTab('Email'));
    act(() => clickTab('Image Prompt'));

    expect(getValueById(container, 'image-depiction')).toBe(
      'A sunset over the mountains'
    );
  });

  it('Email purpose is preserved after switching to Text and back', () => {
    const { container } = render(<ContentGenerator />);

    act(() => clickTab('Email'));
    changeById(container, 'email-purpose', 'Discuss quarterly goals');

    act(() => clickTab('Text'));
    act(() => clickTab('Email'));

    expect(getValueById(container, 'email-purpose')).toBe('Discuss quarterly goals');
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Prompt library click switches tab and populates all fields (Requirement 6.2)
// ---------------------------------------------------------------------------

describe('Suite 3: Prompt library click switches tab and populates all fields (Requirement 6.2)', () => {
  it('clicking a text prompt activates the Text tab and populates all text fields', () => {
    const { container } = render(<ContentGenerator />);

    const textPrompt = PROMPT_LIBRARY.find((p) => p.id === 'text-1')!;
    const inputs = textPrompt.inputs as { contentType: string; topic: string; tone: string };

    fireEvent.click(screen.getByRole('button', { name: textPrompt.title }));

    expect(screen.getByRole('tab', { name: 'Text' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(getValueById(container, 'text-topic')).toBe(inputs.topic);
    expect(getValueById(container, 'text-content-type')).toBe(inputs.contentType);
    expect(getValueById(container, 'text-tone')).toBe(inputs.tone);
  });

  it('clicking an image prompt activates the Image Prompt tab and populates the depiction field', () => {
    const { container } = render(<ContentGenerator />);

    const imagePrompt = PROMPT_LIBRARY.find((p) => p.id === 'image-1')!;
    const inputs = imagePrompt.inputs as { depiction: string };

    fireEvent.click(screen.getByRole('button', { name: imagePrompt.title }));

    expect(screen.getByRole('tab', { name: 'Image Prompt' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(getValueById(container, 'image-depiction')).toBe(inputs.depiction);
  });

  it('clicking an email prompt activates the Email tab and populates all email fields', () => {
    const { container } = render(<ContentGenerator />);

    const emailPrompt = PROMPT_LIBRARY.find((p) => p.id === 'email-1')!;
    const inputs = emailPrompt.inputs as {
      recipient: string;
      purpose: string;
      keyPoints: string;
    };

    fireEvent.click(screen.getByRole('button', { name: emailPrompt.title }));

    expect(screen.getByRole('tab', { name: 'Email' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(getValueById(container, 'email-purpose')).toBe(inputs.purpose);
    expect(getValueById(container, 'email-recipient')).toBe(inputs.recipient);
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Copy confirmation resets after 2 seconds (Requirement 5.3)
// ---------------------------------------------------------------------------

describe('Suite 4: Copy confirmation resets after 2 seconds (Requirement 5.3)', () => {
  it('Copy button shows "Copied!" immediately after click and reverts to "Copy" after 2 seconds', async () => {
    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });

    // Mock fetch to return successful output
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: 'Test output' }),
    });

    jest.useFakeTimers();

    const { container } = render(<ContentGenerator />);

    // Populate topic so form validation passes
    changeById(container, 'text-topic', 'Some topic');

    // Submit the form
    const submitBtn = container.querySelector(
      'form button[type="submit"]'
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Wait for output to appear
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText('Test output')).toBeInTheDocument();
      });
    });

    // Click Copy — await act to flush the async clipboard promise
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^copy$/i }));
    });

    // Immediately shows "Copied!"
    expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument();

    // Advance timers by 2000ms
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Should revert to "Copy"
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copied!/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Suite 5: Network error displays correct message in Output Panel (Requirement 5.6)
// ---------------------------------------------------------------------------

describe('Suite 5: Network error displays correct message in Output Panel (Requirement 5.6)', () => {
  it('displays the network error message in a role="alert" element', async () => {
    // Mock fetch to reject with a generic network error
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const { container } = render(<ContentGenerator />);

    // Populate topic so form validation passes
    changeById(container, 'text-topic', 'Some topic');

    // Submit the form
    const submitBtn = container.querySelector(
      'form button[type="submit"]'
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Wait for the error to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      'Network error — please check your connection.'
    );
  });
});
