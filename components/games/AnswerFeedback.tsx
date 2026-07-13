import type { ColorProfile } from '@/lib/themes';

export type FeedbackOutcome = 'correct' | 'wrong' | 'incomplete' | null;

interface AnswerFeedbackProps {
  outcome: FeedbackOutcome;
  /** Only meaningful when outcome === 'correct'. True = solved first try (no prior mistake this question). */
  wasCleanCorrect: boolean;
  profile: ColorProfile;
  /** Shown for outcome === 'wrong'. Each game phrases this slightly differently. */
  wrongMessage: string;
  /** Shown for outcome === 'incomplete' — only Jumble/FillBlanks/Playback have that state. */
  incompleteMessage?: string;
}

/** Fixed burst offsets (no Math.random() — see useGameBase.ts's Date.now() precedent for why this codebase avoids impure calls during render). */
const CONFETTI_PIECES: { dx: number; dy: number; rot: number }[] = [
  { dx: -60, dy: -70, rot: 120 },
  { dx: 50, dy: -80, rot: -140 },
  { dx: -90, dy: -20, rot: 200 },
  { dx: 90, dy: -30, rot: -200 },
  { dx: -40, dy: -100, rot: 80 },
  { dx: 40, dy: -100, rot: -80 },
  { dx: -100, dy: 10, rot: 260 },
  { dx: 100, dy: 20, rot: -260 },
  { dx: -20, dy: -60, rot: 40 },
  { dx: 20, dy: -60, rot: -40 },
];

type ConfettiPieceStyle = React.CSSProperties & {
  '--confetti-dx': string;
  '--confetti-dy': string;
  '--confetti-rot': string;
};

/**
 * Success / encouragement feedback shown under the answer controls after a
 * Check Answer, plus a short CSS confetti burst on 'correct'. Shared by all
 * 5 game components (JumbleGame, TypingGame, FillBlanksGame, PlaybackGame,
 * ReadAloudGame) so the feel is identical across game types — and
 * automatically theme-consistent, since confetti colors are drawn from the
 * active ColorProfile rather than hardcoded.
 *
 * Deliberately not punitive on 'wrong'/'incomplete' (unchanged copy from
 * before this stage — each game already phrased these gently) and
 * deliberately not identical on 'correct': a clean first-try correct gets a
 * bigger "you nailed it" message, a corrected-after-mistake answer gets a
 * warmer "you worked it out" one, since both are worth celebrating but
 * they're not the same accomplishment.
 */
export default function AnswerFeedback({
  outcome,
  wasCleanCorrect,
  profile: p,
  wrongMessage,
  incompleteMessage,
}: AnswerFeedbackProps) {
  if (!outcome) return null;

  if (outcome === 'incomplete') {
    if (!incompleteMessage) return null;
    return (
      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '1.1rem', fontWeight: 700, color: p.clearAnswerButtonColor }}>
        {incompleteMessage}
      </p>
    );
  }

  if (outcome === 'wrong') {
    return (
      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '1.1rem', fontWeight: 700, color: p.clearAnswerButtonColor }}>
        {wrongMessage}
      </p>
    );
  }

  // outcome === 'correct'
  const confettiColors = [p.checkAnswerButtonColor, p.buttonColor, p.contrastTextColor];
  const message = wasCleanCorrect
    ? '✓ Awesome! You got it on the first try! 🎉'
    : '✓ You worked it out — nice job! 🌟';

  return (
    <div style={{ position: 'relative', textAlign: 'center', marginTop: '1.25rem', minHeight: '2.5rem' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {CONFETTI_PIECES.map((piece, i) => (
          <span
            key={i}
            style={
              {
                position: 'absolute',
                width: '8px',
                height: '8px',
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                backgroundColor: confettiColors[i % confettiColors.length],
                animation: 'confetti-piece 450ms ease-out forwards',
                '--confetti-dx': `${piece.dx}px`,
                '--confetti-dy': `${piece.dy}px`,
                '--confetti-rot': `${piece.rot}deg`,
              } as ConfettiPieceStyle
            }
          />
        ))}
      </div>
      <p
        style={{
          position: 'relative',
          fontSize: '1.1rem',
          fontWeight: 700,
          color: p.checkAnswerButtonColor,
          animation: 'feedback-pop 300ms ease-out',
        }}
      >
        {message}
      </p>
    </div>
  );
}
