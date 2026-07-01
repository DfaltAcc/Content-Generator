'use client';

import type { ActiveTab, LibraryPrompt } from '@/types';
import { PROMPT_LIBRARY } from '@/lib/promptLibrary';
import styles from './PromptLibrary.module.css';

interface PromptLibraryProps {
  onSelectPrompt: (prompt: LibraryPrompt) => void;
}

const GROUPS: { tab: ActiveTab; heading: string }[] = [
  { tab: 'text', heading: 'Text' },
  { tab: 'image', heading: 'Image Prompt' },
  { tab: 'email', heading: 'Email' },
];

export default function PromptLibrary({ onSelectPrompt }: PromptLibraryProps) {
  return (
    <section className={styles.library} aria-label="Prompt library">
      <h2 className={styles.libraryHeading}>Prompt Library</h2>
      <div className={styles.groups}>
        {GROUPS.map(({ tab, heading }) => {
          const prompts = PROMPT_LIBRARY.filter((p) => p.tab === tab);
          return (
            <div key={tab} className={styles.group}>
              <h3 className={styles.groupHeading}>{heading}</h3>
              <ul className={styles.cardList} role="list">
                {prompts.map((prompt) => (
                  <li key={prompt.id}>
                    <button
                      type="button"
                      className={styles.card}
                      onClick={() => onSelectPrompt(prompt)}
                    >
                      {prompt.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
