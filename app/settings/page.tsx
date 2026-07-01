/**
 * app/settings/page.tsx
 *
 * Settings page — wraps the client content in a <Suspense> boundary so that
 * useSearchParams() inside SettingsContent satisfies Next.js 15/16's requirement.
 *
 * Requirements: 1.1, 1.4, 1.5, 1.6, 2.1, 2.4, 2.5, 2.6, 8.1
 */

import { Suspense } from 'react';
import SettingsContent from './SettingsContent';

export default function SettingsPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Loading…</p>}>
      <SettingsContent />
    </Suspense>
  );
}
