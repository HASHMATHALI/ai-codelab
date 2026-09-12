'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './UniversalSearchBar.module.css';
import { BUG_EXAMPLES } from '@/data/examples';
import { LAB_CHALLENGES } from '@/data/challenges';
import { BugExample, LabChallenge } from '@/types';

interface UniversalSearchBarProps {
  onSelectBug: (bug: BugExample) => void;
  onSelectLab: (lab: LabChallenge) => void;
}

export const UniversalSearchBar: React.FC<UniversalSearchBarProps> = ({
  onSelectBug,
  onSelectLab,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmed = query.trim().toLowerCase();

  const matchedBugs = trimmed
    ? BUG_EXAMPLES.filter((b) =>
        b.title.toLowerCase().includes(trimmed) ||
        b.category.toLowerCase().includes(trimmed) ||
        b.language.toLowerCase().includes(trimmed) ||
        b.tagline.toLowerCase().includes(trimmed) ||
        (b.error && b.error.toLowerCase().includes(trimmed))
      )
    : [];

  const matchedLabs = trimmed
    ? LAB_CHALLENGES.filter((l) =>
        l.title.toLowerCase().includes(trimmed) ||
        l.category.toLowerCase().includes(trimmed) ||
        l.language.toLowerCase().includes(trimmed) ||
        l.description.toLowerCase().includes(trimmed)
      )
    : [];

  const hasResults = matchedBugs.length > 0 || matchedLabs.length > 0;

  return (
    <div className={styles.searchWrapper} ref={containerRef} id="universal-search-bar">
      <div className={styles.inputBox}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          id="global-search-input"
          type="text"
          className={styles.input}
          placeholder="Search errors (IndexError, Undefined), languages, or labs..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length > 0) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        />
        {query && (
          <button
            id="btn-clear-global-search"
            className={styles.clearBtn}
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && trimmed.length > 0 && (
        <div className={styles.dropdown} id="global-search-dropdown">
          {hasResults ? (
            <>
              {matchedBugs.length > 0 && (
                <div>
                  <div className={styles.groupHeading}>🐞 Bug Scenarios ({matchedBugs.length})</div>
                  {matchedBugs.map((bug) => (
                    <div
                      key={bug.id}
                      className={styles.resultItem}
                      onClick={() => {
                        onSelectBug(bug);
                        setIsOpen(false);
                        setQuery('');
                      }}
                    >
                      <div className={styles.itemTop}>
                        <span className={styles.itemTitle}>{bug.title}</span>
                        <span className={styles.itemTag}>{bug.language.toUpperCase()}</span>
                      </div>
                      <span className={styles.itemDesc}>{bug.tagline}</span>
                    </div>
                  ))}
                </div>
              )}

              {matchedLabs.length > 0 && (
                <div>
                  <div className={styles.groupHeading}>📚 Curriculum Labs ({matchedLabs.length})</div>
                  {matchedLabs.map((lab) => (
                    <div
                      key={lab.id}
                      className={styles.resultItem}
                      onClick={() => {
                        onSelectLab(lab);
                        setIsOpen(false);
                        setQuery('');
                      }}
                    >
                      <div className={styles.itemTop}>
                        <span className={styles.itemTitle}>{lab.title}</span>
                        <span className={styles.itemTag}>{lab.category}</span>
                      </div>
                      <span className={styles.itemDesc}>{lab.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.noResults}>
              No bugs or labs found matching &quot;{query}&quot;. Try searching &quot;IndexError&quot;, &quot;Python&quot;, or &quot;RAG&quot;.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
