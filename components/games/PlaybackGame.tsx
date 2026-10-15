'use client';

import { useState } from 'react';
import { useHydrated } from '@/lib/hooks/useHydrated';
import type { AssistLevel, PlaybackGameData } from '@/lib/types';
import { evaluateOrderedSelection, type OrderedSelectionResult } from '@/lib/normalize';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { useGameBase } from '@/lib/hooks/useGameBase';
import { useAudioPlayback } from '@/lib/hooks/useAudioPlayback';
import styles from './TaskLayout.module.css';
import AnswerFeedback from './AnswerFeedback';
import { AnswerPanel, QuestionCard, SelectedWords, WordChoices } from './TaskPanels';

interface PlaybackGameProps {
  question: PlaybackGameData;
  /** Language assist controls are rendered by the parent TaskLayout. */
  assistLevel: AssistLevel;
  /** Called once the question is solved. wasCorrect = clean correct (no prior wrong attempt). */
  onComplete: (wasCorrect: boolean) => void;
}

/**
 * Filenames known to be placeholder sound effects bundled with the Flutter
 * asset pack (a generic "level up" chime), not real narrated question audio.
 *
 * Confirmed by inspecting questions.json: 3 Playback questions —
 * playback.7, playback.8, playback.9 — reference webAudioLink
 * "/audio/level_up_3h.mp3", while every other Playback question either has
 * an empty webAudioLink or a distinct file. Cross-checked against the
 * Flutter source: MathMinigamesV2/assets/audio/level_up_3h.mp3 is a stock
 * "level up" chime asset, not present anywhere under this project's
 * /public — so even mechanically it isn't playable question audio here.
 * Treated as if webAudioLink were empty so these 3 fall through to the TTS
 * transcript, same as every other Playback question already does.
 */
const PLACEHOLDER_AUDIO_FILENAMES = new Set(['level_up_3h.mp3']);

function resolveAudioSrc(webAudioLink: string): string {
  const filename = webAudioLink.split('/').pop() ?? '';
  return PLACEHOLDER_AUDIO_FILENAMES.has(filename) ? '' : webAudioLink;
}

export default function PlaybackGame({ question, onComplete }: PlaybackGameProps) {
  // getMinSelection() = multiAcceptedAnswers[0].length — the max tokens selectable.
  const maxSelection = question.multiAcceptedAnswers[0]?.length ?? 0;

  const base = useGameBase(question.score);

  // Indices into optionList, in selection order — same scheme as JumbleGame.
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [result, setResult] = useState<OrderedSelectionResult | null>(null);

  const solved = result === 'correct';
  const locked = solved || result === "wrong";

  const audioSrc = resolveAudioSrc(question.webAudioLink);
  const { status: playbackStatus, mode: playbackMode, play, pause, stop } = useAudioPlayback(
    audioSrc,
    question.audioTranscript,
  );

  // Theme — guard hydration so SSR uses the default profile (matches other pages).
  const profile = useThemeStore(selectActiveProfile);
  const hydrated = useHydrated();
  const p = hydrated ? profile : themes[0];

  const selectedTokens = selectedIndices.map((i) => question.optionList[i]);

  function handleSelect(i: number) {
    if (locked) return;
    setSelectedIndices((prev) => {
      if (prev.includes(i)) return prev; // each button used once
      if (prev.length >= maxSelection) return prev; // cap at maxSelection
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

  const actionsDisabled = selectedIndices.length === 0 || locked;

  return (
    <>
      <QuestionCard instruction={question.writtenPrompt} profile={p}>
        <div className={styles.audioControls} data-playback-mode={playbackMode}>
          <button type="button" className={styles.secondaryButton} onClick={play} disabled={playbackStatus === 'playing'}>Hear Question</button>
          <button type="button" className={styles.secondaryButton} onClick={pause} disabled={playbackStatus !== 'playing'}>Pause</button>
          <button type="button" className={styles.secondaryButton} onClick={stop} disabled={playbackStatus !== 'playing' && playbackStatus !== 'paused'}>Stop</button>
        </div>
        <p className={styles.help} role="status">
          {playbackStatus === 'playing' ? 'Playing…' : playbackStatus === 'paused' ? 'Paused.' : playbackStatus === 'error' ? "Couldn't play the audio — try again." : 'Listen, then build your answer with the word blocks.'}
        </p>
      </QuestionCard>
      <AnswerPanel
        onClear={handleClear} onCheck={handleCheck} clearDisabled={actionsDisabled} checkDisabled={actionsDisabled}
        feedback={<AnswerFeedback outcome={result} wasCleanCorrect={!base.hadMistake} profile={p}
          wrongMessage="Try again — that order isn’t quite right." incompleteMessage="Please select more answers." />}
      >
        <SelectedWords tokens={selectedTokens} />
        <WordChoices options={question.optionList} usedIndices={selectedIndices} locked={locked} onSelect={handleSelect} />
      </AnswerPanel>
    </>
  );
}
