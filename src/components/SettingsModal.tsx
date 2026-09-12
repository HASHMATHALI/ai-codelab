'use client';

import React, { useState } from 'react';
import styles from './SettingsModal.module.css';
import { AiSettings } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  currentSettings: AiSettings;
  onSave: (newSettings: AiSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  currentSettings,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<AiSettings>(currentSettings);
  const [prevSettings, setPrevSettings] = useState<AiSettings>(currentSettings);
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);

  if (currentSettings !== prevSettings) {
    setPrevSettings(currentSettings);
    setFormData(currentSettings);
  }

  React.useEffect(() => {
    if (isOpen) {
      fetch('/api/ai')
        .then((res) => res.json())
        .then((data) => {
          if (data?.hasServerKey) {
            setHasServerKey(true);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} id="settings-modal-overlay">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <span>⚙️</span>
            <span>AI CodeLab Configuration</span>
          </div>
          <button id="btn-close-settings" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.modeToggleBox}>
              <div className={styles.toggleRow}>
                <div>
                  <strong>Offline / Demo Showcase Mode</strong>
                  <div className={styles.helperText}>
                    Use built-in high-quality AI simulations without making live API calls.
                  </div>
                </div>
                <input
                  id="toggle-mock-mode"
                  type="checkbox"
                  checked={formData.useMock}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, useMock: e.target.checked }))
                  }
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="input-gemini-key">
                <span>Google Gemini API Key</span>
                <span className={styles.helperText}>
                  {formData.apiKey
                    ? '✓ Custom key active in session'
                    : hasServerKey
                    ? '✓ Gemini API key connected on server'
                    : 'Optional for offline mode'}
                </span>
              </label>
              <input
                id="input-gemini-key"
                type="password"
                className={styles.input}
                placeholder={hasServerKey ? '•••••••••••••••• (Server Key Connected)' : 'AIzaSy... / AQ.Ab8...'}
                value={formData.apiKey}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    apiKey: val,
                    useMock: val.trim().length > 0 ? false : prev.useMock,
                  }));
                }}
                disabled={formData.useMock}
              />
              <span className={styles.helperText}>
                {hasServerKey
                  ? 'Server environment has GEMINI_API_KEY configured. You can leave this blank to use the server key or enter a custom key.'
                  : 'Enter your Google Gemini API key to enable real-time debugging with Google AI Studio.'}
              </span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="select-gemini-model">
                AI Model Engine
              </label>
              <select
                id="select-gemini-model"
                className={styles.input}
                value={formData.model || 'gemini-3.6-flash'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    model: e.target.value as AiSettings['model'],
                  }))
                }
                disabled={formData.useMock}
              >
                <option value="gemini-3.6-flash">Gemini 3.6 Flash (Recommended: Ultra-fast & Analytical)</option>
                <option value="gemini-flash-latest">Gemini Flash Latest</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.label}>
                <span>Generation Temperature / Creativity: {formData.temperature}</span>
              </div>
              <div className={styles.sliderRow}>
                <span className={styles.helperText}>Precise (0.0)</span>
                <input
                  id="slider-temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  className={styles.rangeInput}
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      temperature: parseFloat(e.target.value),
                    }))
                  }
                />
                <span className={styles.helperText}>Creative (1.0)</span>
              </div>
            </div>

            <div className={styles.modeToggleBox}>
              <div className={styles.toggleRow}>
                <div>
                  <strong>Default Socratic Guidance</strong>
                  <div className={styles.helperText}>
                    Always prioritize pedagogical questions and hints over direct solutions.
                  </div>
                </div>
                <input
                  id="toggle-default-socratic"
                  type="checkbox"
                  checked={formData.socraticMode}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, socraticMode: e.target.checked }))
                  }
                />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              id="btn-cancel-settings"
              className={styles.btnCancel}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-settings"
              className={styles.btnSave}
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
