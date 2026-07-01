'use client';

import { useState } from 'react';
import type { ActiveTab, TextInputs, ImageInputs, EmailInputs, GenerateRequest, LibraryPrompt } from '@/types';
import TabBar from './TabBar';
import TextForm from './TextForm';
import ImagePromptForm from './ImagePromptForm';
import EmailForm from './EmailForm';
import OutputPanel from './OutputPanel';
import PromptLibrary from './PromptLibrary';
import styles from './ContentGenerator.module.css';

export default function ContentGenerator() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('text');
  const [textInputs, setTextInputs] = useState<TextInputs>({
    contentType: 'Blog Post',
    topic: '',
    tone: 'Professional',
  });
  const [imageInputs, setImageInputs] = useState<ImageInputs>({ depiction: '' });
  const [emailInputs, setEmailInputs] = useState<EmailInputs>({
    recipient: '',
    purpose: '',
    keyPoints: '',
  });
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [lastRequest, setLastRequest] = useState<GenerateRequest | null>(null);

  function handleTabChange(tab: ActiveTab) {
    setActiveTab(tab);
    // Do NOT reset per-tab input state
  }

  async function handleSubmit(request: GenerateRequest) {
    setIsLoading(true);
    setError(null);
    setOutput('');
    setLastRequest(request);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'An error occurred while generating content. Please try again.');
      } else {
        setOutput(data.content ?? '');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out after 30 seconds. Please try again.');
      } else {
        setError('Network error — please check your connection.');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  function handleTextSubmit(inputs: TextInputs) {
    handleSubmit({ tab: 'text', inputs });
  }

  function handleImageSubmit(inputs: ImageInputs) {
    handleSubmit({ tab: 'image', inputs });
  }

  function handleEmailSubmit(inputs: EmailInputs) {
    handleSubmit({ tab: 'email', inputs });
  }

  function handleRegenerate() {
    if (lastRequest) {
      handleSubmit(lastRequest);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 2000);
    } catch {
      setError('Copy failed — please select and copy manually.');
    }
  }

  function handleSelectPrompt(prompt: LibraryPrompt) {
    setActiveTab(prompt.tab);
    if (prompt.tab === 'text') {
      setTextInputs(prompt.inputs as TextInputs);
    } else if (prompt.tab === 'image') {
      setImageInputs(prompt.inputs as ImageInputs);
    } else if (prompt.tab === 'email') {
      setEmailInputs(prompt.inputs as EmailInputs);
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Content Generator</h1>
      </header>

      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className={styles.main}>
        <div className={styles.formPanel}>
          {activeTab === 'text' && (
            <TextForm
              inputs={textInputs}
              onChange={setTextInputs}
              onSubmit={handleTextSubmit}
              isLoading={isLoading}
            />
          )}
          {activeTab === 'image' && (
            <ImagePromptForm
              inputs={imageInputs}
              onChange={setImageInputs}
              onSubmit={handleImageSubmit}
              isLoading={isLoading}
            />
          )}
          {activeTab === 'email' && (
            <EmailForm
              inputs={emailInputs}
              onChange={setEmailInputs}
              onSubmit={handleEmailSubmit}
              isLoading={isLoading}
            />
          )}
        </div>

        <div className={styles.outputPanel}>
          <OutputPanel
            output={output}
            isLoading={isLoading}
            error={error}
            copyConfirmed={copyConfirmed}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
          />
        </div>
      </div>

      <PromptLibrary onSelectPrompt={handleSelectPrompt} />
    </div>
  );
}
