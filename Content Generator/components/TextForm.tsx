'use client';

import { useState } from 'react';
import type { TextInputs, ContentType, Tone } from '@/types';
import styles from './TextForm.module.css';

interface TextFormProps {
  inputs: TextInputs;
  onChange: (inputs: TextInputs) => void;
  onSubmit: (inputs: TextInputs) => void;
  isLoading: boolean;
}

const CONTENT_TYPES: ContentType[] = [
  'Blog Post',
  'LinkedIn Post',
  'Tweet Thread',
  'Article Intro',
  'Product Description',
];

const TONES: Tone[] = ['Professional', 'Casual', 'Persuasive', 'Humorous'];

export default function TextForm({
  inputs,
  onChange,
  onSubmit,
  isLoading,
}: TextFormProps) {
  const [showValidation, setShowValidation] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inputs.topic.trim()) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    onSubmit(inputs);
  }

  function handleTopicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const topic = e.target.value;
    if (topic.trim()) {
      setShowValidation(false);
    }
    onChange({ ...inputs, topic });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* Content Type */}
      <div className={styles.field}>
        <label htmlFor="text-content-type" className={styles.label}>
          Content type
        </label>
        <select
          id="text-content-type"
          className={styles.select}
          value={inputs.contentType}
          onChange={(e) =>
            onChange({ ...inputs, contentType: e.target.value as ContentType })
          }
          disabled={isLoading}
        >
          {CONTENT_TYPES.map((ct) => (
            <option key={ct} value={ct}>
              {ct}
            </option>
          ))}
        </select>
      </div>

      {/* Topic */}
      <div className={styles.field}>
        <label htmlFor="text-topic" className={styles.label}>
          Topic or subject
        </label>
        <input
          id="text-topic"
          type="text"
          className={`${styles.input} ${showValidation ? styles.inputError : ''}`}
          value={inputs.topic}
          onChange={handleTopicChange}
          placeholder="e.g. The future of remote work"
          aria-describedby={showValidation ? 'text-topic-error' : undefined}
          aria-invalid={showValidation ? true : undefined}
          disabled={isLoading}
        />
        {showValidation && (
          <p id="text-topic-error" className={styles.validationMessage} role="alert">
            Please enter a topic before generating.
          </p>
        )}
      </div>

      {/* Tone */}
      <div className={styles.field}>
        <label htmlFor="text-tone" className={styles.label}>
          Tone
        </label>
        <select
          id="text-tone"
          className={styles.select}
          value={inputs.tone}
          onChange={(e) =>
            onChange({ ...inputs, tone: e.target.value as Tone })
          }
          disabled={isLoading}
        >
          {TONES.map((tone) => (
            <option key={tone} value={tone}>
              {tone}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isLoading}
      >
        {isLoading ? 'Generating…' : 'Generate'}
      </button>
    </form>
  );
}
