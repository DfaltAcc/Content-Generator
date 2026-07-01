'use client';

import styles from './OutputPanel.module.css';
import type { ContentType, PostResult } from '../types';

interface OutputPanelProps {
  output: string;
  imageUrl?: string | null;
  isLoading: boolean;
  error: string | null;
  copyConfirmed: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  // Social media posting props (all optional — existing callers unaffected)
  contentType?: ContentType;
  onPostLinkedIn?: () => void;
  onPostTwitter?: () => void;
  isPosting?: boolean;
  postResult?: PostResult | null;
}

export default function OutputPanel({
  output,
  imageUrl = null,
  isLoading,
  error,
  copyConfirmed,
  onCopy,
  onRegenerate,
  contentType,
  onPostLinkedIn,
  onPostTwitter,
  isPosting = false,
  postResult = null,
}: OutputPanelProps) {
  const hasContent = Boolean(output) || Boolean(imageUrl);
  const isEmpty = !output && !imageUrl && !error && !isLoading;

  // Post buttons are only shown when there is content and no loading/error state
  const canShowPostButtons = hasContent && !isLoading && !error;
  const showLinkedInButton =
    canShowPostButtons && contentType === 'LinkedIn Post' && Boolean(onPostLinkedIn);
  const showTwitterButton =
    canShowPostButtons && contentType === 'Tweet Thread' && Boolean(onPostTwitter);

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
        <>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Generated image"
              className={styles.generatedImage}
              style={{ maxWidth: '100%', borderRadius: '8px' }}
            />
          ) : (
            <div style={{ whiteSpace: 'pre-wrap' }} className={styles.output}>
              {output}
            </div>
          )}
        </>
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

          {showLinkedInButton && (
            <button
              type="button"
              className={styles.actionButton}
              onClick={onPostLinkedIn}
              disabled={isPosting}
              aria-label={isPosting ? 'Posting to LinkedIn…' : 'Post to LinkedIn'}
            >
              {isPosting ? 'Posting…' : 'Post to LinkedIn'}
            </button>
          )}

          {showTwitterButton && (
            <button
              type="button"
              className={styles.actionButton}
              onClick={onPostTwitter}
              disabled={isPosting}
              aria-label={isPosting ? 'Posting to Twitter/X…' : 'Post to Twitter/X'}
            >
              {isPosting ? 'Posting…' : 'Post to Twitter/X'}
            </button>
          )}
        </div>
      )}

      {postResult && (
        <p
          className={
            postResult.status === 'success' ? styles.postSuccess : styles.postError
          }
          role="status"
          aria-live="polite"
        >
          {postResult.message}
        </p>
      )}
    </section>
  );
}
