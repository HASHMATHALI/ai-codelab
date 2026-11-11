'use client';

import React, { useState } from 'react';
import styles from './page.module.css';
import { Header } from '@/components/Header';
import { CodeEditor } from '@/components/CodeEditor';
import { OutputConsole } from '@/components/OutputConsole';
import { AiAssistant } from '@/components/AiAssistant';
import { PblChallengesDrawer } from '@/components/PblChallengesDrawer';
import { SettingsModal } from '@/components/SettingsModal';
import { DebugForm } from '@/components/DebugForm';
import { DebugReportView } from '@/components/DebugReportView';
import { 
  LabChallenge, 
  SupportedLanguage, 
  ExecutionResult, 
  AiSettings, 
  DebugInputs, 
  DebugReport,
  BugExample 
} from '@/types';
import { BUG_EXAMPLES } from '@/data/examples';
import { executeCodeInBrowser } from '@/lib/executor';
import { executeAiAction } from '@/lib/gemini';

const DEFAULT_SETTINGS: AiSettings = {
  apiKey: '',
  model: 'gemini-3.6-flash',
  useMock: false,
  temperature: 0.2,
  socraticMode: false,
};

export default function StudioPage() {
  const initialExample = BUG_EXAMPLES[0]; // Python IndexError

  const [activeView, setActiveView] = useState<'debug' | 'labs' | 'editor'>('debug');
  const [rightTab, setRightTab] = useState<'report' | 'assistant' | 'tests'>('report');
  const [activeExampleId, setActiveExampleId] = useState<string>(initialExample.id);
  const [activeChallenge, setActiveChallenge] = useState<LabChallenge | null>(null);

  const [code, setCode] = useState<string>(initialExample.code);
  const [language, setLanguage] = useState<SupportedLanguage>(initialExample.language);

  const [debugInputs, setDebugInputs] = useState<DebugInputs>({
    code: initialExample.code,
    language: initialExample.language,
    error: initialExample.error,
    expectedOutput: initialExample.expectedOutput,
    actualOutput: initialExample.actualOutput,
    userDescription: initialExample.userDescription,
  });

  const [debugReport, setDebugReport] = useState<DebugReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult>({
    output: '',
    executionTimeMs: 0,
    status: 'idle',
  });

  const [isChallengesOpen, setIsChallengesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [settings, setSettings] = useState<AiSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ai_codelab_settings');
        if (saved) {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        }
      } catch {
        // Fallback
      }
    }
    return DEFAULT_SETTINGS;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSaveSettings = (newSettings: AiSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('ai_codelab_settings', JSON.stringify(newSettings));
    } catch {
      // Fallback
    }
  };

  const handleSelectExample = (example: BugExample) => {
    setActiveExampleId(example.id);
    setCode(example.code);
    setLanguage(example.language);
    setDebugInputs({
      code: example.code,
      language: example.language,
      error: example.error || '',
      expectedOutput: example.expectedOutput || '',
      actualOutput: example.actualOutput || '',
      userDescription: example.userDescription || '',
    });
    setDebugReport(null);
    setActiveChallenge(null);
    setRightTab('report');
    showToast(`Loaded: ${example.title}`);
  };

  const handleSelectLab = (challenge: LabChallenge) => {
    setActiveChallenge(challenge);
    setCode(challenge.starterCode);
    setLanguage(challenge.language);
    setDebugInputs({
      code: challenge.starterCode,
      language: challenge.language,
      userDescription: `PBL Challenge: ${challenge.title}. ${challenge.description}`,
    });
    setDebugReport(null);
    setActiveExampleId('');
    setExecutionResult({
      output: '',
      executionTimeMs: 0,
      status: 'idle',
    });
    setRightTab('assistant');
    showToast(`Loaded Lab: ${challenge.title}`);
  };

  const handleAnalyzeProblem = async () => {
    setIsAnalyzing(true);
    setRightTab('report');
    try {
      const response = await executeAiAction({
        actionType: 'debug',
        prompt: debugInputs.error || debugInputs.userDescription || 'Analyze code for failure',
        code,
        language,
        apiKey: settings.apiKey,
        model: settings.model,
        temperature: settings.temperature,
        debugInputs: {
          ...debugInputs,
          code,
          language,
        },
      });

      if (response.debugReport) {
        setDebugReport(response.debugReport);
        showToast('✓ Diagnosis report generated!');
      }
    } catch (err: unknown) {
      showToast('❌ Analysis error occurred');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExplainError = async () => {
    if (!debugInputs.error) return;
    setIsAnalyzing(true);
    setRightTab('report');
    try {
      const response = await executeAiAction({
        actionType: 'explain-error',
        prompt: debugInputs.error,
        code,
        language,
        apiKey: settings.apiKey,
        model: settings.model,
      });

      if (response.content) {
        setDebugReport({
          diagnosisStatus: 'confirmed',
          confidenceLevel: 'high',
          confidenceExplanation: 'Targeted error message explanation',
          category: 'Runtime Error',
          severity: 'High',
          title: `Error Explanation: ${debugInputs.error.split('\n')[0]}`,
          summary: response.content,
          observations: [`Reported error: ${debugInputs.error.split('\n')[0]}`],
          inferences: ['Operation violated runtime preconditions'],
          unknowns: ['Runtime variable values at time of failure'],
          executionTrace: [
            '1. Program executed up to the failing line.',
            '2. The statement encountered an invalid memory reference or condition.',
            '3. Runtime engine threw the reported error.'
          ],
          likelyCauses: [{ cause: 'Invalid Operation', probability: 'Confirmed', explanation: debugInputs.error.split('\n')[0] }],
          fixedCode: code,
          diff: { original: code, fixed: code },
          changes: ['Review the error explanation to apply the recommended guard.'],
          whyFixWorks: 'Defensive checks prevent unhandled runtime exceptions.',
          prevention: ['Use defensive programming and null checks before accessing properties or elements.'],
          tests: [],
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyFix = (fixedCode: string) => {
    setCode(fixedCode);
    setDebugInputs((prev) => ({ ...prev, code: fixedCode }));
    showToast('✓ Corrected code applied to editor!');
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setExecutionResult((prev) => ({ ...prev, status: 'running' }));
    try {
      const result = await executeCodeInBrowser(code, language, activeChallenge, (message) =>
        setExecutionResult((prev) => ({ ...prev, output: message, status: 'running' }))
      );
      setExecutionResult(result);
      // Evidence hand-off: a real failure becomes the debugger's input, so the AI
      // diagnoses what actually happened instead of what someone typed by hand.
      if (result.isActualExecution && result.status === 'error') {
        const failedTests = (result.testResults ?? []).filter((t) => !t.passed);
        const observed =
          result.error ||
          failedTests
            .map((t) => `Test "${t.name}" failed: expected ${t.expected}, got ${t.actual ?? t.error}`)
            .join('\n');
        if (observed) {
          setDebugInputs((prev) => ({ ...prev, code, language, error: observed, actualOutput: result.output || prev.actualOutput }));
          showToast('Captured the real error for Debug Code');
        }
      }
    } catch (err: unknown) {
      setExecutionResult({
        output: '',
        error: err instanceof Error ? err.message : String(err),
        executionTimeMs: 0,
        status: 'error',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetWorkspace = () => {
    setCode(initialExample.code);
    setLanguage(initialExample.language);
    setDebugInputs({
      code: initialExample.code,
      language: initialExample.language,
      error: initialExample.error,
      expectedOutput: initialExample.expectedOutput,
      actualOutput: initialExample.actualOutput,
      userDescription: initialExample.userDescription,
    });
    setDebugReport(null);
    setActiveExampleId(initialExample.id);
    setActiveChallenge(null);
    setExecutionResult({ output: '', executionTimeMs: 0, status: 'idle' });
    showToast('Workspace reset');
  };

  return (
    <div className={styles.studioContainer} id="ai-codelab-studio">
      <Header
        activeChallenge={activeChallenge}
        settings={settings}
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenChallenges={() => setIsChallengesOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetWorkspace={handleResetWorkspace}
        onSelectBug={handleSelectExample}
        onSelectLab={handleSelectLab}
      />

      <main className={styles.studioMain}>
        {/* Left Column: Code Editor & Problem Inputs */}
        <div className={styles.leftColumn}>
          <div className={styles.debugFormWrapper}>
            <DebugForm
              inputs={debugInputs}
              onChangeInputs={setDebugInputs}
              onAnalyze={handleAnalyzeProblem}
              onExplainError={handleExplainError}
              onSelectExample={handleSelectExample}
              isAnalyzing={isAnalyzing}
              activeExampleId={activeExampleId}
              onReset={() => {
                setDebugInputs({ code, language });
                setDebugReport(null);
              }}
            />
          </div>

          <div className={styles.editorWrapper}>
            <CodeEditor
              code={code}
              language={language}
              onChangeCode={(newCode) => {
                setCode(newCode);
                setDebugInputs((prev) => ({ ...prev, code: newCode }));
              }}
              onChangeLanguage={(newLang) => {
                setLanguage(newLang);
                setDebugInputs((prev) => ({ ...prev, language: newLang }));
              }}
              onRunCode={handleRunCode}
              isRunning={isRunning}
            />
          </div>

          <div className={styles.consoleWrapper}>
            <OutputConsole
              result={executionResult}
              language={language}
              code={code}
              onClear={() => setExecutionResult({ output: '', executionTimeMs: 0, status: 'idle' })}
            />
          </div>
        </div>

        {/* Right Column: AI Diagnosis, Explanations & Mentor */}
        <div className={styles.rightColumn}>
          <div className={styles.rightHeader}>
            <div className={styles.rightTabs} role="tablist">
              <button
                id="tab-view-report"
                className={`${styles.rightTab} ${rightTab === 'report' ? styles.active : ''}`}
                onClick={() => setRightTab('report')}
                role="tab"
              >
                <span>🐞 Diagnosis & Fix</span>
                {debugReport && <span className={styles.rightTabBadge}>✓ Ready</span>}
              </button>

              <button
                id="tab-view-assistant"
                className={`${styles.rightTab} ${rightTab === 'assistant' ? styles.active : ''}`}
                onClick={() => setRightTab('assistant')}
                role="tab"
              >
                <span>💬 AI Mentor & Socratic</span>
              </button>

              {debugReport && debugReport.tests && debugReport.tests.length > 0 && (
                <button
                  id="tab-view-tests"
                  className={`${styles.rightTab} ${rightTab === 'tests' ? styles.active : ''}`}
                  onClick={() => setRightTab('tests')}
                  role="tab"
                >
                  <span>🧪 Test Suite ({debugReport.tests.length})</span>
                </button>
              )}
            </div>
          </div>

          <div className={styles.rightContent}>
            {rightTab === 'report' && (
              <>
                {debugReport ? (
                  <DebugReportView
                    report={debugReport}
                    onApplyFix={handleApplyFix}
                  />
                ) : (
                  <div className={styles.emptyReportCard}>
                    <div className={styles.emptyIcon}>🔍</div>
                    <h2 className={styles.emptyTitle}>Ready to Debug Your Code</h2>
                    <p className={styles.emptyDesc}>
                      Click <strong>&quot;🔍 Debug Code&quot;</strong> on the left to analyze the root cause, get an execution path trace, view the fix diff, and prevent future regressions.
                    </p>

                    <div className={styles.stepsGuide}>
                      <div className={styles.stepItem}>
                        <span className={styles.stepNum}>1</span>
                        <span>Paste code or select a preset scenario above</span>
                      </div>
                      <div className={styles.stepItem}>
                        <span className={styles.stepNum}>2</span>
                        <span>Click &quot;🔍 Debug Code&quot; or &quot;📘 Explain&quot;</span>
                      </div>
                      <div className={styles.stepItem}>
                        <span className={styles.stepNum}>3</span>
                        <span>Review the root cause, execution trace, and 1-click fix</span>
                      </div>
                    </div>

                    <button
                      id="btn-empty-start-debug"
                      className={styles.startDebugBtn}
                      onClick={handleAnalyzeProblem}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? '⏳ Analyzing Problem...' : '🔍 Analyze Current Code'}
                    </button>
                  </div>
                )}
              </>
            )}

            {rightTab === 'assistant' && (
              <AiAssistant
                currentCode={code}
                language={language}
                settings={settings}
                activeChallenge={activeChallenge}
                onApplyCode={(newCode) => {
                  setCode(newCode);
                  setDebugInputs((prev) => ({ ...prev, code: newCode }));
                  showToast('✓ Code inserted into editor');
                }}
              />
            )}

            {rightTab === 'tests' && debugReport && (
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Automated Regression Test Suite
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  These tests ensure the diagnosed bug cannot return during future changes.
                </p>
                {debugReport.tests.map((test, index) => (
                  <div
                    key={index}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#c4b5fd' }}>
                        {test.type}
                      </span>
                      <strong style={{ fontSize: '0.78rem' }}>{test.title}</strong>
                    </div>
                    {test.explanation && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {test.explanation}
                      </div>
                    )}
                    <pre
                      style={{
                        background: '#080c14',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.76rem',
                        overflowX: 'auto',
                        color: '#f1f5f9',
                      }}
                    >
                      {test.code}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <PblChallengesDrawer
        isOpen={isChallengesOpen}
        activeChallenge={activeChallenge}
        onClose={() => setIsChallengesOpen(false)}
        onSelectChallenge={handleSelectLab}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        currentSettings={settings}
        onSave={handleSaveSettings}
        onClose={() => setIsSettingsOpen(false)}
      />

      {toastMessage && (
        <div className={styles.toastNotice} role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
