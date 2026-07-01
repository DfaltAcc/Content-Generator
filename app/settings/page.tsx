'use client';

/**
 * app/settings/page.tsx
 *
 * Settings page — lets users connect and disconnect their LinkedIn and Twitter/X accounts.
 * Fetches connection status from /api/auth/status on mount.
 * Handles ?connected= and ?error= query params from OAuth redirects.
 *
 * Requirements: 1.1, 1.4, 1.5, 1.6, 2.1, 2.4, 2.5, 2.6, 8.1
 */

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import SettingsPanel from '@/components/SettingsPanel';
import type { ConnectionStatus, Platform } from '@/types';

const DEFAULT_STATUS: ConnectionStatus = {
  linkedin: { connected: false },
  twitter: { connected: false },
};

function resolveMessage(
  connected: string | null,
  error: string | null
): { type: 'success' | 'error'; text: string } | null {
  if (connected === 'linkedin') {
    return { type: 'success', text: 'LinkedIn account connected successfully.' };
  }
  if (connected === 'twitter') {
    return { type: 'success', text: 'Twitter/X account connected successfully.' };
  }
  if (error === 'linkedin_denied') {
    return { type: 'error', text: 'Authorisation was denied. Please try again.' };
  }
  if (error === 'twitter_denied') {
    return { type: 'error', text: 'Authorisation was denied. Please try again.' };
  }
  if (error === 'csrf') {
    return {
      type: 'error',
      text: 'Security validation failed. Please try connecting again.',
    };
  }
  if (error === 'token_exchange') {
    return {
      type: 'error',
      text: 'Failed to complete connection. Please try again.',
    };
  }
  if (error) {
    return { type: 'error', text: 'An error occurred. Please try again.' };
  }
  return null;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const connected = searchParams.get('connected');
  const error = searchParams.get('error');
  const message = resolveMessage(connected, error);

  const fetchStatus = useCallback(async () => {
    try {
      setFetchError(null);
      const res = await fetch('/api/auth/status');
      if (!res.ok) {
        throw new Error(`Failed to fetch connection status (${res.status})`);
      }
      const data: ConnectionStatus = await res.json();
      setConnectionStatus(data);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Failed to load connection status.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnectLinkedIn = () => {
    window.location.href = '/api/auth/linkedin';
  };

  const handleConnectTwitter = () => {
    window.location.href = '/api/auth/twitter';
  };

  const handleDisconnect = async (platform: Platform) => {
    try {
      const res = await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      if (!res.ok) {
        throw new Error(`Disconnect failed (${res.status})`);
      }
      // Refresh status after disconnect
      await fetchStatus();
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Failed to disconnect account.'
      );
    }
  };

  const handleDisconnectLinkedIn = () => handleDisconnect('linkedin');
  const handleDisconnectTwitter = () => handleDisconnect('twitter');

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Settings</h1>

      {/* OAuth redirect feedback */}
      {message && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 4,
            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Status fetch error */}
      {fetchError && (
        <div
          role="alert"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 4,
            background: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
          }}
        >
          {fetchError}
        </div>
      )}

      {isLoading ? (
        <p aria-live="polite">Loading connection status…</p>
      ) : (
        <SettingsPanel
          connectionStatus={connectionStatus}
          onConnectLinkedIn={handleConnectLinkedIn}
          onConnectTwitter={handleConnectTwitter}
          onDisconnectLinkedIn={handleDisconnectLinkedIn}
          onDisconnectTwitter={handleDisconnectTwitter}
        />
      )}
    </main>
  );
}
