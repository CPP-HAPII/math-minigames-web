import Image from 'next/image';

export type AssistIconKind = 'translate' | 'speak' | 'speakTranslated' | 'wordTranslate';

/**
 * The four Language Assist icons are image files in public/assist/. To change
 * one, replace the PNG (keep the file name) - no code change needed.
 */
const SOURCES: Record<AssistIconKind, string> = {
  translate: '/assist/translate.png',
  speak: '/assist/speak-question.png',
  speakTranslated: '/assist/speak-translated.png',
  wordTranslate: '/assist/word-translation.png',
};

interface AssistIconProps {
  kind: AssistIconKind;
  size?: number;
}

export default function AssistIcon({ kind, size = 48 }: AssistIconProps) {
  return (
    <Image
      src={SOURCES[kind]}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      draggable={false}
      style={{ display: 'block', flex: 'none' }}
    />
  );
}
