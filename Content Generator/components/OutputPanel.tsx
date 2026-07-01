'use client';

import styles from './OutputPanel.module.css';

interface OutputPanelProps {
  output: string;
  isLoading: boolean;
  error: string | null;
  copyConfirmed: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
}

export default function OutputPanel({
  output,
  isLoading,
  error,
  copyConfirmed,
  onCopy,
  onRegenerate,
}: OutputPanelProps) {
  const hasContent = Boolean(output);
  const isEmpty = !output && !error && !isLoading;

  return (
    <section
      role="region"
      aria-label="Generated content"
      aria-live="polite"
      aria-busy={isLoading ? true : undefined}
      className={styles.panel}
    >
      {isLoading && (
        <p className={styles.loading} aria-live="polite">
          Generating…
        </p>
      )}

      {!isLoading && error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {!isLoading && !error && hasContent && (
        <div style={{ whiteSpace: 'pre-wrap' }} className={styles.output}>
          {output}
        </div>
      )}

      {isEmpty && (
        <p className={styles.placeholder}>
          Your generated content will appear here.
        </p>
      )}

      {hasContent && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={onCopy}
          >
            {copyConfirmed ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={onRegenerate}
            disabled={isLoading}
          >
            Regenerate
          </button>
        </div>
      )}
    </section>
  );
}
