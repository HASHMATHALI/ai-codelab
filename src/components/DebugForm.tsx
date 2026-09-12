'use client';

import React, { useState } from 'react';
import styles from './DebugForm.module.css';
import { DebugInputs, BugExample } from '@/types';
import { BUG_EXAMPLES } from '@/data/examples';
import { scanAndMaskSecrets } from '@/lib/security';

interface DebugFormProps {
  inputs: DebugInputs;
  onChangeInputs: (inputs: DebugInputs) => void;
  onAnalyze: () => void;
  onExplainError: () => void;
  onSelectExample: (example: BugExample) => void;
  isAnalyzing: boolean;
  activeExampleId?: string;
  onReset: () => void;
}

export const DebugForm: React.FC<DebugFormProps> = ({
  inputs,
  onChangeInputs,
  onAnalyze,
  onExplainError,
  onSelectExample,
  isAnalyzing,
  activeExampleId,
}) => {
  const [showExtra, setShowExtra] = useState(Boolean(inputs.expectedOutput || inputs.actualOutput));
  const secretScan = scanAndMaskSecrets(inputs.code);

  const handleFieldChange = (field: keyof DebugInputs, value: string) => {
    onChangeInputs({
      ...inputs,
      [field]: value,
    });
  };

  return (
    <div className={styles.compactBar} id="debug-control-bar">
      <div className={styles.topRow}>
        <span className={styles.pillsLabel}>Bug Scenarios:</span>
        <div className={styles.pillsScroll}>
          {BUG_EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              id={`chip-example-${ex.id}`}
              className={`${styles.chip} ${activeExampleId === ex.id ? styles.active : ''}`}
              onClick={() => {
                onSelectExample(ex);
                if (ex.expectedOutput || ex.actualOutput) {
                  setShowExtra(true);
                }
              }}
              title={ex.tagline}
            >
              {ex.title}
            </button>
          ))}
        </div>
      </div>

      {secretScan.hasSecrets && (
        <div className={styles.secretBanner} id="banner-secret-detected">
          <span>⚠️</span>
          <span>
            <strong>Credential detected in code:</strong> Masked for safety before transmission.
          </span>
        </div>
      )}

      <div className={styles.inputRow}>
        <input
          id="input-error-msg"
          type="text"
          className={styles.errorInput}
          placeholder="Paste compiler/runtime error message (e.g. IndexError, TypeError, Segfault) or problem note..."
          value={inputs.error || ''}
          onChange={(e) => handleFieldChange('error', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onAnalyze();
            }
          }}
        />

        <button
          type="button"
          id="btn-toggle-extra"
          className={`${styles.toggleExtraBtn} ${showExtra ? styles.active : ''}`}
          onClick={() => setShowExtra(!showExtra)}
          title="Toggle Expected vs Actual output fields"
        >
          {showExtra ? '− Outputs' : '＋ Outputs'}
        </button>

        {inputs.error && (
          <button
            type="button"
            id="btn-explain-error"
            className={styles.explainBtn}
            onClick={onExplainError}
            disabled={isAnalyzing}
            title="Explain this error message"
          >
            📘 Explain
          </button>
        )}

        <button
          type="button"
          id="btn-debug-code"
          className={styles.debugBtn}
          onClick={onAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? '⏳ Diagnosing...' : '🔍 Debug Code'}
        </button>
      </div>

      {showExtra && (
        <div className={styles.extraDetailsRow}>
          <input
            id="input-expected-output"
            type="text"
            className={styles.extraInput}
            placeholder="Expected Output (e.g. 15)"
            value={inputs.expectedOutput || ''}
            onChange={(e) => handleFieldChange('expectedOutput', e.target.value)}
          />
          <input
            id="input-actual-output"
            type="text"
            className={styles.extraInput}
            placeholder="Actual Output (e.g. 10)"
            value={inputs.actualOutput || ''}
            onChange={(e) => handleFieldChange('actualOutput', e.target.value)}
          />
          <input
            id="input-user-description"
            type="text"
            className={styles.extraInput}
            placeholder="What happened? (e.g. crashes on empty array)"
            value={inputs.userDescription || ''}
            onChange={(e) => handleFieldChange('userDescription', e.target.value)}
          />
        </div>
      )}
    </div>
  );
};
