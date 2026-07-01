'use client';

import styles from './SettingsPanel.module.css';
import type { ConnectionStatus } from '../types';

export interface SettingsPanelProps {
  connectionStatus: ConnectionStatus;
  onConnectLinkedIn: () => void;
  onConnectTwitter: () => void;
  onDisconnectLinkedIn: () => void;
  onDisconnectTwitter: () => void;
}

export default function SettingsPanel({
  connectionStatus,
  onConnectLinkedIn,
  onConnectTwitter,
  onDisconnectLinkedIn,
  onDisconnectTwitter,
}: SettingsPanelProps) {
  const { linkedin, twitter } = connectionStatus;

  return (
    <section className={styles.panel} aria-label="Social media account connections">
      <h2 className={styles.heading}>Connected Accounts</h2>

      {/* LinkedIn section */}
      <div className={styles.platformSection}>
        <h3 className={styles.platformHeading}>LinkedIn</h3>
        {linkedin.connected ? (
          <>
            <p className={styles.statusMessage} role="status" aria-live="polite">
              {linkedin.accountIdentifier}
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.disconnectButton}
                onClick={onDisconnectLinkedIn}
                aria-label="Disconnect LinkedIn account"
              >
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.statusMessage} role="status" aria-live="polite">
              Not connected
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.connectButton}
                onClick={onConnectLinkedIn}
                aria-label="Connect LinkedIn account"
              >
                Connect LinkedIn
              </button>
            </div>
          </>
        )}
      </div>

      {/* Twitter/X section */}
      <div className={styles.platformSection}>
        <h3 className={styles.platformHeading}>Twitter / X</h3>
        {twitter.connected ? (
          <>
            <p className={styles.statusMessage} role="status" aria-live="polite">
              {twitter.accountIdentifier}
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.disconnectButton}
                onClick={onDisconnectTwitter}
                aria-label="Disconnect Twitter/X account"
              >
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.statusMessage} role="status" aria-live="polite">
              Not connected
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.connectButton}
                onClick={onConnectTwitter}
                aria-label="Connect Twitter/X account"
              >
                Connect Twitter/X
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
