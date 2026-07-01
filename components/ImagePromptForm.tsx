'use client';

import { useState } from 'react';
import type { ImageInputs } from '@/types';
import styles from './ImagePromptForm.module.css';

interface ImagePromptFormProps {
  inputs: ImageInputs;
  onChange: (inputs: ImageInputs) => void;
  onSubmit: (inputs: ImageInputs) => void;
  isLoading: boolean;
}

export default function ImagePromptForm({
  inputs,
  onChange,
  onSubmit,
  isLoading,
}: ImagePromptFormProps) {
  const [showValidation, setShowValidation] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inputs.depiction.trim()) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    onSubmit(inputs);
  }

  function handleDepictionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const depiction = e.target.value;
    if (depiction.trim()) {
      setShowValidation(false);
    }
    onChange({ ...inputs, depiction });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* What to depict */}
      <div className={styles.field}>
        <label htmlFor="image-depiction" className={styles.label}>
          What to depict
        </label>
        <textarea
          id="image-depiction"
          className={`${styles.textarea} ${showValidation ? styles.textareaError : ''}`}
          value={inputs.depiction}
          onChange={handleDepictionChange}
          placeholder="e.g. A sprawling cyberpunk city at night with neon signs reflecting on wet streets"
          rows={4}
          aria-describedby={showValidation ? 'image-depiction-error' : undefined}
          aria-invalid={showValidation ? true : undefined}
          disabled={isLoading}
        />
        {showValidation && (
          <p id="image-depiction-error" className={styles.validationMessage} role="alert">
            Please describe what to depict before generating.
          </p>
        )}
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
