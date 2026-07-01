import { render, screen, fireEvent } from '@testing-library/react';
import PromptLibrary from '../PromptLibrary';
import { PROMPT_LIBRARY } from '@/lib/promptLibrary';

/**
 * Unit tests for PromptLibrary component
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

function renderPromptLibrary(onSelectPrompt = jest.fn()) {
  render(<PromptLibrary onSelectPrompt={onSelectPrompt} />);
  return { onSelectPrompt };
}

// ---------------------------------------------------------------------------
// Requirement 6.1 — Renders all 9 prompt cards
// ---------------------------------------------------------------------------
describe('Renders all prompt cards (Requirement 6.1)', () => {
  it('renders exactly 9 prompt card buttons', () => {
    renderPromptLibrary();

    // Each prompt is rendered as a button with the prompt title as its accessible name
    const allTitles = PROMPT_LIBRARY.map((p) => p.title);
    const buttons = allTitles.map((title) =>
      screen.getByRole('button', { name: title })
    );

    expect(buttons).toHaveLength(9);
  });

  it('renders a button for every prompt title in PROMPT_LIBRARY', () => {
    renderPromptLibrary();

    for (const prompt of PROMPT_LIBRARY) {
      expect(screen.getByRole('button', { name: prompt.title })).toBeInTheDocument();
    }
  });
});

// ---------------------------------------------------------------------------
// Requirement 6.2 — Clicking a card calls onSelectPrompt with the correct data
// ---------------------------------------------------------------------------
describe('Card click calls onSelectPrompt with correct data (Requirement 6.2)', () => {
  it('calls onSelectPrompt once when a card is clicked', () => {
    const { onSelectPrompt } = renderPromptLibrary();
    const firstPrompt = PROMPT_LIBRARY[0];

    fireEvent.click(screen.getByRole('button', { name: firstPrompt.title }));

    expect(onSelectPrompt).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectPrompt with the correct LibraryPrompt object for a text prompt', () => {
    const { onSelectPrompt } = renderPromptLibrary();
    const textPrompt = PROMPT_LIBRARY.find((p) => p.tab === 'text')!;

    fireEvent.click(screen.getByRole('button', { name: textPrompt.title }));

    expect(onSelectPrompt).toHaveBeenCalledWith(textPrompt);
  });

  it('calls onSelectPrompt with the correct LibraryPrompt object for an image prompt', () => {
    const { onSelectPrompt } = renderPromptLibrary();
    const imagePrompt = PROMPT_LIBRARY.find((p) => p.tab === 'image')!;

    fireEvent.click(screen.getByRole('button', { name: imagePrompt.title }));

    expect(onSelectPrompt).toHaveBeenCalledWith(imagePrompt);
  });

  it('calls onSelectPrompt with the correct LibraryPrompt object for an email prompt', () => {
    const { onSelectPrompt } = renderPromptLibrary();
    const emailPrompt = PROMPT_LIBRARY.find((p) => p.tab === 'email')!;

    fireEvent.click(screen.getByRole('button', { name: emailPrompt.title }));

    expect(onSelectPrompt).toHaveBeenCalledWith(emailPrompt);
  });

  it('passes the correct tab value for each prompt', () => {
    for (const expectedPrompt of PROMPT_LIBRARY) {
      const onSelectPrompt = jest.fn();
      const { unmount } = render(<PromptLibrary onSelectPrompt={onSelectPrompt} />);

      fireEvent.click(screen.getByRole('button', { name: expectedPrompt.title }));

      const received = onSelectPrompt.mock.calls[0][0];
      expect(received.tab).toBe(expectedPrompt.tab);
      expect(received.inputs).toEqual(expectedPrompt.inputs);

      unmount();
    }
  });
});

// ---------------------------------------------------------------------------
// Requirement 6.3 — Cards are grouped under the correct headings
// ---------------------------------------------------------------------------
describe('Cards grouped under correct headings (Requirement 6.3)', () => {
  it('renders a "Text" group heading', () => {
    renderPromptLibrary();

    expect(screen.getByRole('heading', { name: 'Text' })).toBeInTheDocument();
  });

  it('renders an "Image Prompt" group heading', () => {
    renderPromptLibrary();

    expect(screen.getByRole('heading', { name: 'Image Prompt' })).toBeInTheDocument();
  });

  it('renders an "Email" group heading', () => {
    renderPromptLibrary();

    expect(screen.getByRole('heading', { name: 'Email' })).toBeInTheDocument();
  });

  it('text prompt cards appear under the "Text" heading', () => {
    renderPromptLibrary();

    const textHeading = screen.getByRole('heading', { name: 'Text' });
    const textPrompts = PROMPT_LIBRARY.filter((p) => p.tab === 'text');

    // The heading's parent group element should contain all text prompt buttons
    const groupEl = textHeading.closest('div')!;
    for (const prompt of textPrompts) {
      expect(groupEl).toContainElement(
        screen.getByRole('button', { name: prompt.title })
      );
    }
  });

  it('image prompt cards appear under the "Image Prompt" heading', () => {
    renderPromptLibrary();

    const imageHeading = screen.getByRole('heading', { name: 'Image Prompt' });
    const imagePrompts = PROMPT_LIBRARY.filter((p) => p.tab === 'image');

    const groupEl = imageHeading.closest('div')!;
    for (const prompt of imagePrompts) {
      expect(groupEl).toContainElement(
        screen.getByRole('button', { name: prompt.title })
      );
    }
  });

  it('email prompt cards appear under the "Email" heading', () => {
    renderPromptLibrary();

    const emailHeading = screen.getByRole('heading', { name: 'Email' });
    const emailPrompts = PROMPT_LIBRARY.filter((p) => p.tab === 'email');

    const groupEl = emailHeading.closest('div')!;
    for (const prompt of emailPrompts) {
      expect(groupEl).toContainElement(
        screen.getByRole('button', { name: prompt.title })
      );
    }
  });

  it('each group contains exactly 3 prompt cards', () => {
    renderPromptLibrary();

    const headings = ['Text', 'Image Prompt', 'Email'];
    for (const headingName of headings) {
      const heading = screen.getByRole('heading', { name: headingName });
      const groupEl = heading.closest('div')!;
      const buttons = groupEl.querySelectorAll('button');
      expect(buttons).toHaveLength(3);
    }
  });
});

// ---------------------------------------------------------------------------
// Requirement 6.4 — Prompt library section is accessible
// ---------------------------------------------------------------------------
describe('Prompt library section structure (Requirement 6.4)', () => {
  it('renders a section with aria-label "Prompt library"', () => {
    renderPromptLibrary();

    expect(
      screen.getByRole('region', { name: /prompt library/i })
    ).toBeInTheDocument();
  });

  it('renders the "Prompt Library" heading', () => {
    renderPromptLibrary();

    expect(
      screen.getByRole('heading', { name: /prompt library/i })
    ).toBeInTheDocument();
  });
});
