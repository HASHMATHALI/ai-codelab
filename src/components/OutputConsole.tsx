'use client';

import React, { useState } from 'react';
import styles from './OutputConsole.module.css';
import { ExecutionResult, SupportedLanguage } from '@/types';

/** Where the code actually ran, shown next to the result so nothing is passed off as real when it is not. */
const RUNTIME_LABEL: Partial<Record<SupportedLanguage, string>> = {
  python: 'CPython on WebAssembly',
  sql: 'SQLite',
  javascript: 'Web Worker',
  typescript: 'Web Worker',
};

interface OutputConsoleProps {
  result: ExecutionResult;
  language: SupportedLanguage;
  code: string;
  onClear: () => void;
}

export const OutputConsole: React.FC<OutputConsoleProps> = ({
  result,
  language,
  code,
  onClear,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'tests' | 'preview'>('console');

  const hasTests = Boolean(result.testResults && result.testResults.length > 0);
  const passedTestsCount = result.testResults?.filter(t => t.passed).length ?? 0;
  const totalTestsCount = result.testResults?.length ?? 0;
  const isHtml = language === 'html' || language === 'css';

  return (
    <div className={styles.consoleContainer} id="output-console-panel">
      <div className={styles.consoleHeader}>
        <div className={styles.tabGroup}>
          <button
            id="tab-console-output"
            className={`${styles.tabBtn} ${activeTab === 'console' ? styles.active : ''}`}
            onClick={() => setActiveTab('console')}
          >
            Terminal Logs
          </button>

          {hasTests && (
            <button
              id="tab-test-results"
              className={`${styles.tabBtn} ${activeTab === 'tests' ? styles.active : ''}`}
              onClick={() => setActiveTab('tests')}
            >
              Test Suite
              <span className={styles.badgeCount}>
                {passedTestsCount}/{totalTestsCount}
              </span>
            </button>
          )}

          {isHtml && (
            <button
              id="tab-web-preview"
              className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.active : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Web Preview
            </button>
          )}
        </div>

        <div className={styles.metaGroup}>
          {result.status === 'running' && (
            <span className={styles.executionBadge}>Running…</span>
          )}
          {(result.status === 'success' || result.status === 'error') && (
            <span
              className={`${styles.executionBadge} ${
                result.status === 'success' ? styles.success : styles.error
              }`}
              title={RUNTIME_LABEL[language] ?? undefined}
            >
              {result.status === 'success' ? '✓ Finished' : '✗ Failed'} ({result.executionTimeMs}ms)
              {result.isActualExecution && RUNTIME_LABEL[language] ? ` · ${RUNTIME_LABEL[language]}` : ''}
            </span>
          )}

          <button
            id="btn-clear-console"
            className={styles.clearBtn}
            onClick={onClear}
            title="Clear output logs"
          >
            Clear
          </button>
        </div>
      </div>

      <div className={styles.consoleBody}>
        {activeTab === 'console' && (
          <>
            {result.output ? (
              <pre className={styles.stdout}>{result.output}</pre>
            ) : !result.error ? (
              <div className={styles.emptyState}>
                Press &quot;▶ Run Code&quot; or Ctrl+Enter to execute and view stdout logs...
              </div>
            ) : null}

            {result.error && <pre className={styles.stderr}>{result.error}</pre>}
          </>
        )}

        {activeTab === 'tests' && hasTests && (
          <div className={styles.testList}>
            {result.testResults?.map((test, index) => (
              <div
                key={index}
                className={`${styles.testItem} ${test.passed ? styles.passed : styles.failed}`}
              >
                <div className={styles.testHeader}>
                  <span className={styles.testTitle}>{test.name}</span>
                  <span
                    className={`${styles.testStatus} ${
                      test.passed ? styles.pass : styles.fail
                    }`}
                  >
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                {!test.passed && (
                  <div className={styles.testDiff}>
                    {test.expected && <div><strong>Expected:</strong> {test.expected}</div>}
                    {test.actual && <div><strong>Received:</strong> {test.actual}</div>}
                    {test.error && <div><strong>Error:</strong> {test.error}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'preview' && (
          <iframe
            title="Interactive Web Canvas"
            className={styles.htmlPreviewIframe}
            sandbox="allow-scripts"
            srcDoc={
              language === 'html'
                ? code
                : `<style>${code}</style><h1>CSS Preview Canvas</h1><div class="box">Styled Box</div>`
            }
          />
        )}
      </div>
    </div>
  );
};
