// Feature: content-generator, Property 1: Tab input state is preserved across switches
// Feature: content-generator, Property 2: Form submission includes all inputs in the API call
// Feature: content-generator, Property 6: Regenerate uses the same inputs as the original request

import * as fc from 'fast-check';
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react';
import ContentGenerator from '../ContentGenerator';
import { buildPrompt } from '@/lib/prompts';
import type { ContentType, Tone, GenerateRequest } from '@/types';

/**
 * Validates: Requirements 1.3
 *
 * Property 1: Tab input state is preserved across switches
 * For any set of user-entered input values on a given tab, switching to a
 * different tab and then switching back should leave all original input values
 * unchanged.
 */

// Suppress fetch-related noise — ContentGenerator never submits in these tests
beforeAll(() => {
  global.fetch = jest.fn();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const contentTypeArb = fc.constantFrom<ContentType>(
  'Blog Post',
  'LinkedIn Post',
  'Tweet Thread',
  'Article Intro',
  'Product Description'
);

const toneArb = fc.constantFrom<Tone>(
  'Professional',
  'Casual',
  'Persuasive',
  'Humorous'
);

/** Printable strings that are safe to type into inputs */
const safeStringArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.trim().length > 0 && !s.includes('\0'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Click a tab button by its visible label */
function clickTab(label: string) {
  fireEvent.click(screen.getByRole('tab', { name: label }));
}

/**
 * Get the form panel element. ContentGenerator renders the active form inside
 * a div with class "formPanel". We scope queries to it to avoid collisions
 * with the TabBar's aria-label="Content type".
 */
function getFormPanel(container: HTMLElement): HTMLElement {
  // The form panel wraps the active form; it's the first child of .main
  const panel = container.querySelector('form');
  if (!panel) throw new Error('No form found in the rendered ContentGenerator');
  return panel as HTMLElement;
}

/** Change a text input / textarea by its id */
function changeById(container: HTMLElement, id: string, value: string) {
  const el = container.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) throw new Error(`Element with id="${id}" not found`);
  fireEvent.change(el, { target: { value } });
}

/** Get the current value of an element by its id */
function getValueById(container: HTMLElement, id: string): string {
  const el = container.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  if (!el) throw new Error(`Element with id="${id}" not found`);
  return el.value;
}

// ---------------------------------------------------------------------------
// Property 1 — Text tab state is preserved across switches
// ---------------------------------------------------------------------------

describe('Property 1: Tab input state is preserved across switches', () => {
  it('Text tab inputs survive a round-trip through Image Prompt tab', () => {
    fc.assert(
      fc.property(
        contentTypeArb,
        safeStringArb,
        toneArb,
        (contentType, topic, tone) => {
          const { container, unmount } = render(<ContentGenerator />);

          // Start on Text tab (default) — populate all three fields by id
          changeById(container, 'text-content-type', contentType);
          changeById(container, 'text-topic', topic);
          changeById(container, 'text-tone', tone);

          // Switch away to Image Prompt tab
          act(() => clickTab('Image Prompt'));

          // Switch back to Text tab
          act(() => clickTab('Text'));

          // All Text inputs must be unchanged
          expect(getValueById(container, 'text-content-type')).toBe(contentType);
          expect(getValueById(container, 'text-topic')).toBe(topic);
          expect(getValueById(container, 'text-tone')).toBe(tone);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Text tab inputs survive a round-trip through Email tab', () => {
    fc.assert(
      fc.property(
        contentTypeArb,
        safeStringArb,
        toneArb,
        (contentType, topic, tone) => {
          const { container, unmount } = render(<ContentGenerator />);

          changeById(container, 'text-content-type', contentType);
          changeById(container, 'text-topic', topic);
          changeById(container, 'text-tone', tone);

          act(() => clickTab('Email'));
          act(() => clickTab('Text'));

          expect(getValueById(container, 'text-content-type')).toBe(contentType);
          expect(getValueById(container, 'text-topic')).toBe(topic);
          expect(getValueById(container, 'text-tone')).toBe(tone);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  // ---------------------------------------------------------------------------
  // Property 1 — Image Prompt tab state is preserved across switches
  // ---------------------------------------------------------------------------

  it('Image Prompt tab inputs survive a round-trip through Text tab', () => {
    fc.assert(
      fc.property(
        safeStringArb,
        (depiction) => {
          const { container, unmount } = render(<ContentGenerator />);

          // Navigate to Image Prompt tab first
          act(() => clickTab('Image Prompt'));
          changeById(container, 'image-depiction', depiction);

          // Switch away to Text tab
          act(() => clickTab('Text'));

          // Switch back to Image Prompt tab
          act(() => clickTab('Image Prompt'));

          expect(getValueById(container, 'image-depiction')).toBe(depiction);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Image Prompt tab inputs survive a round-trip through Email tab', () => {
    fc.assert(
      fc.property(
        safeStringArb,
        (depiction) => {
          const { container, unmount } = render(<ContentGenerator />);

          act(() => clickTab('Image Prompt'));
          changeById(container, 'image-depiction', depiction);

          act(() => clickTab('Email'));
          act(() => clickTab('Image Prompt'));

          expect(getValueById(container, 'image-depiction')).toBe(depiction);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  // ---------------------------------------------------------------------------
  // Property 1 — Email tab state is preserved across switches
  // ---------------------------------------------------------------------------

  it('Email tab inputs survive a round-trip through Text tab', () => {
    fc.assert(
      fc.property(
        safeStringArb,
        safeStringArb,
        safeStringArb,
        (recipient, purpose, keyPoints) => {
          const { container, unmount } = render(<ContentGenerator />);

          act(() => clickTab('Email'));
          changeById(container, 'email-recipient', recipient);
          changeById(container, 'email-purpose', purpose);
          changeById(container, 'email-key-points', keyPoints);

          act(() => clickTab('Text'));
          act(() => clickTab('Email'));

          expect(getValueById(container, 'email-recipient')).toBe(recipient);
          expect(getValueById(container, 'email-purpose')).toBe(purpose);
          expect(getValueById(container, 'email-key-points')).toBe(keyPoints);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Email tab inputs survive a round-trip through Image Prompt tab', () => {
    fc.assert(
      fc.property(
        safeStringArb,
        safeStringArb,
        safeStringArb,
        (recipient, purpose, keyPoints) => {
          const { container, unmount } = render(<ContentGenerator />);

          act(() => clickTab('Email'));
          changeById(container, 'email-recipient', recipient);
          changeById(container, 'email-purpose', purpose);
          changeById(container, 'email-key-points', keyPoints);

          act(() => clickTab('Image Prompt'));
          act(() => clickTab('Email'));

          expect(getValueById(container, 'email-recipient')).toBe(recipient);
          expect(getValueById(container, 'email-purpose')).toBe(purpose);
          expect(getValueById(container, 'email-key-points')).toBe(keyPoints);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  // ---------------------------------------------------------------------------
  // Property 1 — All three tabs preserve state across a full rotation
  // ---------------------------------------------------------------------------

  it('all three tabs preserve their inputs across a full tab rotation', () => {
    fc.assert(
      fc.property(
        contentTypeArb,
        safeStringArb,
        toneArb,
        safeStringArb,
        safeStringArb,
        safeStringArb,
        safeStringArb,
        (contentType, topic, tone, depiction, recipient, purpose, keyPoints) => {
          const { container, unmount } = render(<ContentGenerator />);

          // Populate Text tab (default)
          changeById(container, 'text-content-type', contentType);
          changeById(container, 'text-topic', topic);
          changeById(container, 'text-tone', tone);

          // Populate Image Prompt tab
          act(() => clickTab('Image Prompt'));
          changeById(container, 'image-depiction', depiction);

          // Populate Email tab
          act(() => clickTab('Email'));
          changeById(container, 'email-recipient', recipient);
          changeById(container, 'email-purpose', purpose);
          changeById(container, 'email-key-points', keyPoints);

          // Verify Text tab
          act(() => clickTab('Text'));
          expect(getValueById(container, 'text-content-type')).toBe(contentType);
          expect(getValueById(container, 'text-topic')).toBe(topic);
          expect(getValueById(container, 'text-tone')).toBe(tone);

          // Verify Image Prompt tab
          act(() => clickTab('Image Prompt'));
          expect(getValueById(container, 'image-depiction')).toBe(depiction);

          // Verify Email tab
          act(() => clickTab('Email'));
          expect(getValueById(container, 'email-recipient')).toBe(recipient);
          expect(getValueById(container, 'email-purpose')).toBe(purpose);
          expect(getValueById(container, 'email-key-points')).toBe(keyPoints);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2 — Form submission includes all inputs in the API call
// ---------------------------------------------------------------------------

/**
 * Validates: Requirements 2.4, 3.2, 4.4, 7.2, 7.3
 *
 * Property 2: Form submission includes all inputs in the API call
 * For any valid combination of inputs for any tab, submitting the form should
 * result in a fetch call whose JSON body, when passed through buildPrompt,
 * contains all user-supplied string values from the inputs object.
 */

describe('Property 2: Form submission includes all inputs in the API call', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: 'Generated content' }),
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // Text tab
  // -------------------------------------------------------------------------

  it('Text tab: fetch body prompt contains all user-supplied string inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        contentTypeArb,
        safeStringArb,
        toneArb,
        async (contentType, topic, tone) => {
          const { container, unmount } = render(<ContentGenerator />);

          // Populate Text tab fields
          changeById(container, 'text-content-type', contentType);
          changeById(container, 'text-topic', topic);
          changeById(container, 'text-tone', tone);

          // Submit the form
          const submitBtn = container.querySelector('form button[type="submit"]') as HTMLButtonElement;
          await act(async () => {
            fireEvent.click(submitBtn);
          });

          // Verify fetch was called
          expect(fetchMock).toHaveBeenCalledTimes(1);

          // Extract the request body
          const [, callOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
          const body = JSON.parse(callOptions.body as string) as GenerateRequest;

          // Build the prompt from the captured request and assert all inputs appear
          const prompt = buildPrompt(body);
          expect(prompt).toContain(topic);
          // contentType and tone are enum values embedded in the prompt template
          expect(prompt).toContain(contentType);
          expect(prompt).toContain(tone);

          unmount();
          fetchMock.mockClear();
        }
      ),
      { numRuns: 10 }
    );
  });

  // -------------------------------------------------------------------------
  // Image Prompt tab
  // -------------------------------------------------------------------------

  it('Image Prompt tab: fetch body prompt contains the depiction string', async () => {
    await fc.assert(
      fc.asyncProperty(
        safeStringArb,
        async (depiction) => {
          const { container, unmount } = render(<ContentGenerator />);

          // Navigate to Image Prompt tab
          act(() => clickTab('Image Prompt'));

          changeById(container, 'image-depiction', depiction);

          const submitBtn = container.querySelector('form button[type="submit"]') as HTMLButtonElement;
          await act(async () => {
            fireEvent.click(submitBtn);
          });

          expect(fetchMock).toHaveBeenCalledTimes(1);

          const [, callOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
          const body = JSON.parse(callOptions.body as string) as GenerateRequest;

          const prompt = buildPrompt(body);
          expect(prompt).toContain(depiction);

          unmount();
          fetchMock.mockClear();
        }
      ),
      { numRuns: 10 }
    );
  });

  // -------------------------------------------------------------------------
  // Email tab
  // -------------------------------------------------------------------------

  it('Email tab: fetch body prompt contains all user-supplied string inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        safeStringArb,
        safeStringArb,
        safeStringArb,
        async (recipient, purpose, keyPoints) => {
          const { container, unmount } = render(<ContentGenerator />);

          // Navigate to Email tab
          act(() => clickTab('Email'));

          changeById(container, 'email-recipient', recipient);
          changeById(container, 'email-purpose', purpose);
          changeById(container, 'email-key-points', keyPoints);

          const submitBtn = container.querySelector('form button[type="submit"]') as HTMLButtonElement;
          await act(async () => {
            fireEvent.click(submitBtn);
          });

          expect(fetchMock).toHaveBeenCalledTimes(1);

          const [, callOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
          const body = JSON.parse(callOptions.body as string) as GenerateRequest;

          const prompt = buildPrompt(body);
          expect(prompt).toContain(purpose);
          expect(prompt).toContain(recipient);
          // keyPoints only appears in the prompt when non-empty after trimming
          if (keyPoints.trim().length > 0) {
            expect(prompt).toContain(keyPoints);
          }

          unmount();
          fetchMock.mockClear();
        }
      ),
      { numRuns: 10 }
    );
  });

  // -------------------------------------------------------------------------
  // Cross-tab: request body tab field matches the active tab
  // -------------------------------------------------------------------------

  it('fetch body tab field always matches the active tab at submission time', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'text' | 'image' | 'email'>('text', 'image', 'email'),
        safeStringArb,
        async (tab, value) => {
          const { container, unmount } = render(<ContentGenerator />);

          if (tab === 'text') {
            // Already on text tab; set a non-empty topic so validation passes
            changeById(container, 'text-topic', value);
          } else if (tab === 'image') {
            act(() => clickTab('Image Prompt'));
            changeById(container, 'image-depiction', value);
          } else {
            act(() => clickTab('Email'));
            changeById(container, 'email-purpose', value);
          }

          const submitBtn = container.querySelector('form button[type="submit"]') as HTMLButtonElement;
          await act(async () => {
            fireEvent.click(submitBtn);
          });

          expect(fetchMock).toHaveBeenCalledTimes(1);

          const [, callOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
          const body = JSON.parse(callOptions.body as string) as GenerateRequest;

          expect(body.tab).toBe(tab);

          unmount();
          fetchMock.mockClear();
        }
      ),
      { numRuns: 10 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6 — Regenerate uses the same inputs as the original request
// ---------------------------------------------------------------------------

/**
 * Validates: Requirements 5.4
 *
 * Property 6: Regenerate uses the same inputs as the original request
 * For any valid combination of inputs on any tab, clicking Regenerate after a
 * successful submission must result in a second fetch call whose JSON body is
 * identical to the first fetch call's JSON body.
 */

describe('Property 6: Regenerate uses the same inputs as the original request', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: 'Generated content' }),
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // Text tab
  // -------------------------------------------------------------------------

  it('Text tab: Regenerate sends the same payload as the original submission', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contentType: contentTypeArb,
          topic: safeStringArb,
          tone: toneArb,
        }),
        async ({ contentType, topic, tone }) => {
          const { container, unmount } = render(<ContentGenerator />);

          // Populate Text tab fields
          changeById(container, 'text-content-type', contentType);
          changeById(container, 'text-topic', topic);
          changeById(container, 'text-tone', tone);

          // Submit the form (first fetch call)
          const submitBtn = container.querySelector('form button[type="submit"]') as HTMLButtonElement;
          await act(async () => {
            fireEvent.click(submitBtn);
          });

          expect(fetchMock).toHaveBeenCalledTimes(1);
          const [, firstCallOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
          const firstBody = JSON.parse(firstCallOptions.body as string) as GenerateRequest;

          // Wait for the Regenerate button to appear (output is set)
          await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
          });

          // Click Regenerate (second fetch call)
          await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
          });

          expect(fetchMock).toHaveBeenCalledTimes(2);
          const [, secondCallOptions] = fetchMock.mock.calls[1] as [string, RequestInit];
          const secondBody = JSON.parse(secondCallOptions.body as string) as GenerateRequest;

          // The second call's body must equal the first
          expect(secondBody).toEqual(firstBody);

          unmount();
          fetchMock.mockClear();
        }
      ),
      { numRuns: 10 }
    );
  });

  // -------------------------------------------------------------------------
  // Image Prompt tab
  // -------------------------------------------------------------------------

  it('Image Prompt tab: Regenerate sends the same payload as the original submission', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          depiction: safeStringArb,
        }),
        async ({ depiction }) => {
          const { container, unmount } = render(<ContentGenerator />);

          // Navigate to Image Prompt tab
          act(() => clickTab('Image Prompt'));

          changeById(container, 'image-depiction', depiction);

          // Submit the form (first fetch call)
          const submitBtn = container.querySelector('form button[type="submit"]') as HTMLButtonElement;
          await act(async () => {
            fireEvent.click(submitBtn);
          });

          expect(fetchMock).toHaveBeenCalledTimes(1);
          const [, firstCallOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
          const firstBody = JSON.parse(firstCallOptions.body as string) as GenerateRequest;

          // Wait for the Regenerate button to appear
          await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
          });

          // Click Regenerate (second fetch call)
          await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
          });

          expect(fetchMock).toHaveBeenCalledTimes(2);
          const [, secondCallOptions] = fetchMock.mock.calls[1] as [string, RequestInit];
          const secondBody = JSON.parse(secondCallOptions.body as string) as GenerateRequest;

          expect(secondBody).toEqual(firstBody);

          unmount();
          fetchMock.mockClear();
        }
      ),
      { numRuns: 10 }
    );
  });

  // -------------------------------------------------------------------------
  // Email tab
  // -------------------------------------------------------------------------

  it('Email tab: Regenerate sends the same payload as the original submission', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          recipient: safeStringArb,
          purpose: safeStringArb,
          keyPoints: safeStringArb,
        }),
        async ({ recipient, purpose, keyPoints }) => {
          const { container, unmount } = render(<ContentGenerator />);

          // Navigate to Email tab
          act(() => clickTab('Email'));

          changeById(container, 'email-recipient', recipient);
          changeById(container, 'email-purpose', purpose);
          changeById(container, 'email-key-points', keyPoints);

          // Submit the form (first fetch call)
          const submitBtn = container.querySelector('form button[type="submit"]') as HTMLButtonElement;
          await act(async () => {
            fireEvent.click(submitBtn);
          });

          expect(fetchMock).toHaveBeenCalledTimes(1);
          const [, firstCallOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
          const firstBody = JSON.parse(firstCallOptions.body as string) as GenerateRequest;

          // Wait for the Regenerate button to appear
          await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
          });

          // Click Regenerate (second fetch call)
          await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
          });

          expect(fetchMock).toHaveBeenCalledTimes(2);
          const [, secondCallOptions] = fetchMock.mock.calls[1] as [string, RequestInit];
          const secondBody = JSON.parse(secondCallOptions.body as string) as GenerateRequest;

          expect(secondBody).toEqual(firstBody);

          unmount();
          fetchMock.mockClear();
        }
      ),
      { numRuns: 10 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12 — All form inputs have associated labels
// ---------------------------------------------------------------------------

// Feature: content-generator, Property 12: All form inputs have associated labels

import TextForm from '../TextForm';
import ImagePromptForm from '../ImagePromptForm';
import EmailForm from '../EmailForm';
import type { TextInputs, ImageInputs, EmailInputs, ContentType, Tone } from '@/types';

/**
 * Validates: Requirements 8.5
 *
 * Property 12: All form inputs have associated labels
 * For any combination of inputs rendered in TextForm, ImagePromptForm, or
 * EmailForm, every <input>, <select>, and <textarea> element must have an
 * associated label — either via a matching htmlFor/id pair or via an
 * aria-label attribute.
 */

/** Returns true if the given form control element has an associated label */
function hasAssociatedLabel(el: Element, container: HTMLElement): boolean {
  const id = el.getAttribute('id');
  if (id) {
    const label = container.querySelector(`label[for="${id}"]`);
    if (label) return true;
  }
  if (el.getAttribute('aria-label')) return true;
  if (el.getAttribute('aria-labelledby')) {
    const labelId = el.getAttribute('aria-labelledby')!;
    if (container.querySelector(`#${labelId}`)) return true;
  }
  return false;
}

/** Assert every input/select/textarea in the container has an associated label */
function assertAllControlsLabelled(container: HTMLElement): void {
  const controls = container.querySelectorAll('input, select, textarea');
  controls.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const id = el.getAttribute('id') ?? '(no id)';
    expect(hasAssociatedLabel(el, container)).toBe(true);
    // Provide a descriptive failure message via a separate assertion
    if (!hasAssociatedLabel(el, container)) {
      throw new Error(`<${tag} id="${id}"> has no associated label`);
    }
  });
}

describe('Property 12: All form inputs have associated labels', () => {
  it('TextForm — every input/select/textarea has an associated label for any inputs', () => {
    fc.assert(
      fc.property(
        fc.record<TextInputs>({
          contentType: fc.constantFrom<ContentType>(
            'Blog Post',
            'LinkedIn Post',
            'Tweet Thread',
            'Article Intro',
            'Product Description'
          ),
          topic: fc.string({ maxLength: 100 }),
          tone: fc.constantFrom<Tone>('Professional', 'Casual', 'Persuasive', 'Humorous'),
        }),
        (inputs) => {
          const { container, unmount } = render(
            <TextForm
              inputs={inputs}
              onChange={jest.fn()}
              onSubmit={jest.fn()}
              isLoading={false}
            />
          );

          assertAllControlsLabelled(container);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('ImagePromptForm — every input/select/textarea has an associated label for any inputs', () => {
    fc.assert(
      fc.property(
        fc.record<ImageInputs>({
          depiction: fc.string({ maxLength: 200 }),
        }),
        (inputs) => {
          const { container, unmount } = render(
            <ImagePromptForm
              inputs={inputs}
              onChange={jest.fn()}
              onSubmit={jest.fn()}
              isLoading={false}
            />
          );

          assertAllControlsLabelled(container);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('EmailForm — every input/select/textarea has an associated label for any inputs', () => {
    fc.assert(
      fc.property(
        fc.record<EmailInputs>({
          recipient: fc.string({ maxLength: 100 }),
          purpose: fc.string({ maxLength: 200 }),
          keyPoints: fc.string({ maxLength: 500 }),
        }),
        (inputs) => {
          const { container, unmount } = render(
            <EmailForm
              inputs={inputs}
              onChange={jest.fn()}
              onSubmit={jest.fn()}
              isLoading={false}
            />
          );

          assertAllControlsLabelled(container);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('TextForm with isLoading=true — labels still present for all controls', () => {
    fc.assert(
      fc.property(
        fc.record<TextInputs>({
          contentType: fc.constantFrom<ContentType>(
            'Blog Post',
            'LinkedIn Post',
            'Tweet Thread',
            'Article Intro',
            'Product Description'
          ),
          topic: fc.string({ maxLength: 100 }),
          tone: fc.constantFrom<Tone>('Professional', 'Casual', 'Persuasive', 'Humorous'),
        }),
        (inputs) => {
          const { container, unmount } = render(
            <TextForm
              inputs={inputs}
              onChange={jest.fn()}
              onSubmit={jest.fn()}
              isLoading={true}
            />
          );

          assertAllControlsLabelled(container);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('EmailForm with isLoading=true — labels still present for all controls', () => {
    fc.assert(
      fc.property(
        fc.record<EmailInputs>({
          recipient: fc.string({ maxLength: 100 }),
          purpose: fc.string({ maxLength: 200 }),
          keyPoints: fc.string({ maxLength: 500 }),
        }),
        (inputs) => {
          const { container, unmount } = render(
            <EmailForm
              inputs={inputs}
              onChange={jest.fn()}
              onSubmit={jest.fn()}
              isLoading={true}
            />
          );

          assertAllControlsLabelled(container);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});
