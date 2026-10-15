'use client';

import { useState } from 'react';
import { useHydrated } from '@/lib/hooks/useHydrated';
import type { AssistLevel, ReadAloudGameData } from '@/lib/types';
import { normalizeComparisonString } from '@/lib/normalize';
import { convertNumbersAndSymbolsToWords } from '@/lib/numberToWords';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { useGameBase } from '@/lib/hooks/useGameBase';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import styles from './TaskLayout.module.css';
import AnswerFeedback from './AnswerFeedback';
import { AnswerPanel, QuestionCard } from './TaskPanels';

interface ReadAloudGameProps {
  question: ReadAloudGameData;
  /** Language assist controls are rendered by the parent TaskLayout. */
  assistLevel: AssistLevel;
  /** Called once the question is solved. wasCorrect = clean correct (no prior wrong attempt). */
  onComplete: (wasCorrect: boolean) => void;
}

/** The two validation outcomes. Read Aloud has no "incomplete" state — there's nothing to select, only speak. */
type CheckResult = 'wrong' | 'correct';

const DEFAULT_TRANSCRIPT_PLACEHOLDER = 'Press the button to start speaking and your words will appear here!';

/**
 * Validate the spoken transcript against nested accepted answers.
 * Ported from AudioTranscriptionWidgetState.validateAnswer() in reading.dart,
 * with one deliberate change: Dart only lowercases + collapses whitespace
 * before comparing. Speech-to-text transcripts vary in punctuation/casing
 * even more than typed input does, so this uses the same
 * normalizeComparisonString() TypingGame/FillBlanksGame already rely on
 * (also strips punctuation and the standalone word "and") rather than the
 * weaker Dart comparison.
 */
function evaluateTranscript(transcript: string, answers: string[][]): CheckResult {
  const norm = normalizeComparisonString(transcript);
  return answers.some((answer) => normalizeComparisonString(answer.join(' ')) === norm) ? 'correct' : 'wrong';
}

export default function ReadAloudGame({ question, onComplete }: ReadAloudGameProps) {
  const base = useGameBase(question.score);
  const speech = useSpeechRecognition();

  const [result, setResult] = useState<CheckResult | null>(null);
  const solved = result === 'correct';
  const locked = solved || result === 'wrong';

  // The transcript actually compared against multiAcceptedAnswers: STT engines
  // commonly transcribe spoken numbers as digits ("476"), so when
  // useNumWordProtocol is set (the default for every seeded question), the
  // digits get converted back to their written-word form ("four hundred
  // seventy six") to match the word-form accepted-answer variants.
  const processedTranscript = question.useNumWordProtocol
    ? convertNumbersAndSymbolsToWords(speech.transcript)
    : speech.transcript;

  // Theme — guard hydration so SSR uses the default profile (matches other pages).
  const profile = useThemeStore(selectActiveProfile);
  const hydrated = useHydrated();
  const p = hydrated ? profile : themes[0];

  function handleToggleListening() {
    if (locked || !speech.supported) return;
    if (speech.status === 'listening') {
      speech.stop();
    } else {
      speech.start();
    }
    setResult(null); // clear stale feedback once the player starts over
  }

  function handleClear() {
    if (locked) return;
    speech.reset();
    setResult(null);
  }

  function handleCheck() {
    const outcome = evaluateTranscript(processedTranscript, question.multiAcceptedAnswers);
    setResult(outcome);

    if (outcome === 'correct') {
      // Ports `isCorrect = !madeMistake`: solving after a wrong attempt is not a clean correct.
      onComplete(base.wasCleanCorrect());
    } else {
      base.markMistake();
      onComplete(false);
    }
  }

  const micStatusText = speech.status === 'listening' ? 'Listening…' : speech.status === 'error' ? speech.error : null;
  const checkDisabled = processedTranscript.trim().length === 0 || locked || !speech.supported;

  return (
    <>
      <QuestionCard instruction={question.writtenPrompt} text={question.displayedProblem} profile={p}>
        {question.additionalInstructions && <p className={styles.help}>{question.additionalInstructions}</p>}
      </QuestionCard>
      <AnswerPanel
        onClear={handleClear} onCheck={handleCheck} clearDisabled={speech.transcript.length === 0 || locked} checkDisabled={checkDisabled}
        feedback={<AnswerFeedback outcome={result} wasCleanCorrect={!base.hadMistake} profile={p} wrongMessage="Try again — that isn’t quite right." />}
      >
        <div className={styles.speechAnswer}>
          {speech.supported ? (
            <div>
              <button type="button" className={styles.secondaryButton} onClick={handleToggleListening} disabled={locked}>
                {speech.status === 'listening' ? 'Stop Listening' : 'Start Speaking'}
              </button>
              {micStatusText && <p className={styles.help} role="status">{micStatusText}</p>}
            </div>
          ) : <p className={styles.help}>Speech recognition is not supported in this browser. Try using Chrome.</p>}
          <div className={styles.answerArea} aria-label="Your spoken answer" aria-live="polite">
            <p>{processedTranscript || DEFAULT_TRANSCRIPT_PLACEHOLDER}</p>
          </div>
        </div>
      </AnswerPanel>
    </>
  );
}
