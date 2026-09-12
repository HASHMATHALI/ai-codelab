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

  if (currentSettings !== prevSettings) {
    setPrevSettings(currentSettings);
    setFormData(currentSettings);
  }

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
                    Use built-in high-quality AI simulations without needing an API key.
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
                  {formData.apiKey ? '✓ Key stored in local session' : 'Optional for offline mode'}
                </span>
              </label>
              <input
                id="input-gemini-key"
                type="password"
                className={styles.input}
                placeholder="AIzaSy..."
                value={formData.apiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, apiKey: e.target.value }))
                }
                disabled={formData.useMock}
              />
              <span className={styles.helperText}>
                Your key stays in your local browser storage and is only passed during live API requests.
              </span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="select-gemini-model">
                AI Model Engine
              </label>
              <select
                id="select-gemini-model"
                className={styles.input}
                value={formData.model}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    model: e.target.value as AiSettings['model'],
                  }))
                }
                disabled={formData.useMock}
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended: Ultra-fast)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
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
