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
          <summary><h2><span className={styles.assistIcon} aria-hidden="true"><CalculatorIcon /></span>Math Assist</h2></summary>
          {/* Keep the calculator mounted between questions so its result is retained.
              The panel's purple tint comes from .calculator in TaskLayout.module.css. */}
          <div className={styles.calculator}>
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
      <summary><h2><span className={styles.assistIcon} aria-hidden="true"><GlobeIcon /></span>Language Assist</h2></summary>
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

// Icons for the gradient badges beside each assist heading.
function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
      <path d="M8.5 6.5h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01" />
    </svg>
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