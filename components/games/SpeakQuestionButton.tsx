'use client';

import type { ColorProfile } from '@/lib/themes';
import { useSpeak } from '@/lib/hooks/useSpeak';

interface SpeakQuestionButtonProps {
  /** The original-language question text to read aloud. */
  text: string;
  profile: ColorProfile;
}

/**
 * Novice/"Full Assist"-only button that reads the question aloud in English.
 * Ports _speakQuestion() from the Flutter reference (jumble.dart, typing.dart,
 * fill_in_the_blank.dart, reading.dart, playback.dart — identical body in
 * each). No assist-interaction logging: the Dart source doesn't call
 * recordAssistUsage for this button either, only for the translate widget's
 * hover/shown/spoken callbacks.
 */
export default function SpeakQuestionButton({ text, profile: p }: SpeakQuestionButtonProps) {
  const speak = useSpeak();

  const button: React.CSSProperties = {
    backgroundColor: p.buttonColor,
    color: p.contrastTextColor,
    border: 'none',
    borderRadius: '0.6rem',
    padding: '0.55rem 1.2rem',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
  };

  return (
    <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
      <button onClick={() => speak(text, 'en-US')} style={button}>
        Speak question
      </button>
    </div>
  );
}
