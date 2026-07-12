import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Minimal Web Speech API ambient typings ───────────────────────────────────
//
// SpeechRecognition isn't part of TypeScript's built-in DOM lib (it's still a
// non-standard/experimental API) and ships Chrome-only, under the prefixed
// `webkitSpeechRecognition` name in practice. Scoped to exactly what this
// hook uses rather than the full spec.

interface SpeechRecognitionResult {
  readonly [index: number]: { transcript: string };
}

interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult;
  readonly length: number;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'stopped' | 'error';

export interface SpeechRecognitionController {
  /** False when neither window.SpeechRecognition nor window.webkitSpeechRecognition exist (e.g. Safari). */
  supported: boolean;
  status: SpeechRecognitionStatus;
  /** Best-so-far transcript for the current listening session. Replaced wholesale on each update. */
  transcript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  /** Clears the transcript and resets status to idle — does not affect `supported`. */
  reset: () => void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Thin wrapper over the Web Speech API's SpeechRecognition. Ported behavior
 * from AudioTranscriptionWidgetState._listen() in reading.dart: continuous
 * listening with interim results, where each result event carries the full
 * best-guess transcript so far (replaced, not appended, on every update).
 *
 * Chrome-only by design (per the project's existing "free STT" constraint —
 * no server-side speech service). `supported` lets the component show a
 * clear fallback message instead of a silent failure on unsupported browsers.
 */
export function useSpeechRecognition(): SpeechRecognitionController {
  const supported = getSpeechRecognitionCtor() !== null;
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus('error');
      setError('Speech recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };
    recognition.onerror = (event) => {
      setStatus('error');
      setError(event.error || 'Speech recognition error.');
    };
    recognition.onend = () => {
      setStatus((s) => (s === 'error' ? s : 'stopped'));
    };

    recognitionRef.current = recognition;
    setError(null);
    setStatus('listening');
    recognition.start();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    recognitionRef.current?.abort();
    setTranscript('');
    setError(null);
    setStatus('idle');
  }, []);

  return { supported, status, transcript, error, start, stop, reset };
}
