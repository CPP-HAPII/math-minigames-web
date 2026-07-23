import { useCallback } from 'react';

/**
 * Minimal "speak this text" TTS action via the Web Speech API. Ports the
 * flutterTts.setLanguage/setPitch/setSpeechRate/speak call sequence used by
 * both _speakQuestion() (jumble.dart et al.) and _speak() (translation.dart)
 * in the Flutter reference — same pitch/rate (1.0), language set per call
 * rather than fixed per instance, since the same app speaks English question
 * text and Spanish translations at different points.
 */
export function useSpeak() {
  return useCallback((text: string, lang: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }, []);
}
