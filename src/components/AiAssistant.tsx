'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './AiAssistant.module.css';
import { AiActionType, ChatMessage, SupportedLanguage, AiSettings, LabChallenge } from '@/types';
import { executeAiAction } from '@/lib/gemini';

interface AiAssistantProps {
  currentCode: string;
  language: SupportedLanguage;
  settings: AiSettings;
  activeChallenge: LabChallenge | null;
  onApplyCode: (newCode: string) => void;
}

const INITIAL_TIMESTAMP = 1700000000000;

export const AiAssistant: React.FC<AiAssistantProps> = ({
  currentCode,
  language,
  settings,
  activeChallenge,
  onApplyCode,
}) => {
  const [actionTab, setActionTab] = useState<AiActionType>('socratic');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      timestamp: INITIAL_TIMESTAMP,
      actionType: 'socratic',
      content: `👋 **Welcome to AI CodeLab!**\n\nI'm your Generative AI pair programmer and PBL learning mentor. Select an action mode above or ask questions below:\n\n- 🧠 **Socratic Tutor**: Guides your problem-solving with pedagogical questions without spoiling code answers.\n- 🔍 **Bug Hunter**: Finds edge cases, logic flaws, and provides fixes.\n- 📖 **Code Explainer**: Line-by-line breakdown with Big-O complexity.\n- ⚡ **Code Generator**: Translates natural language into production-grade code.\n- 🧪 **Unit Tests**: Creates test suites to stress-test your solutions.`,
    },
  ]);

  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (overridePrompt?: string, overrideAction?: AiActionType) => {
    const promptToSend = overridePrompt !== undefined ? overridePrompt : inputPrompt;
    const actionToSend = overrideAction || actionTab;

    if (!promptToSend.trim() && actionToSend === 'generate') {
      return;
    }

    const challengeContext = activeChallenge ? `[Current PBL Lab: ${activeChallenge.title}] ` : '';

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptToSend || `Requesting [${actionToSend.toUpperCase()}] for ${challengeContext || 'current code'}.`,
      timestamp: Date.now(),
      actionType: actionToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await executeAiAction({
        actionType: actionToSend,
        prompt: activeChallenge ? `${challengeContext}${promptToSend}` : promptToSend,
        code: currentCode,
        language,
        apiKey: settings.apiKey,
        model: settings.model,
        temperature: settings.temperature,
        socraticMode: actionToSend === 'socratic' || settings.socraticMode,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        actionType: actionToSend,
        codeSnippet: response.codeSnippet,
        suggestedReplacement: response.suggestedReplacement,
        complexity: response.complexity,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Failed to communicate with AI model';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `❌ **Error**: ${errMessage}. Please verify your network or try offline demo mode in settings.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (newTab: AiActionType) => {
    setActionTab(newTab);
    // Set friendly initial placeholder prompt depending on tab
    if (newTab === 'fix') {
      setInputPrompt('Analyze current editor code for potential bugs, edge cases, and off-by-one errors.');
    } else if (newTab === 'explain') {
      setInputPrompt('Explain how this algorithm works and calculate its Big-O Time & Space complexity.');
    } else if (newTab === 'test') {
      setInputPrompt('Generate a comprehensive unit test suite covering typical and edge cases.');
    } else if (newTab === 'socratic') {
      setInputPrompt('Give me a guiding hint on how to structure the algorithm without spoiling the answer.');
    } else if (newTab === 'optimize') {
      setInputPrompt('How can I optimize memory allocation and execution speed for this code?');
    } else {
      setInputPrompt('');
    }
  };

  return (
    <aside className={styles.assistantContainer} id="ai-assistant-panel">
      <div className={styles.assistantHeader}>
        <div className={styles.headerTitle}>
          <span className={styles.headerSparkle}>✨</span>
          <span>GenAI Assistant & PBL Tutor</span>
        </div>
      </div>

      <div className={styles.tabBar} role="tablist">
        <button
          id="tab-socratic"
          className={`${styles.tabItem} ${actionTab === 'socratic' ? styles.active : ''}`}
          onClick={() => handleTabChange('socratic')}
          role="tab"
          aria-selected={actionTab === 'socratic'}
        >
          🧠 Socratic Tutor
        </button>
        <button
          id="tab-explain"
          className={`${styles.tabItem} ${actionTab === 'explain' ? styles.active : ''}`}
          onClick={() => handleTabChange('explain')}
          role="tab"
          aria-selected={actionTab === 'explain'}
        >
          📖 Explain
        </button>
        <button
          id="tab-fix"
          className={`${styles.tabItem} ${actionTab === 'fix' ? styles.active : ''}`}
          onClick={() => handleTabChange('fix')}
          role="tab"
          aria-selected={actionTab === 'fix'}
        >
          🔍 Fix Bugs
        </button>
        <button
          id="tab-generate"
          className={`${styles.tabItem} ${actionTab === 'generate' ? styles.active : ''}`}
          onClick={() => handleTabChange('generate')}
          role="tab"
          aria-selected={actionTab === 'generate'}
        >
          ⚡ Generate
        </button>
        <button
          id="tab-test"
          className={`${styles.tabItem} ${actionTab === 'test' ? styles.active : ''}`}
          onClick={() => handleTabChange('test')}
          role="tab"
          aria-selected={actionTab === 'test'}
        >
          🧪 Unit Tests
        </button>
        <button
          id="tab-optimize"
          className={`${styles.tabItem} ${actionTab === 'optimize' ? styles.active : ''}`}
          onClick={() => handleTabChange('optimize')}
          role="tab"
          aria-selected={actionTab === 'optimize'}
        >
          🚀 Optimize
        </button>
      </div>

      <div className={styles.chatFeed} ref={feedRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageBubble} ${
              msg.role === 'user' ? styles.user : styles.assistant
            }`}
          >
            <div className={styles.messageHeader}>
              <span>
                {msg.role === 'user' ? '👤 You' : '🤖 AI CodeLab Mentor'}
                {msg.actionType ? ` • [${msg.actionType.toUpperCase()}]` : ''}
              </span>
              <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div className={styles.messageBody}>{msg.content}</div>

            {msg.complexity && (
              <div className={styles.complexityCard}>
                <div className={styles.complexityBadges}>
                  <span className={styles.compBadge}>Time: {msg.complexity.time}</span>
                  <span className={styles.compBadge}>Space: {msg.complexity.space}</span>
                </div>
                <div className={styles.compExplanation}>{msg.complexity.explanation}</div>
              </div>
            )}

            {msg.codeSnippet && (
              <div className={styles.codeSnippetBlock}>
                <div className={styles.codeSnippetHeader}>
                  <span>Suggested Code</span>
                  <button
                    id={`btn-apply-${msg.id}`}
                    className={styles.applyCodeBtn}
                    onClick={() => onApplyCode(msg.codeSnippet!)}
                  >
                    ↙ Insert into Editor
                  </button>
                </div>
                <pre className={styles.codeSnippetContent}>{msg.codeSnippet}</pre>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className={`${styles.messageBubble} ${styles.assistant}`}>
            <div className={styles.messageHeader}>
              <span>🤖 AI CodeLab Mentor</span>
              <span>Thinking...</span>
            </div>
            <div className={styles.messageBody}>
              Analyzing algorithm and synthesizing response... ⚡
            </div>
          </div>
        )}
      </div>

      <div className={styles.quickChips}>
        <button
          id="chip-socratic-hint"
          className={styles.chipBtn}
          onClick={() => handleSend('Give me a pedagogical hint on the current problem statement.', 'socratic')}
        >
          💡 Progressive Hint
        </button>
        <button
          id="chip-find-bugs"
          className={styles.chipBtn}
          onClick={() => handleSend('What potential edge cases or bugs are in my code?', 'fix')}
        >
          🐞 Scan for Bugs
        </button>
        <button
          id="chip-complexity"
          className={styles.chipBtn}
          onClick={() => handleSend('What is the Big-O Time and Space complexity?', 'explain')}
        >
          📊 Big-O Complexity
        </button>
        <button
          id="chip-gen-tests"
          className={styles.chipBtn}
          onClick={() => handleSend('Write 3 automated tests for this code.', 'test')}
        >
          🧪 Generate Tests
        </button>
      </div>

      <div className={styles.inputContainer}>
        {actionTab === 'socratic' && (
          <div className={styles.socraticModeAlert}>
            <span>🎓 Socratic Mode active: AI will guide you with questions rather than immediate answers.</span>
          </div>
        )}

        <div className={styles.inputRow}>
          <textarea
            id="input-ai-prompt"
            className={styles.promptInput}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              actionTab === 'generate'
                ? 'Describe what function or component you want to build...'
                : 'Ask a question or enter guidance instructions...'
            }
          />

          <button
            id="btn-send-ai"
            className={styles.sendBtn}
            onClick={() => handleSend()}
            disabled={isLoading || (!inputPrompt.trim() && actionTab === 'generate')}
            title="Send to AI (Enter)"
          >
            ➤
          </button>
        </div>
      </div>
    </aside>
  );
};
