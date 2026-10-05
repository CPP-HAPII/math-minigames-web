'use client';

import { useEffect, useState } from 'react';
import type { AssistLevel, JumbleGameData } from '@/lib/types';
import { evaluateOrderedSelection, type OrderedSelectionResult } from '@/lib/normalize';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { useGameBase } from '@/lib/hooks/useGameBase';
import AnswerFeedback from './AnswerFeedback';
import TranslateButton from './TranslateButton';
import HoverTranslatedText from './HoverTranslatedText';
import SpeakQuestionButton from './SpeakQuestionButton';

interface JumbleGameProps {
  question: JumbleGameData;
  /** Current language-assist level. Wired into the assist UI in Stages 12–14. */
  assistLevel: AssistLevel;
  /** Called once the question is solved. wasCorrect = clean correct (no prior wrong attempt). */
  onComplete: (wasCorrect: boolean) => void;
}

/** Appends an alpha channel to a 6-digit hex color, e.g. withAlpha('#171A17', 0.25) -> '#171A1740'.
 * Only valid for solid '#RRGGBB' ColorProfile fields (textColor, cardTextColor, etc.) —
 * not for the gradient fields (homeAccentGradient, homeHeaderBackground). Used here for
 * borders/muted text where the profile has no dedicated "soft" field of its own. */
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

// ── Inline icons (no icon package) ──────────────────────────────────────────
// All use currentColor / stroke="currentColor" so they inherit whichever
// theme text color the surrounding element sets, instead of a fixed hex.
const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none' } as const;

