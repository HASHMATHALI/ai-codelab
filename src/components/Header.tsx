'use client';

import React from 'react';
import styles from './Header.module.css';
import { LabChallenge, AiSettings, BugExample } from '@/types';
import { UniversalSearchBar } from './UniversalSearchBar';

interface HeaderProps {
  activeChallenge: LabChallenge | null;
  settings: AiSettings;
  activeView: 'debug' | 'labs' | 'editor';
  onChangeView: (view: 'debug' | 'labs' | 'editor') => void;
  onOpenChallenges: () => void;
  onOpenSettings: () => void;
  onResetWorkspace: () => void;
  onSelectBug: (bug: BugExample) => void;
  onSelectLab: (lab: LabChallenge) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeChallenge,
  settings,
  activeView,
  onChangeView,
  onOpenChallenges,
  onOpenSettings,
  onResetWorkspace,
  onSelectBug,
  onSelectLab,
}) => {
  const isLive = Boolean(settings.apiKey && settings.apiKey.trim().length > 0 && !settings.useMock);

  return (
    <header className={styles.header} id="main-app-header">
      <div className={styles.brandGroup}>
        <div className={styles.logoIcon}>🐞</div>
        <div className={styles.brandText}>
          <div className={styles.brandTitle}>
            AI CodeLab
            <span className={styles.pblBadge}>Debug & Understand</span>
          </div>
          <span className={styles.brandSubtitle}>
            Understand why your code fails. Fix it. Learn from it.
          </span>
        </div>
      </div>

      <div className={styles.centerSearch}>
        <UniversalSearchBar onSelectBug={onSelectBug} onSelectLab={onSelectLab} />
      </div>

      <div className={styles.actionsGroup}>
        <button
          id="btn-nav-labs"
          className={`${styles.btnAction} ${activeChallenge || activeView === 'labs' ? styles.btnHighlight : ''}`}
          onClick={() => {
            onChangeView('labs');
            onOpenChallenges();
          }}
          title="Browse PBL Curriculum Labs"
        >
          📚 Labs {activeChallenge ? `(${activeChallenge.title.substring(0, 16)}...)` : ''}
        </button>

        <button
          id="btn-mode-indicator"
          className={`${styles.modeBadge} ${!isLive ? styles.mock : ''}`}
          onClick={onOpenSettings}
          title="Configure API settings or toggle offline mode"
        >
          <span className={styles.statusIndicator} />
          {isLive ? `Live: ${settings.model}` : 'Offline Demo Mode'}
        </button>

        <button
          id="btn-open-settings"
          className={styles.btnAction}
          onClick={onOpenSettings}
          title="Studio Settings"
        >
          ⚙️ Settings
        </button>

        <button
          id="btn-reset-workspace"
          className={styles.btnAction}
          onClick={onResetWorkspace}
          title="Reset workspace"
        >
          🔄 Reset
        </button>
      </div>
    </header>
  );
};
