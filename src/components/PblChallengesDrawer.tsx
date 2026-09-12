'use client';

import React, { useState } from 'react';
import styles from './PblChallengesDrawer.module.css';
import { LabChallenge } from '@/types';
import { LAB_CHALLENGES } from '@/data/challenges';

interface PblChallengesDrawerProps {
  isOpen: boolean;
  activeChallenge: LabChallenge | null;
  onClose: () => void;
  onSelectChallenge: (challenge: LabChallenge) => void;
}

export const PblChallengesDrawer: React.FC<PblChallengesDrawerProps> = ({
  isOpen,
  activeChallenge,
  onClose,
  onSelectChallenge,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedHints, setRevealedHints] = useState<{ [challengeId: string]: number }>({});

  if (!isOpen) return null;

  const categories = [
    'All',
    'GenAI Foundations',
    'Algorithms & Data Structures',
    'Fullstack Web',
    'Data Science & Prompt Engineering',
  ];

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const filteredChallenges = LAB_CHALLENGES.filter((item) => {
    // If user typed a search query, search comprehensively across all challenge content!
    const matchesSearch =
      !trimmedQuery ||
      item.title.toLowerCase().includes(trimmedQuery) ||
      item.description.toLowerCase().includes(trimmedQuery) ||
      item.category.toLowerCase().includes(trimmedQuery) ||
      item.language.toLowerCase().includes(trimmedQuery) ||
      item.difficulty.toLowerCase().includes(trimmedQuery) ||
      item.instructions.some((inst) => inst.toLowerCase().includes(trimmedQuery));

    const matchesCategory =
      trimmedQuery ? true : selectedCategory === 'All' || item.category === selectedCategory;

    return matchesCategory && matchesSearch;
  });

  const handleRevealNextHint = (challengeId: string, maxHints: number) => {
    setRevealedHints((prev) => {
      const current = prev[challengeId] || 0;
      return { ...prev, [challengeId]: Math.min(current + 1, maxHints) };
    });
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose} id="challenges-drawer-overlay">
      <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div className={styles.headerTitleGroup}>
            <span className={styles.headerIcon}>📚</span>
            <div>
              <h2 className={styles.title}>PBL Curriculum Labs</h2>
              <p className={styles.subtitle}>
                Project-Based Learning Challenges with Socratic Mentorship
              </p>
            </div>
          </div>
          <button id="btn-close-drawer" className={styles.closeBtn} onClick={onClose} title="Close drawer">
            ✕
          </button>
        </div>

        <div className={styles.filterBar}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              id="input-search-challenges"
              type="text"
              className={styles.searchInput}
              placeholder="Search challenges by keyword, topic, or language (e.g. RAG, Python, Cache)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                id="btn-clear-challenge-search"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.catChips}>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`${styles.catChip} ${selectedCategory === cat && !trimmedQuery ? styles.active : ''}`}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSearchQuery('');
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Showing {filteredChallenges.length} of {LAB_CHALLENGES.length} challenges</span>
            {trimmedQuery && (
              <span style={{ color: '#c4b5fd' }}>Matching &quot;{searchQuery}&quot;</span>
            )}
          </div>
        </div>

        <div className={styles.challengeList}>
          {filteredChallenges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</div>
              <p>No challenges found matching &quot;{searchQuery}&quot;.</p>
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.35rem 0.85rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredChallenges.map((challenge) => {
            const isSelected = activeChallenge?.id === challenge.id;
            const currentHintCount = revealedHints[challenge.id] || 0;

            return (
              <div
                key={challenge.id}
                className={`${styles.challengeCard} ${isSelected ? styles.selected : ''}`}
              >
                <div className={styles.cardTop}>
                  <div className={styles.badgeGroup}>
                    <span
                      className={`${styles.difficultyBadge} ${
                        styles[challenge.difficulty.toLowerCase()]
                      }`}
                    >
                      {challenge.difficulty}
                    </span>
                    <span className={styles.categoryBadge}>{challenge.category}</span>
                  </div>
                  <span className={styles.categoryBadge}>{challenge.language.toUpperCase()}</span>
                </div>

                <h3 className={styles.cardTitle}>{challenge.title}</h3>
                <p className={styles.cardDesc}>{challenge.description}</p>

                <div className={styles.cardInstructions}>
                  <strong>Specifications:</strong>
                  <ul>
                    {challenge.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                </div>

                <div className={styles.hintsSection}>
                  <button
                    className={styles.hintToggleBtn}
                    onClick={() => handleRevealNextHint(challenge.id, challenge.hints.length)}
                  >
                    💡 Socratic Hints ({currentHintCount}/{challenge.hints.length} Revealed)
                  </button>

                  {currentHintCount > 0 && (
                    <div className={styles.hintBox}>
                      {challenge.hints.slice(0, currentHintCount).map((hint, i) => (
                        <div key={i} className={styles.hintItem}>
                          <strong>Hint {i + 1}:</strong> {hint}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  id={`btn-load-challenge-${challenge.id}`}
                  className={styles.loadChallengeBtn}
                  onClick={() => {
                    onSelectChallenge(challenge);
                    onClose();
                  }}
                >
                  {isSelected ? '✓ Currently Loaded in Editor' : '🚀 Load Challenge into Workspace'}
                </button>
              </div>
            );
          }))}
        </div>
      </div>
    </div>
  );
};
