'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { AnyGameData, AssistLevel } from '@/lib/types';
import type { ColorProfile } from '@/lib/themes';
import { useAssistStore } from '@/lib/stores/assistStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useSpeak } from '@/lib/hooks/useSpeak';
import Calculator from '@/components/Calculator';
import styles from './TaskLayout.module.css';

interface TaskLayoutProps {
  question: AnyGameData;
  questionIndex: number;
  assistLevel: AssistLevel;
  profile: ColorProfile;
  children: ReactNode;
}

export default function TaskLayout({ question, questionIndex, assistLevel, profile: p, children }: TaskLayoutProps) {
  const colors = {
    '--task-ink': p.homeInk,
    '--task-muted': p.homeInkSoft,
    '--task-surface': p.homeSurfaceBackground,
    '--task-panel': p.homePanelBackground,
    '--task-border': p.homeBorder,
    '--task-accent': p.homeAccentSolid,
    '--task-action': p.checkAnswerButtonColor,
    '--task-action-ink': readableButtonText(p),
  } as CSSProperties;

  return (
    <div className={styles.layout} style={colors}>
      <div className={styles.questionColumn}>{children}</div>
      <aside className={styles.assistColumn} aria-label="Assist tools">
        <LanguageAssist
          key={`${question.id}-${questionIndex}-${assistLevel}`}
          question={question} assistLevel={assistLevel}
        />
        <details className={styles.assistCard} open>
          <summary><h2>Math Assist</h2></summary>
          {/* Keep the calculator mounted between questions so its result is retained. */}
          <div className={styles.calculator} style={{ background: p.homeHeaderBackground, color: p.homeThemeButtonInactiveColor }}>
            <Calculator profile={p} />
          </div>
        </details>
      </aside>
    </div>
  );
}

function LanguageAssist({ question, assistLevel }: Pick<TaskLayoutProps, 'question' | 'assistLevel'>) {
  const hydrated = useHydrated();
  const hoverEnabled = useAssistStore((s) => s.hoverTranslationEnabled);
  const setHoverEnabled = useAssistStore((s) => s.setHoverTranslationEnabled);
  const isPlayback = question.gameType === 'playback';
  const sourceText = isPlayback ? question.audioTranscript : question.displayedProblem;

  // Listening questions have no visible words to hover over.
  if (isPlayback && assistLevel === 'advanced') return null;

  return (
    <details className={styles.assistCard} open>
      <summary><h2>Language Assist</h2></summary>
      <div className={styles.assistBody}>
        {assistLevel !== 'advanced' && (
          <TranslationTools text={sourceText} autoTranslate={assistLevel === 'novice'} speakOriginal={!isPlayback && assistLevel === 'novice'} />
        )}
        {!isPlayback && (
          <label className={styles.hoverToggle}>
            <input type="checkbox" checked={hydrated && hoverEnabled} onChange={(e) => setHoverEnabled(e.target.checked)} />
            <span>Turn on word translation</span>
          </label>
        )}
      </div>
    </details>
  );
}

function TranslationTools({ text, autoTranslate, speakOriginal }: { text: string; autoTranslate: boolean; speakOriginal: boolean }) {
  // Use the existing hooks to retain translation caching, speech, and assist logging.
  const { status, translated, translate, speakTranslation } = useTranslation(text, 'es', autoTranslate);
  const speak = useSpeak();

  return (
    <>
      <button type="button" className={styles.assistButton} onClick={translate} disabled={status === 'loading'}>
        {status === 'loading' ? 'Translating…' : 'Translate question'}
      </button>
      <div aria-live="polite">
        {status === 'shown' && translated && <p className={styles.translation} lang="es">{translated}</p>}
        {status === 'error' && <p className={styles.help}>Translation failed. Select Translate question to try again.</p>}
      </div>
      {speakOriginal && (
        <button type="button" className={styles.assistButton} onClick={() => speak(text, 'en-US')}>Speak question</button>
      )}
      {status === 'shown' && translated && (
        <button type="button" className={styles.assistButton} onClick={speakTranslation}>Speak translated question</button>
      )}
    </>
  );
}

// Choose a readable existing theme color for bright green/gold Check buttons.
function readableButtonText(p: ColorProfile): string {
  const luminance = (hex: string) => {
    const rgb = hex.replace('#', '').match(/.{2}/g)?.map((value) => {
      const channel = parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return rgb?.length === 3 ? rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 : 0;
  };
  const background = luminance(p.checkAnswerButtonColor);
  const contrast = (color: string) => {
    const text = luminance(color);
    return (Math.max(background, text) + 0.05) / (Math.min(background, text) + 0.05);
  };
  return [p.homeInk, p.homeSurfaceBackground, p.textColor, p.contrastTextColor]
    .reduce((best, color) => contrast(color) > contrast(best) ? color : best);
}
