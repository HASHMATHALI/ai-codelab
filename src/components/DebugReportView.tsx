'use client';

import React, { useState } from 'react';
import styles from './DebugReportView.module.css';
import { DebugReport } from '@/types';

interface DebugReportViewProps {
  report: DebugReport;
  onApplyFix: (fixedCode: string) => void;
  onClose?: () => void;
}

export const DebugReportView: React.FC<DebugReportViewProps> = ({
  report,
  onApplyFix,
}) => {
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'fix' | 'prevention' | 'tests'>('diagnosis');
  const [showWhyUncertain, setShowWhyUncertain] = useState(false);
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyTest = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // Fallback
    }
  };

  const getConfidenceLabel = (level: DebugReport['confidenceLevel']) => {
    switch (level) {
      case 'high':
        return 'High confidence';
      case 'medium':
        return 'Likely cause';
      case 'low':
        return 'Possible cause';
      case 'needs_info':
      default:
        return 'More information needed';
    }
  };

  return (
    <section className={styles.reportCard} id="debug-report-view">
      <div className={styles.reportHeader}>
        <div className={styles.statusRow}>
          <div className={styles.badgesGroup}>
            <span className={`${styles.confidenceBadge} ${styles[report.confidenceLevel]}`}>
              ● {getConfidenceLabel(report.confidenceLevel)}
            </span>
            <span className={styles.categoryBadge}>{report.category}</span>
            <span className={`${styles.severityBadge} ${styles[report.severity.toLowerCase()]}`}>
              {report.severity} Severity
            </span>
            {report.location?.line && (
              <span className={styles.categoryBadge}>
                📍 Line {report.location.line}
              </span>
            )}
          </div>
        </div>

        <h2 className={styles.title}>{report.title}</h2>
        <p className={styles.summary}>{report.summary}</p>

        {report.confidenceExplanation && (
          <div className={styles.confidenceExplanation}>
            <strong>Assessment:</strong> {report.confidenceExplanation}
          </div>
        )}

        {report.whyNotCertain && (
          <div>
            <button
              className={styles.whyUncertainToggle}
              onClick={() => setShowWhyUncertain(!showWhyUncertain)}
            >
              {showWhyUncertain ? '▼ Hide uncertainty reasons' : '► Why am I not 100% certain?'}
            </button>
            {showWhyUncertain && (
              <div className={styles.confidenceExplanation} style={{ marginTop: '0.4rem', borderLeftColor: '#f59e0b' }}>
                {report.whyNotCertain}
              </div>
            )}
          </div>
        )}
      </div>

      {report.securityConcerns && report.securityConcerns.length > 0 && (
        <div className={`${styles.alertBox} ${styles.security}`} id="alert-security-concern">
          <strong>🚨 Security Warning Detected:</strong>
          {report.securityConcerns.map((sec, i) => (
            <div key={i}>
              • <strong>{sec.risk}</strong> ({sec.severity} severity): {sec.remediation}
            </div>
          ))}
        </div>
      )}

      {report.behaviorChangeWarning && (
        <div className={`${styles.alertBox} ${styles.behavior}`} id="alert-behavior-change">
          <strong>⚠️ Behavior Change Notice:</strong>
          <span>{report.behaviorChangeWarning}</span>
        </div>
      )}

      <div className={styles.reportTabs} role="tablist">
        <button
          id="tab-report-diagnosis"
          className={`${styles.reportTab} ${activeTab === 'diagnosis' ? styles.active : ''}`}
          onClick={() => setActiveTab('diagnosis')}
        >
          🔍 Root Cause & Trace
        </button>
        <button
          id="tab-report-fix"
          className={`${styles.reportTab} ${activeTab === 'fix' ? styles.active : ''}`}
          onClick={() => setActiveTab('fix')}
        >
          🛠️ Proposed Fix & Diff
        </button>
        <button
          id="tab-report-prevention"
          className={`${styles.reportTab} ${activeTab === 'prevention' ? styles.active : ''}`}
          onClick={() => setActiveTab('prevention')}
        >
          🛡️ Prevent This Bug
        </button>
        <button
          id="tab-report-tests"
          className={`${styles.reportTab} ${activeTab === 'tests' ? styles.active : ''}`}
          onClick={() => setActiveTab('tests')}
        >
          🧪 Test Suite & Regression ({report.tests?.length || 0})
        </button>
      </div>

      <div className={styles.reportContent}>
        {activeTab === 'diagnosis' && (
          <>
            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <span>⚖️</span>
                <span>Three-Tier Diagnostic Analysis (Never Overclaim)</span>
              </div>
              <div className={styles.threeTierGrid}>
                <div className={`${styles.tierCard} ${styles.observed}`}>
                  <span className={styles.tierTitle}>👁️ Observed (Direct Facts)</span>
                  <ul className={styles.tierList}>
                    {report.observations.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className={`${styles.tierCard} ${styles.inferred}`}>
                  <span className={styles.tierTitle}>🧠 Inferred (Logical Deduction)</span>
                  <ul className={styles.tierList}>
                    {report.inferences.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className={`${styles.tierCard} ${styles.unknown}`}>
                  <span className={styles.tierTitle}>❓ Unknown (Missing Runtime Info)</span>
                  <ul className={styles.tierList}>
                    {report.unknowns.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {report.missingInformation && report.missingInformation.length > 0 && (
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeading}>
                  <span>📋</span>
                  <span>Missing Information that would confirm the Root Cause:</span>
                </div>
                <ul className={styles.changesList}>
                  {report.missingInformation.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <span>⏱️</span>
                <span>Why Did This Fail? (Step-by-Step Execution Path)</span>
              </div>
              <div className={styles.traceList}>
                {report.executionTrace.map((step, i) => (
                  <div key={i}>{step}</div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'fix' && (
          <>
            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <span>💡</span>
                <span>Why the Fix Works</span>
              </div>
              <p className={styles.summary}>{report.whyFixWorks}</p>
            </div>

            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <span>📝</span>
                <span>What Changed</span>
              </div>
              <ul className={styles.changesList}>
                {report.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>

            <div className={styles.diffContainer}>
              <div className={styles.diffToolbar}>
                <span>Corrected Code</span>
                <button
                  id="btn-apply-fix-to-editor"
                  className={styles.applyFixBtn}
                  onClick={() => onApplyFix(report.fixedCode)}
                >
                  ✓ Apply Fix to Editor
                </button>
              </div>
              <pre className={styles.diffBody}>{report.fixedCode}</pre>
            </div>
          </>
        )}

        {activeTab === 'prevention' && (
          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeading}>
              <span>🛡️</span>
              <span>How to Prevent This Bug Next Time (Lesson for Developers)</span>
            </div>
            <ul className={styles.preventionList}>
              {report.prevention.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeading}>
              <span>🧪</span>
              <span>Automated Test Cases & Regression Protection</span>
            </div>
            <p className={styles.summary}>
              Run these test cases to verify the fix and prevent the bug from regressing in the future.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              {report.tests.map((test, index) => (
                <div key={index} className={styles.testCard}>
                  <div className={styles.testCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span className={styles.testTypeBadge}>{test.type}</span>
                      <strong>{test.title}</strong>
                    </div>
                    <button
                      className={styles.feedbackBtn}
                      onClick={() => handleCopyTest(test.code, index)}
                    >
                      {copiedIndex === index ? '✓ Copied' : 'Copy Test'}
                    </button>
                  </div>
                  {test.explanation && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {test.explanation}
                    </div>
                  )}
                  <pre className={styles.testCodeBlock}>{test.code}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.reportFooter}>
        <div className={styles.feedbackWidget}>
          <span>Was this diagnosis helpful?</span>
          <button
            className={styles.feedbackBtn}
            onClick={() => setFeedback('helpful')}
            style={{ color: feedback === 'helpful' ? '#34d399' : undefined }}
          >
            👍 Helpful
          </button>
          <button
            className={styles.feedbackBtn}
            onClick={() => setFeedback('not_helpful')}
            style={{ color: feedback === 'not_helpful' ? '#fb7185' : undefined }}
          >
            👎 Not helpful
          </button>
          {feedback && <span style={{ color: '#c4b5fd' }}>Thank you for your feedback!</span>}
        </div>

        <span>
          ⚠️ AI-generated suggestions may be incorrect. Review and test code before using it in production.
        </span>
      </div>
    </section>
  );
};
