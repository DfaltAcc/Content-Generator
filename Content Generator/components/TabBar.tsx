import type { ActiveTab } from '@/types';
import styles from './TabBar.module.css';

interface TabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const TABS: { value: ActiveTab; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image Prompt' },
  { value: 'email', label: 'Email' },
];

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className={styles.tabBar} role="tablist" aria-label="Content type">
      {TABS.map(({ value, label }) => (
        <button
          key={value}
          role="tab"
          aria-selected={activeTab === value}
          className={`${styles.tab} ${activeTab === value ? styles.tabActive : ''}`}
          onClick={() => onTabChange(value)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