function InfoIcon() {
  return (
    <svg {...iconProps} width={20} height={20} stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="12" y1="7.5" x2="12" y2="7.5" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg {...iconProps} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5c2.5-1 5-1 8 0v13c-3-1-5.5-1-8 0v-13Z" />
      <path d="M20 5.5c-2.5-1-5-1-8 0v13c3-1 5.5-1 8 0v-13Z" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg {...iconProps} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v13" />
      <path d="M6 13l6 6 6-6" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg {...iconProps} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11a8 8 0 1 0-2.3 5.6" />
      <path d="M20 5v6h-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg {...iconProps} width={18} height={18} fill="currentColor">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg {...iconProps} width={18} height={18} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg {...iconProps} width={14} height={14} fill="currentColor">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

export default function JumbleGame({ question, assistLevel, onComplete }: JumbleGameProps) {
  // getMinSelection() = multiAcceptedAnswers[0].length — the max tokens selectable.
  const maxSelection = question.multiAcceptedAnswers[0]?.length ?? 0;

  const base = useGameBase(question.score);

  // Indices into optionList, in selection order. Index-based (not value-based as
  // the Dart `contains` was) so each button is used once even with duplicate labels.
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [result, setResult] = useState<OrderedSelectionResult | null>(null);

  const solved = result === 'correct';
  const locked = solved || result === 'wrong';

  // Theme — guard hydration so SSR uses the default profile (matches other pages).
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  const selectedTokens = selectedIndices.map((i) => question.optionList[i]);
  const showAssist = assistLevel !== 'advanced';

  function handleSelect(i: number) {
    if (locked) return;
    setSelectedIndices((prev) => {
      if (prev.includes(i)) return prev; // each button used once
      if (prev.length >= maxSelection) return prev; // cap at maxSelection (Dart: currentCount < maxSelection)
      return [...prev, i];
    });
    setResult(null); // clear stale feedback when the selection changes
  }

  function handleClear() {
    if (locked) return;
    setSelectedIndices([]);
    setResult(null);
  }

  function handleCheck() {
    const outcome = evaluateOrderedSelection(
      selectedTokens,
      question.multiAcceptedAnswers,
      maxSelection,
    );
    setResult(outcome);

    if (outcome === 'correct') {
      // Ports `isCorrect = !madeMistake`: solving after a wrong attempt is not a clean correct.
      onComplete(base.wasCleanCorrect());
    } else if (outcome === 'wrong') {
      base.markMistake();
      onComplete(false);
    }
    // 'incomplete' → just show the "select more answers" prompt.
  }

  // ── Styles, mapped onto the active ColorProfile ─────────────────────────
  // Big surfaces (instruction banner, story problem, your answer) reuse
  // homeAccentGradient — the same field JumbleGame used pre-redesign, and the
  // same one other game types already rely on. Small surfaces (word blocks,
  // sidebar panels) reuse cardBackground/cardTextColor, per the split
  // documented in colorProfile.ts. Disabled states dim via opacity rather
  // than swapping text color, so background and text fade together and
  // contrast is preserved automatically on every theme — this also sidesteps
  // the invisible-disabled-text bug from the fixed mockup palette.
  const bigCard: React.CSSProperties = {
    background: p.homeAccentGradient,
    color: p.contrastTextColor,
    borderRadius: '0.75rem',
    padding: '1.25rem 1.5rem',
  };

  const smallCard: React.CSSProperties = {
    background: p.cardBackground,
    color: p.cardTextColor,
    borderRadius: '0.75rem',
    padding: '1.25rem',
  };

  const sectionLabel: React.CSSProperties = {
    textTransform: 'uppercase',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: withAlpha(p.textColor, 0.65),
    margin: '0 0 0.6rem',
  };

  const blockButton = (disabled: boolean): React.CSSProperties => ({
    background: disabled ? p.disabledButtonColor : p.cardBackground,
    color: p.cardTextColor,
    border: 'none',
    borderRadius: '0.6rem',
    padding: '0.6rem 1.1rem',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });

  const actionButton = (bg: string, disabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: bg,
    color: p.contrastTextColor,
    border: 'none',
    borderRadius: '0.6rem',
    padding: '0.7rem 1.3rem',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });

  const actionsDisabled = selectedIndices.length === 0 || locked;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <section style={{ background: p.backgroundColor, padding: '1.5rem 1rem 3rem', minHeight: '100%' }}>
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* ── Main column ─────────────────────────────────────────────── */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          {/* Instruction banner */}
          <div style={{ ...bigCard, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <InfoIcon />
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{question.writtenPrompt}</p>
          </div>

          {/* Story problem */}
          <div style={bigCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.7rem', opacity: 0.85 }}>
              <BookIcon />
              <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                Story Problem
              </span>
            </div>
            <div style={{ fontSize: '1.15rem', lineHeight: 1.5, fontWeight: 700 }}>
              <HoverTranslatedText text={question.displayedProblem} profile={p} textColor={p.contrastTextColor} />
            </div>
          </div>

          {/* Your answer */}
          <div
            style={{
              ...bigCard,
              border: `1px dashed ${withAlpha(p.contrastTextColor, 0.4)}`,
              textAlign: 'center',
            }}
          >
            <p style={{ ...sectionLabel, color: withAlpha(p.contrastTextColor, 0.75) }}>Your answer</p>
            {selectedTokens.length === 0 ? (
              <p style={{ opacity: 0.75, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <ArrowDownIcon /> Tap or drag word blocks here to build your sentence
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                {selectedTokens.map((token, i) => (
                  <span
                    key={i}
                    style={{ background: p.cardBackground, color: p.cardTextColor, fontWeight: 700, borderRadius: '0.5rem', padding: '0.4rem 0.9rem' }}
                  >
                    {token}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Available blocks */}
          <div>
            <p style={sectionLabel}>Available blocks</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {question.optionList.map((option, i) => {
                const disabled = locked || selectedIndices.includes(i);
                return (
                  <button key={i} onClick={() => handleSelect(i)} disabled={disabled} style={blockButton(disabled)}>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleClear} disabled={actionsDisabled} style={actionButton(p.clearAnswerButtonColor, actionsDisabled)}>
              <RefreshIcon /> Clear
            </button>
            <button onClick={handleCheck} disabled={actionsDisabled} style={actionButton(p.checkAnswerButtonColor, actionsDisabled)}>
              <CheckIcon /> Check Answer
            </button>
          </div>

          <AnswerFeedback
            outcome={result}
            wasCleanCorrect={!base.hadMistake}
            profile={p}
            wrongMessage="Not quite — here’s the next question."
            incompleteMessage="Please select more answers."
          />
        </main>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {showAssist && (
            <div style={smallCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.9rem' }}>
                <SparkleIcon />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Assist Tools</span>
              </div>
              {assistLevel === 'novice' && (
                <SpeakQuestionButton text={question.displayedProblem} profile={p} />
              )}
            </div>
          )}

          {showAssist && (
            <div style={smallCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <GlobeIcon />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Spanish Translation</span>
                </div>
                <PlayIcon />
              </div>
              <div style={{ background: p.headerColor, color: p.contrastTextColor, borderRadius: '0.6rem', padding: '0.9rem' }}>
                <TranslateButton
                  sourceText={question.displayedProblem}
                  profile={p}
                  autoTranslate={assistLevel === 'novice'}
                />
              </div>
            </div>
          )}

          <div style={smallCard}>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.9rem' }}>This Attempt</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.6rem', opacity: 0.85 }}>
              <span>Blocks Selected</span>
              <span style={{ fontWeight: 700, opacity: 1 }}>{selectedIndices.length} / {maxSelection}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', opacity: 0.85 }}>
              <span>Mistakes Made</span>
              <span style={{ fontWeight: 700, opacity: 1 }}>{base.hadMistake ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
