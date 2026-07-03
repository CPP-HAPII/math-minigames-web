import { create } from 'zustand';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { parseQuestion } from '@/lib/normalize';
import type {
  AnyGameData,
  FillBlanksGameData,
  JumbleGameData,
  PlaybackGameData,
  ReadAloudGameData,
  SequenceData,
  TypingGameData,
} from '@/lib/types';

// ─── State shape ──────────────────────────────────────────────────────────────

interface GameDataState {
  // Per-type banks (all difficulties combined; used for random-mode selection)
  jumbleBank:    JumbleGameData[];
  playbackBank:  PlaybackGameData[];
  readAloudBank: ReadAloudGameData[];
  typingBank:    TypingGameData[];
  fillBlanksBank: FillBlanksGameData[];

  // Difficulty banks (all types combined; used for easy/intermediate/hard modes)
  easyBank:         AnyGameData[];
  intermediateBank: AnyGameData[];
  hardBank:         AnyGameData[];

  // Sequence metadata loaded from gameData/sequenceDoc
  sequences: SequenceData[];

  // Async status
  isLoaded:  boolean;
  isLoading: boolean;
  error:     string | null;

  // Actions
  initBanks: () => Promise<void>;
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

function parseSequence(raw: unknown): SequenceData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  return {
    name:       String(d['name']       ?? ''),
    difficulty: Array.isArray(d['difficulty']) ? d['difficulty'].map(String) : [],
    gameType:   Array.isArray(d['gameType'])   ? d['gameType'].map(String)   : [],
    filters:    Array.isArray(d['filters'])    ? d['filters'].map(String)    : [],
    random:     Boolean(d['random']            ?? false),
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameDataStore = create<GameDataState>()((set, get) => ({
  jumbleBank:     [],
  playbackBank:   [],
  readAloudBank:  [],
  typingBank:     [],
  fillBlanksBank: [],

  easyBank:         [],
  intermediateBank: [],
  hardBank:         [],

  sequences: [],

  isLoaded:  false,
  isLoading: false,
  error:     null,

  initBanks: async () => {
    // Idempotent: skip if already loaded or a load is in flight
    const { isLoaded, isLoading } = get();
    if (isLoaded || isLoading) return;

    set({ isLoading: true, error: null });

    try {
      // ── Fetch questions ─────────────────────────────────────────────────────
      const questionsSnap = await getDoc(doc(db, 'gameData', 'questions'));
      if (!questionsSnap.exists()) {
        throw new Error(
          "Document gameData/questions not found in Firestore. " +
          "Run `npx tsx scripts/seed.ts` first.",
        );
      }

      const rawArr = questionsSnap.data()['questions'] as unknown[];
      if (!Array.isArray(rawArr)) {
        throw new Error("gameData/questions.questions is not an array.");
      }

      // ── Parse and distribute into banks ────────────────────────────────────
      const jumbleBank:    JumbleGameData[]    = [];
      const playbackBank:  PlaybackGameData[]  = [];
      const readAloudBank: ReadAloudGameData[] = [];
      const typingBank:    TypingGameData[]    = [];
      const fillBlanksBank: FillBlanksGameData[] = [];

      const easyBank:         AnyGameData[] = [];
      const intermediateBank: AnyGameData[] = [];
      const hardBank:         AnyGameData[] = [];

      let parseFailures = 0;

      for (const rawDoc of rawArr) {
        const parsed = parseQuestion(rawDoc as Record<string, unknown>);
        if (!parsed) {
          console.warn('[gameDataStore] parseQuestion returned null for:', rawDoc);
          parseFailures++;
          continue;
        }

        // Distribute into type bank
        switch (parsed.gameType) {
          case 'jumble':   jumbleBank.push(parsed as JumbleGameData);     break;
          case 'playback': playbackBank.push(parsed as PlaybackGameData); break;
          case 'reading':  readAloudBank.push(parsed as ReadAloudGameData); break;
          case 'typing':   typingBank.push(parsed as TypingGameData);     break;
          case 'fill':     fillBlanksBank.push(parsed as FillBlanksGameData); break;
        }

        // Distribute into difficulty bank
        switch (parsed.difficulty) {
          case 'easy':         easyBank.push(parsed);         break;
          case 'intermediate': intermediateBank.push(parsed); break;
          case 'hard':         hardBank.push(parsed);         break;
          // 'random' questions (if any) are excluded from difficulty banks
        }
      }

      if (parseFailures > 0) {
        console.warn(`[gameDataStore] ${parseFailures} question(s) failed to parse.`);
      }

      // ── Fetch sequences ─────────────────────────────────────────────────────
      const seqSnap = await getDoc(doc(db, 'gameData', 'sequenceDoc'));
      const sequences: SequenceData[] = [];

      if (seqSnap.exists()) {
        const rawSeqs = seqSnap.data()['sequences'] as unknown[];
        if (Array.isArray(rawSeqs)) {
          for (const s of rawSeqs) {
            const parsed = parseSequence(s);
            if (parsed) sequences.push(parsed);
          }
        }
      } else {
        console.warn('[gameDataStore] gameData/sequenceDoc not found; sequences will be empty.');
      }

      set({
        jumbleBank,
        playbackBank,
        readAloudBank,
        typingBank,
        fillBlanksBank,
        easyBank,
        intermediateBank,
        hardBank,
        sequences,
        isLoaded:  true,
        isLoading: false,
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[gameDataStore] initBanks failed:', message);
      set({ isLoading: false, error: message });
    }
  },
}));
