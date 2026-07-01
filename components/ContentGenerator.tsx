'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ActiveTab, TextInputs, ImageInputs, EmailInputs, GenerateRequest, LibraryPrompt, ConnectionStatus, PostResult } from '@/types';
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
  
  // Store results per tab
  const [textOutput, setTextOutput] = useState('');
  const [imageOutput, setImageOutput] = useState<string | null>(null);
  const [emailOutput, setEmailOutput] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [lastRequest, setLastRequest] = useState<GenerateRequest | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postResult, setPostResult] = useState<PostResult | null>(null);

  // Compute which output to show based on active tab
  const currentOutput = activeTab === 'text' ? textOutput : activeTab === 'email' ? emailOutput : '';
  const currentImageUrl = activeTab === 'image' ? imageOutput : null;

  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<ConnectionStatus>;
      })
      .then((data) => { if (data) setConnectionStatus(data); })
      .catch((err) => console.error('Failed to fetch connection status:', err));
  }, []);

  function handleTabChange(tab: ActiveTab) {
    setActiveTab(tab);
    // Clear error and post result when switching — results are stored per tab
    setError(null);
    setPostResult(null);
  }

  async function handleSubmit(request: GenerateRequest) {
    setIsLoading(true);
    setError(null);
    setPostResult(null);
    setLastRequest(request);

    if (request.tab === 'image') {
      setImageOutput(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);
      try {
        const promptRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        const promptData = await promptRes.json() as { content?: string; error?: string };
        if (!promptRes.ok || !promptData.content) {
          setError(promptData.error ?? 'Failed to build image prompt.');
          return;
        }
        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptData.content }),
          signal: controller.signal,
        });
        const imgData = await imgRes.json() as { imageUrl?: string; error?: string };
        if (!imgRes.ok || !imgData.imageUrl) {
          setError(imgData.error ?? 'Image generation failed. Please try again.');
        } else {
          setImageOutput(imgData.imageUrl);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          setError('Network error — please check your connection.');
        }
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
      return;
    }

    // Text or email tab
    if (request.tab === 'text') setTextOutput('');
    if (request.tab === 'email') setEmailOutput('');

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
        if (request.tab === 'text') setTextOutput(data.content ?? '');
        if (request.tab === 'email') setEmailOutput(data.content ?? '');
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
      await navigator.clipboard.writeText(currentOutput);
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 2000);
    } catch {
      setError('Copy failed — please select and copy manually.');
    }
  }

  async function handlePostLinkedIn() {
    setIsPosting(true);
    setPostResult(null);
    try {
      const res = await fetch('/api/post/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentOutput }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setPostResult({
          platform: 'linkedin',
          status: 'error',
          message: 'Please connect your LinkedIn account in Settings before posting.',
        });
      } else if (res.ok) {
        setPostResult({
          platform: 'linkedin',
          status: 'success',
          message: data.message,
        });
      } else {
        setPostResult({
          platform: 'linkedin',
          status: 'error',
          message: data.error ?? 'Failed to post to LinkedIn. Please try again.',
        });
      }
    } catch {
      setPostResult({
        platform: 'linkedin',
        status: 'error',
        message: 'Failed to post to LinkedIn. Please try again.',
      });
    } finally {
      setIsPosting(false);
    }
  }

  async function handlePostTwitter() {
    setIsPosting(true);
    setPostResult(null);
    try {
      const res = await fetch('/api/post/twitter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentOutput }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setPostResult({
          platform: 'twitter',
          status: 'error',
          message: 'Please connect your Twitter/X account in Settings before posting.',
        });
      } else if (res.ok) {
        setPostResult({
          platform: 'twitter',
          status: 'success',
          message: data.message,
        });
      } else {
        setPostResult({
          platform: 'twitter',
          status: 'error',
          message: data.error ?? 'Failed to post to Twitter/X. Please try again.',
        });
      }
    } catch {
      setPostResult({
        platform: 'twitter',
        status: 'error',
        message: 'Failed to post to Twitter/X. Please try again.',
      });
    } finally {
      setIsPosting(false);
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
        <Link href="/settings" className={styles.settingsLink}>
          Settings
        </Link>
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
            output={currentOutput}
            imageUrl={currentImageUrl}
            isLoading={isLoading}
            error={error}
            copyConfirmed={copyConfirmed}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
            contentType={activeTab === 'text' ? textInputs.contentType : undefined}
            onPostLinkedIn={handlePostLinkedIn}
            onPostTwitter={handlePostTwitter}
            isPosting={isPosting}
            postResult={postResult}
          />
        </div>
      </div>

      <PromptLibrary onSelectPrompt={handleSelectPrompt} />
    </div>
  );
}
