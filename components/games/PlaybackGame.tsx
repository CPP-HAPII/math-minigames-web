'use client';

import { useEffect, useState } from 'react';
import type { AssistLevel, PlaybackGameData } from '@/lib/types';
import { evaluateOrderedSelection, type OrderedSelectionResult } from '@/lib/normalize';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { useGameBase } from '@/lib/hooks/useGameBase';
import { useAudioPlayback } from '@/lib/hooks/useAudioPlayback';
import AnswerFeedback from './AnswerFeedback';
import TranslateButton from './TranslateButton';

interface PlaybackGameProps {
  question: PlaybackGameData;
  /** Current language-assist level. Wired into the assist UI in Stages 12–14. */
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

export default function PlaybackGame({ question, assistLevel, onComplete }: PlaybackGameProps) {
  // getMinSelection() = multiAcceptedAnswers[0].length — the max tokens selectable.
  const maxSelection = question.multiAcceptedAnswers[0]?.length ?? 0;

  const base = useGameBase(question.score);

  // Indices into optionList, in selection order — same scheme as JumbleGame.
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [result, setResult] = useState<OrderedSelectionResult | null>(null);

  const solved = result === 'correct';

  const audioSrc = resolveAudioSrc(question.webAudioLink);
  const { status: playbackStatus, mode: playbackMode, play, pause, stop } = useAudioPlayback(
    audioSrc,
    question.audioTranscript,
  );

  // Theme — guard hydration so SSR uses the default profile (matches other pages).
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  const selectedTokens = selectedIndices.map((i) => question.optionList[i]);

  function handleSelect(i: number) {
    if (solved) return;
    setSelectedIndices((prev) => {
      if (prev.includes(i)) return prev; // each button used once
      if (prev.length >= maxSelection) return prev; // cap at maxSelection
      return [...prev, i];
    });
    setResult(null); // clear stale feedback when the selection changes
  }

  function handleClear() {
    if (solved) return;
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
    }
    // 'incomplete' → just show the "select more answers" prompt.
  }

  // ── Styles (shared look with JumbleGame) ────────────────────────────────────
  const card: React.CSSProperties = {
    background: p.homeAccentGradient,
    borderRadius: '1rem',
    padding: '1.25rem 1.5rem',
    margin: '0.75rem auto',
    maxWidth: '760px',
    width: '100%',
  };

  const wordButton = (disabled: boolean): React.CSSProperties => ({
    background: disabled ? p.disabledButtonColor : p.cardBackground,
    color: p.cardTextColor,
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.6rem 1.1rem',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });

  const actionButton = (bg: string, disabled: boolean): React.CSSProperties => ({
    backgroundColor: bg,
    color: p.contrastTextColor,
    border: 'none',
    borderRadius: '0.6rem',
    padding: '0.65rem 1.4rem',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });

  const audioButton = (bg: string, disabled: boolean): React.CSSProperties => ({
    backgroundColor: disabled ? p.disabledButtonColor : bg,
    color: p.contrastTextColor,
    border: 'none',
    borderRadius: '0.6rem',
    padding: '0.55rem 1.2rem',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });

  const playbackStatusText = (() => {
    switch (playbackStatus) {
      case 'playing':
        return 'Playing…';
      case 'paused':
        return 'Paused';
      case 'error':
        return "Couldn't play the audio — try again.";
      default:
        return null;
    }
  })();

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <section
      style={{
        background: p.homePageBackground,
        color: p.textColor,
        padding: '1.5rem 1rem 3rem',
        minHeight: '100%',
      }}
    >
      {/* Written prompt — the instruction (Dart: titleQuestion). */}
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: p.contrastTextColor }}>
          {question.writtenPrompt}
        </p>
      </div>

      {/*
        Audio controls — the question is delivered by audio, not shown as text
        upfront (this is a listening-comprehension exercise). `question.audioTranscript`
        is intentionally never rendered as visible text here; it's only ever spoken.
        The language-assist UI (translation, hover glossary) wraps this in
        Stages 12–14; `assistLevel` will drive that wrapper.
      */}
      <div style={{ ...card, textAlign: 'center' }} data-assist-level={assistLevel} data-playback-mode={playbackMode}>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={play} disabled={playbackStatus === 'playing'} style={audioButton(p.checkAnswerButtonColor, playbackStatus === 'playing')}>
            ▶ Hear Question
          </button>
          <button onClick={pause} disabled={playbackStatus !== 'playing'} style={audioButton(p.buttonColor, playbackStatus !== 'playing')}>
            ❚❚ Pause
          </button>
          <button
            onClick={stop}
            disabled={playbackStatus !== 'playing' && playbackStatus !== 'paused'}
            style={audioButton(p.clearAnswerButtonColor, playbackStatus !== 'playing' && playbackStatus !== 'paused')}
          >
            ■ Stop
          </button>
        </div>
        {playbackStatusText && (
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.9rem', fontWeight: 700, color: p.contrastTextColor, opacity: 0.85 }}>{playbackStatusText}</p>
        )}
        {assistLevel !== 'advanced' && (
          <TranslateButton
            sourceText={question.audioTranscript}
            profile={p}
            autoTranslate={assistLevel === 'novice'}
          />
        )}
      </div>

      {/* Your answer — selected tokens in order. */}
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.75rem', color: p.contrastTextColor }}>
          Your answer
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', minHeight: '1.5rem' }}>
          {selectedTokens.map((token, i) => (
            <span key={i} style={{ fontSize: '1.15rem', fontWeight: 700, color: p.contrastTextColor }}>
              {token}
            </span>
          ))}
        </div>
      </div>

      {/* Word-button palette. */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.65rem',
          justifyContent: 'center',
          maxWidth: '760px',
          margin: '1rem auto',
        }}
      >
        {question.optionList.map((option, i) => {
          const disabled = solved || selectedIndices.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={disabled}
              style={wordButton(disabled)}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Actions. */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
        <button
          onClick={handleCheck}
          disabled={selectedIndices.length === 0 || solved}
          style={actionButton(p.checkAnswerButtonColor, selectedIndices.length === 0 || solved)}
        >
          Check Answer
        </button>
        <button
          onClick={handleClear}
          disabled={selectedIndices.length === 0 || solved}
          style={actionButton(p.clearAnswerButtonColor, selectedIndices.length === 0 || solved)}
        >
          Clear
        </button>
      </div>

      {/* Feedback. */}
      <AnswerFeedback
        outcome={result}
        wasCleanCorrect={!base.hadMistake}
        profile={p}
        wrongMessage="Try again — that order isn’t quite right."
        incompleteMessage="Please select more answers."
      />
    </section>
  );
}
