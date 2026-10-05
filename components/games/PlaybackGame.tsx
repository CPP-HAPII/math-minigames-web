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

/** Appends an alpha channel to a 6-digit hex color — see JumbleGame.tsx for the same helper.
 * TODO: worth lifting to a shared lib/colorUtils.ts now that a second game type needs it. */
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

// ── Inline icons (no icon package) ──────────────────────────────────────────
// TODO: identical set (minus SpeakerIcon/WaveIcon/PlayCircleIcon/PauseIcon/StopIcon
// below) already exists in JumbleGame.tsx — worth extracting both files' icons to a
// shared components/games/icons.tsx once a third game type needs the same treatment.
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

function SpeakerIcon() {
  return (
    <svg {...iconProps} width={18} height={18} fill="currentColor">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg {...iconProps} width={22} height={18} stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="4" y1="7" x2="4" y2="17" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="14" y1="8" x2="14" y2="16" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  );
}

function PlayCircleIcon() {
  return (
    <svg {...iconProps} width={18} height={18} fill="currentColor">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg {...iconProps} width={16} height={16} fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg {...iconProps} width={14} height={14} fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="2" />
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

export default function PlaybackGame({ question, assistLevel, onComplete }: PlaybackGameProps) {
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
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  const selectedTokens = selectedIndices.map((i) => question.optionList[i]);
  const showAssist = assistLevel !== 'advanced';

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

  // ── Styles, mapped onto the active ColorProfile (same convention as JumbleGame) ──
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

  // Audio buttons are visually secondary to Check/Clear (this is a "listen
  // first" task) — outline style on the same surface, rather than three
  // more solid action-colored buttons competing with Check Answer below.
  const audioButton = (active: boolean, disabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: active ? p.cardBackground : 'transparent',
    color: active ? p.cardTextColor : p.contrastTextColor,
    border: `1px solid ${withAlpha(p.contrastTextColor, active ? 0 : 0.5)}`,
    borderRadius: '0.6rem',
    padding: disabled ? '0.65rem 1.3rem' : active ? '0.85rem 1.6rem' : '0.65rem 1.3rem',
    fontSize: active ? '1.05rem' : '0.95rem',
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
          {/* Instruction banner — the written prompt (Dart: titleQuestion). */}
          <div style={{ ...bigCard, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <InfoIcon />
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{question.writtenPrompt}</p>
          </div>

          {/*
            Listening task — the question is delivered by audio, not shown as text
            upfront. `question.audioTranscript` is intentionally never rendered as
            visible text here; it's only ever spoken or, when assist is on, shown
            translated in the sidebar.
          */}
          <div style={bigCard} data-assist-level={assistLevel} data-playback-mode={playbackMode}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', opacity: 0.85 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <SpeakerIcon />
                <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                  Listening Task
                </span>
              </div>
              <WaveIcon />
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={play} disabled={playbackStatus === 'playing'} style={audioButton(true, playbackStatus === 'playing')}>
                <PlayCircleIcon /> Hear Question
              </button>
              <button onClick={pause} disabled={playbackStatus !== 'playing'} style={audioButton(false, playbackStatus !== 'playing')}>
                <PauseIcon /> Pause
              </button>
              <button
                onClick={stop}
                disabled={playbackStatus !== 'playing' && playbackStatus !== 'paused'}
                style={audioButton(false, playbackStatus !== 'playing' && playbackStatus !== 'paused')}
              >
                <StopIcon /> Stop
              </button>
            </div>

            {playbackStatusText && (
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', opacity: 0.85 }}>
                {playbackStatusText}
              </p>
            )}

            {showAssist && (
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', textAlign: 'center', opacity: 0.8 }}>
                Need translation? See the Spanish assistant card on the right.
              </p>
            )}
          </div>

          {/* Your answer — selected tokens in order. */}
          <div style={{ ...bigCard, border: `1px dashed ${withAlpha(p.contrastTextColor, 0.4)}`, textAlign: 'center' }}>
            <p style={{ ...sectionLabel, color: withAlpha(p.contrastTextColor, 0.75) }}>Your answer</p>
            {selectedTokens.length === 0 ? (
              <p style={{ opacity: 0.75, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <ArrowDownIcon /> Tap or drag number words here to build your answer
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

          {/* Available blocks. */}
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

          {/* Actions. */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleClear} disabled={actionsDisabled} style={actionButton(p.clearAnswerButtonColor, actionsDisabled)}>
              <RefreshIcon /> Clear
            </button>
            <button onClick={handleCheck} disabled={actionsDisabled} style={actionButton(p.checkAnswerButtonColor, actionsDisabled)}>
              <CheckIcon /> Check Answer
            </button>
          </div>

          {/* Feedback. */}
          <AnswerFeedback
            outcome={result}
            wasCleanCorrect={!base.hadMistake}
            profile={p}
            wrongMessage="Try again — that order isn’t quite right."
            incompleteMessage="Please select more answers."
            correctAnswer={question.multiAcceptedAnswers.toString()}
          />
        </main>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  sourceText={question.audioTranscript}
                  profile={p}
                  autoTranslate={assistLevel === 'novice'}
                />
              </div>
            </div>
          )}

          <div style={smallCard}>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.9rem' }}>Current Progress Info</p>
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
