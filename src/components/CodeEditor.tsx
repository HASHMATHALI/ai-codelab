'use client';

import React, { useState, useRef } from 'react';
import styles from './CodeEditor.module.css';
import { SupportedLanguage } from '@/types';

interface CodeEditorProps {
  code: string;
  language: SupportedLanguage;
  onChangeCode: (code: string) => void;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  onRunCode: () => void;
  isRunning: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language,
  onChangeCode,
  onChangeLanguage,
  onRunCode,
  isRunning,
}) => {
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');
  const lineCount = lines.length;

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      onChangeCode(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRunCode();
    }
  };

  const updateCursorPosition = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
    const linesBefore = textBeforeCursor.split('\n');
    const currentLine = linesBefore.length;
    const currentCol = linesBefore[linesBefore.length - 1].length + 1;
    setCursorPos({ line: currentLine, col: currentCol });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const handleFormat = () => {
    // Basic automatic whitespace & line-trim formatting
    const formatted = lines.map(line => line.trimEnd()).join('\n');
    onChangeCode(formatted);
  };

  return (
    <div className={styles.editorContainer} id="editor-panel">
      <div className={styles.editorHeader}>
        <div className={styles.leftControls}>
          <select
            id="select-language"
            className={styles.langSelect}
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value as SupportedLanguage)}
          >
            <option value="javascript">JavaScript (Node/ES6)</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python 3</option>
            <option value="html">HTML5 / Web Canvas</option>
            <option value="sql">SQL Query</option>
            <option value="css">Vanilla CSS</option>
          </select>

          <span className={styles.filenameBadge}>
            📄 main.{language === 'python' ? 'py' : language === 'html' ? 'html' : language === 'sql' ? 'sql' : language === 'css' ? 'css' : language === 'typescript' ? 'ts' : 'js'}
          </span>
        </div>

        <div className={styles.rightControls}>
          <button
            id="btn-format-code"
            className={styles.toolBtn}
            onClick={handleFormat}
            title="Clean trailing whitespace"
          >
            🧹 Format
          </button>

          <button
            id="btn-copy-code"
            className={styles.toolBtn}
            onClick={handleCopy}
            title="Copy code to clipboard"
          >
            {copied ? '✅ Copied' : '📋 Copy'}
          </button>

          <button
            id="btn-run-code"
            className={styles.runBtn}
            onClick={onRunCode}
            disabled={isRunning}
            title="Execute Code (Ctrl + Enter)"
          >
            {isRunning ? '⏳ Running...' : '▶ Run Code'}
          </button>
        </div>
      </div>

      <div className={styles.editorBody}>
        <div className={styles.lineNumbers} ref={lineNumbersRef} aria-hidden="true">
          {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
            <div key={i} className={styles.lineNumber}>
              {i + 1}
            </div>
          ))}
        </div>

        <div className={styles.codeAreaWrapper}>
          <textarea
            id="code-editor-textarea"
            ref={textareaRef}
            className={styles.codeTextarea}
            value={code}
            onChange={(e) => {
              onChangeCode(e.target.value);
              updateCursorPosition();
            }}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onKeyUp={updateCursorPosition}
            onClick={updateCursorPosition}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="// Write or paste your code here, or choose a PBL Challenge..."
          />
        </div>
      </div>

      <div className={styles.editorFooter}>
        <div className={styles.footerMetaGroup}>
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>{lineCount} lines</span>
          <span>{code.length} chars</span>
        </div>
        <div className={styles.footerMetaGroup}>
          <span>UTF-8</span>
          <span>Spaces: 2</span>
          <span>{language.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};
