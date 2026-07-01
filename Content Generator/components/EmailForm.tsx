'use client';

import { useState } from 'react';
import type { EmailInputs } from '@/types';
import styles from './EmailForm.module.css';

interface EmailFormProps {
  inputs: EmailInputs;
  onChange: (inputs: EmailInputs) => void;
  onSubmit: (inputs: EmailInputs) => void;
  isLoading: boolean;
}

export default function EmailForm({
  inputs,
  onChange,
  onSubmit,
  isLoading,
}: EmailFormProps) {
  const [showValidation, setShowValidation] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inputs.purpose.trim()) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    onSubmit(inputs);
  }

  function handlePurposeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const purpose = e.target.value;
    if (purpose.trim()) {
      setShowValidation(false);
    }
    onChange({ ...inputs, purpose });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* Recipient */}
      <div className={styles.field}>
        <label htmlFor="email-recipient" className={styles.label}>
          Recipient
        </label>
        <input
          id="email-recipient"
          type="text"
          className={styles.input}
          value={inputs.recipient}
          onChange={(e) => onChange({ ...inputs, recipient: e.target.value })}
          placeholder="e.g. my manager, a potential client"
          disabled={isLoading}
        />
      </div>

      {/* Purpose */}
      <div className={styles.field}>
        <label htmlFor="email-purpose" className={styles.label}>
          Purpose or subject
        </label>
        <input
          id="email-purpose"
          type="text"
          className={`${styles.input} ${showValidation ? styles.inputError : ''}`}
          value={inputs.purpose}
          onChange={handlePurposeChange}
          placeholder="e.g. Request a one-on-one meeting to discuss career growth"
          aria-describedby={showValidation ? 'email-purpose-error' : undefined}
          aria-invalid={showValidation ? true : undefined}
          disabled={isLoading}
        />
        {showValidation && (
          <p id="email-purpose-error" className={styles.validationMessage} role="alert">
            Please enter a purpose before generating.
          </p>
        )}
      </div>

      {/* Key Points */}
      <div className={styles.field}>
        <label htmlFor="email-key-points" className={styles.label}>
          Key points
        </label>
        <textarea
          id="email-key-points"
          className={styles.textarea}
          value={inputs.keyPoints}
          onChange={(e) => onChange({ ...inputs, keyPoints: e.target.value })}
          placeholder="e.g. Recent project contributions, goals for next quarter, request for mentorship"
          rows={4}
          disabled={isLoading}
        />
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
