'use client';

import type { ReactNode } from 'react';
import HoverTranslatedText from '@/components/games/HoverTranslatedText';
import { useWordTranslationStore } from '@/lib/stores/wordTranslationStore';
import { useActiveProfile, usePlayTokens } from '@/lib/usePlayTokens';

interface QuestionCardProps {
  /** The instruction line, e.g. "Build your answer with the word blocks." */
  instruction: string;
  /** The question text. Omit for questions that are heard rather than read (Playback). */
  text?: string;
  /** Anything extra under the text: audio controls, a note. */
  children?: ReactNode;
}

/**
 * The white card at the top of every game: instruction heading, then the
 * question. When "Turn on word translation" is on in the Language Assist panel,
 * each word of the question shows its translation on hover.
 */
export default function QuestionCard({ instruction, text, children }: QuestionCardProps) {
  const t = usePlayTokens();
  const profile = useActiveProfile();
  const wordTranslation = useWordTranslationStore((s) => s.enabled);

  const textStyle = {
    fontSize: '1.75rem',
    lineHeight: 1.4,
    fontWeight: 400,
    color: t.questionInk,
  } as const;

  return (
    <section
      style={{
        background: t.cardBg,
        border: `1.5px solid ${t.cardBorder}`,
        borderRadius: 18,
        padding: '22px 26px 26px',
        fontFamily: t.bodyFont,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: t.displayFont,
          fontWeight: 700,
          fontSize: '1.4rem',
          lineHeight: 1.3,
          color: t.heading,
        }}
      >
        {instruction}
      </h2>

      {text && (
        <div style={{ marginTop: 22 }} data-testid="question-text">
          {wordTranslation ? (
            <HoverTranslatedText
              text={text}
              profile={profile}
              fontSize={textStyle.fontSize}
              fontWeight={textStyle.fontWeight}
              textColor={textStyle.color}
              textAlign="left"
              tooltipBackground={t.assist.tooltipBg}
              tooltipColor={t.assist.tooltipInk}
              tooltipBorder={t.assist.tooltipBorder}
              tooltipShadow={t.assist.tooltipShadow}
            />
          ) : (
            <p style={{ margin: 0, ...textStyle }}>{text}</p>
          )}
        </div>
      )}

      {children && <div style={{ marginTop: text ? 18 : 22 }}>{children}</div>}
    </section>
  );
}
