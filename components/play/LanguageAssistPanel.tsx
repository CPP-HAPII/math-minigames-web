'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { AssistLevel } from '@/lib/types';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useSpeak } from '@/lib/hooks/useSpeak';
import { useWordTranslationStore } from '@/lib/stores/wordTranslationStore';
import { usePlayTokens, type PlayTokens } from '@/lib/usePlayTokens';
import AssistPanelFrame from '@/components/play/AssistPanelFrame';
import AssistIcon from '@/components/play/AssistIcons';
import { ChevronIcon, GlobeIcon } from '@/components/play/icons';

interface LanguageAssistPanelProps {
  /** The text to translate and read aloud: displayedProblem, or audioTranscript for Playback. */
  sourceText: string;
  assistLevel: AssistLevel;
  /** False for Playback, where "Speak question" would just repeat its own Hear Question button. */
  canSpeakQuestion: boolean;
  /** False for Playback: the question is heard, not shown, so there are no words to hover over. */
  canTranslateWords: boolean;
}

/**
 * Right-hand "Language Assist" panel. What it offers follows the level chosen
 * in Settings:
 *   novice        translates automatically, can read the question and the translation aloud
 *   intermediate  translates when asked, can read the translation aloud
 *   advanced      no translation panel, just the word-translation switch
 * Word translation (hover a word in the question) is a switch at every level.
 * Mount it with a key per question so the translation resets for each one.
 */
export default function LanguageAssistPanel({
  sourceText,
  assistLevel,
  canSpeakQuestion,
  canTranslateWords,
}: LanguageAssistPanelProps) {
  const t = usePlayTokens();
  const wordTranslation = useWordTranslationStore((s) => s.enabled);
  const setWordTranslation = useWordTranslationStore((s) => s.setEnabled);

  // An empty source would make the translate request fail validation, so there is nothing to offer.
  const hasText = sourceText.trim().length > 0;

  return (
    <AssistPanelFrame title="Language Assist" icon={<GlobeIcon size={24} />}>
      {assistLevel !== 'advanced' && hasText && (
        <TranslateSection
          sourceText={sourceText}
          auto={assistLevel === 'novice'}
          canSpeakQuestion={assistLevel === 'novice' && canSpeakQuestion}
          t={t}
        />
      )}

      {canTranslateWords && (
        <WordTranslationRow checked={wordTranslation} onChange={setWordTranslation} t={t} />
      )}
    </AssistPanelFrame>
  );
}

function TranslateSection({
  sourceText,
  auto,
  canSpeakQuestion,
  t,
}: {
  sourceText: string;
  auto: boolean;
  canSpeakQuestion: boolean;
  t: PlayTokens;
}) {
  const { status, translated, translate, speakTranslation } = useTranslation(sourceText, 'es', auto);
  const speak = useSpeak();
  const [open, setOpen] = useState(auto);

  const hasTranslation = status === 'shown' && Boolean(translated);

  function handleToggle() {
    if (status === 'loading') return;
    if (status === 'idle' || status === 'error') {
      translate();
      setOpen(true);
      return;
    }
    setOpen((o) => !o);
  }

  return (
    <>
      <AssistRow
        icon={<AssistIcon kind="translate" />}
        label={status === 'loading' ? 'Translating…' : 'Translate question'}
        onClick={handleToggle}
        trailing={<ChevronIcon up={open && status !== 'idle'} size={22} />}
        expanded={open && status !== 'idle'}
        t={t}
      />

      {open && status === 'loading' && !hasTranslation && (
        <p style={{ margin: 0, padding: '0 6px', color: t.assist.ink, opacity: 0.7 }}>Translating…</p>
      )}

      {open && hasTranslation && (
        <p
          data-testid="translated-question"
          style={{
            margin: 0,
            padding: '14px 16px',
            borderRadius: 14,
            background: t.assist.translatedBg,
            color: t.assist.ink,
            fontSize: '1.1rem',
            lineHeight: 1.45,
            fontWeight: 500,
          }}
        >
          {translated}
        </p>
      )}

      {status === 'error' && (
        <p role="alert" style={{ margin: 0, padding: '0 6px', color: t.danger, fontSize: '0.95rem', fontWeight: 600 }}>
          Translation failed — tap &ldquo;Translate question&rdquo; to try again.
        </p>
      )}

      {canSpeakQuestion && (
        <AssistRow icon={<AssistIcon kind="speak" />} label="Speak question" onClick={() => speak(sourceText, 'en-US')} t={t} />
      )}

      {hasTranslation && <AssistRow icon={<AssistIcon kind="speakTranslated" />} label="Speak translated question" onClick={speakTranslation} t={t} />}
    </>
  );
}

/** The button-box look shared by every row in the panel. */
function rowBoxStyle(t: PlayTokens): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 56,
    padding: '8px 14px',
    borderRadius: 14,
    border: `1px solid ${t.assist.rowBorder}`,
    background: t.assist.rowBg,
    color: t.assist.ink,
    fontFamily: t.bodyFont,
    fontSize: '1.1rem',
    fontWeight: 500,
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: `0 1px 4px ${t.assist.shadow}`,
  };
}

function AssistRow({
  icon,
  label,
  onClick,
  trailing,
  expanded,
  t,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  trailing?: ReactNode;
  expanded?: boolean;
  t: PlayTokens;
}) {
  return (
    <button type="button" onClick={onClick} aria-expanded={expanded} style={rowBoxStyle(t)}>
      <span style={{ display: 'grid', placeItems: 'center', flex: 'none' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {trailing && <span style={{ color: t.assist.ink, display: 'grid', placeItems: 'center' }}>{trailing}</span>}
    </button>
  );
}

/** "Turn on word translation": the same button box as the other assists, with a checkbox at the right. */
function WordTranslationRow({ checked, onChange, t }: { checked: boolean; onChange: (next: boolean) => void; t: PlayTokens }) {
  return (
    <label style={rowBoxStyle(t)}>
      <span style={{ display: 'grid', placeItems: 'center', flex: 'none' }}>
        <AssistIcon kind="wordTranslate" />
      </span>
      <span style={{ flex: 1 }}>Turn on word translation</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 22, height: 22, margin: 0, flex: 'none', accentColor: t.assist.toggleOn, cursor: 'pointer' }}
      />
    </label>
  );
}
