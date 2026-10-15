'use client';

import type { ReactNode } from 'react';
import type { ColorProfile } from '@/lib/themes';
import { useAssistStore } from '@/lib/stores/assistStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import HoverTranslatedText from './HoverTranslatedText';
import styles from './TaskLayout.module.css';

interface QuestionCardProps {
  instruction: string;
  text?: string;
  profile: ColorProfile;
  children?: ReactNode;
}

export function QuestionCard({ instruction, text, profile, children }: QuestionCardProps) {
  const hydrated = useHydrated();
  const hoverEnabled = useAssistStore((s) => s.hoverTranslationEnabled);

  return (
    <section className={styles.questionCard} aria-label="Question">
      <h2 className={styles.instruction}>{instruction}</h2>
      {text && (
        <HoverTranslatedText
          text={text} profile={profile} textColor={profile.homeInk}
          fontSize="clamp(1.25rem, 2.3vw, 1.7rem)" textAlign="left"
          enabled={hydrated && hoverEnabled}
        />
      )}
      {children}
    </section>
  );
}

interface AnswerPanelProps {
  children: ReactNode;
  feedback: ReactNode;
  onClear: () => void;
  onCheck: () => void;
  clearDisabled: boolean;
  checkDisabled: boolean;
}

export function AnswerPanel({ children, feedback, onClear, onCheck, clearDisabled, checkDisabled }: AnswerPanelProps) {
  return (
    <section className={styles.answerCard} aria-label="Answer">
      {children}
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} onClick={onClear} disabled={clearDisabled}>
          <span aria-hidden="true">↻</span> Clear
        </button>
        <button type="button" className={styles.primaryButton} onClick={onCheck} disabled={checkDisabled}>
          <span aria-hidden="true">✓</span> Check Answer
        </button>
      </div>
      <div role="status" aria-live="polite">{feedback}</div>
    </section>
  );
}

export function SelectedWords({ tokens }: { tokens: string[] }) {
  return (
    <div className={styles.answerArea} aria-label="Your answer" aria-live="polite">
      {tokens.length === 0 ? (
        <p>Tap or click word blocks below to build your sentence.</p>
      ) : tokens.map((token, i) => <span className={styles.selectedWord} key={i}>{token}</span>)}
    </div>
  );
}

interface WordChoicesProps {
  options: string[];
  usedIndices?: number[];
  locked: boolean;
  onSelect: (index: number) => void;
}

export function WordChoices({ options, usedIndices = [], locked, onSelect }: WordChoicesProps) {
  return (
    <div className={styles.wordChoices} role="group" aria-label="Word blocks">
      {options.map((option, i) => (
        <button
          key={i} type="button" className={styles.wordButton}
          disabled={locked || usedIndices.includes(i)} onClick={() => onSelect(i)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
