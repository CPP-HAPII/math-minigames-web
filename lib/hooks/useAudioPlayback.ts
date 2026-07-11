import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal playback controller for Playback-game audio — scoped to Stage 11.
 *
 * Mirrors the source-priority already documented on PlaybackGameData
 * (lib/types.ts): a real audio file at `src`, when non-empty, is played via
 * an HTML5 <audio> element; otherwise `transcript` is read aloud via the Web
 * Speech API (window.speechSynthesis) — the same Chrome-only TTS mechanism
 * ReadAloudGameData's docs already establish for this port.
 *
 * Deliberately minimal: play/pause/stop only, default voice/rate/pitch, no
 * queueing across questions, no language-assist wiring. A full TTS system
 * (voice selection, hover-to-speak, etc.) is Stage 12+.
 */

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'stopped' | 'error';
export type PlaybackMode = 'audio' | 'tts';

export interface AudioPlayback {
  status: PlaybackStatus;
  /** 'audio' when playing a real file at `src`; 'tts' when speaking `transcript`. */
  mode: PlaybackMode;
  play: () => void;
  pause: () => void;
  stop: () => void;
}

export function useAudioPlayback(src: string, transcript: string): AudioPlayback {
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mode: PlaybackMode = src.length > 0 ? 'audio' : 'tts';

  // Build/tear down the <audio> element whenever the source changes.
  useEffect(() => {
    if (mode !== 'audio') return;

    const audio = new Audio(src);
    audioRef.current = audio;
    const onPlay = () => setStatus('playing');
    const onPause = () => setStatus('paused');
    const onEnded = () => setStatus('stopped');
    const onError = () => setStatus('error');

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, [src, mode]);

  // Stop any in-flight speech when the question changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [transcript]);

  const play = useCallback(() => {
    if (mode === 'audio') {
      audioRef.current?.play().catch(() => setStatus('error'));
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setStatus('error');
      return;
    }

    // Resume a paused utterance rather than restarting from the top.
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus('playing');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(transcript);
    utterance.onstart = () => setStatus('playing');
    utterance.onend = () => setStatus('stopped');
    utterance.onerror = () => setStatus('error');
    window.speechSynthesis.speak(utterance);
  }, [mode, transcript]);

  const pause = useCallback(() => {
    if (mode === 'audio') {
      audioRef.current?.pause();
    } else if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setStatus('paused');
    }
  }, [mode]);

  const stop = useCallback(() => {
    if (mode === 'audio') {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setStatus('stopped');
    } else if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setStatus('stopped');
    }
  }, [mode]);

  return { status, mode, play, pause, stop };
}
