// ─── Canonical enumerations ───────────────────────────────────────────────────

/**
 * Canonical game-type key (always lowercase).
 * Firestore documents may store 'gameType' in PascalCase ("ReadAloud", "FillBlanks");
 * resolveQuestionTypeKey normalises to these lowercase literals before returning.
 */
export type GameType = 'jumble' | 'playback' | 'reading' | 'typing' | 'fill';

/** Canonical difficulty (always lowercase). JSON seeds use PascalCase ("Easy"). */
export type Difficulty = 'easy' | 'intermediate' | 'hard' | 'random';

// ─── Base interface ───────────────────────────────────────────────────────────

/** Fields shared by every question type. */
export interface GameData {
  id: string;
  skills: string[];
  /** Default scores by type: jumble=10, playback=25, reading=30, typing=20, fill=15. */
  score: number;
  tags: string[];
  gameType: GameType;
  difficulty: Difficulty;
}

// ─── Per-type interfaces ──────────────────────────────────────────────────────

/**
 * Word Jumble game.
 * User selects tokens from a word-button palette to assemble an answer phrase.
 *
 * multiAcceptedAnswers: NESTED (string[][]).
 *   Each inner array is one complete acceptable answer, expressed as an ordered
 *   token list.  Example: [["She","is","forty","years-old"], ["She","was","forty","years-old"]].
 *   Validation joins the inner array with spaces and compares to the joined selection.
 *
 * getMinSelection() = multiAcceptedAnswers[0].length
 *   (minimum number of buttons the user must press before "Check Answer" is enabled).
 */
export interface JumbleGameData extends GameData {
  gameType: 'jumble';
  displayedProblem: string;
  multiAcceptedAnswers: string[][];
  writtenPrompt: string;
  optionList: string[];
}

/**
 * Playback game.
 * Audio plays; user selects tokens from a button palette — same mechanics as Jumble.
 *
 * multiAcceptedAnswers: NESTED (string[][]) — same semantics as JumbleGameData.
 *
 * Audio source priority:
 *   - If webAudioLink is non-empty → use HTML5 <audio src={webAudioLink} />.
 *   - Otherwise                    → read audioTranscript aloud via window.speechSynthesis.
 */
export interface PlaybackGameData extends GameData {
  gameType: 'playback';
  webAudioLink: string;
  audioTranscript: string;
  multiAcceptedAnswers: string[][];
  writtenPrompt: string;
  optionList: string[];
}

/**
 * Read Aloud game (Chrome only — Web Speech API).
 * User speaks into the microphone; the STT transcription is compared to accepted answers.
 *
 * multiAcceptedAnswers: NESTED (string[][]).
 *   Validation joins each inner array → compares to joined+normalised transcription.
 *   Example: [["four","hundred","seventy","six"], ["476"]]
 *
 * useNumWordProtocol: when true, post-process the STT transcript with
 *   convertNumbersAndSymbolsToWords() before comparing (ported from speech_to_text_helper.dart).
 *
 * NOTE — Firestore typo: some documents store the extra-instructions field as
 *   'addtionalInstructions' (missing 'i').  parseReadAloud() reads both keys with a
 *   fallback; the canonical name here is always additionalInstructions.
 */
export interface ReadAloudGameData extends GameData {
  gameType: 'reading';
  displayedProblem: string;
  multiAcceptedAnswers: string[][];
  writtenPrompt: string;
  additionalInstructions: string;
  useNumWordProtocol: boolean;
}

/**
 * Typing game.
 * User types a free-text answer into a multi-line input.
 *
 * multiAcceptedAnswers: FLAT (string[]).
 *   ⚠ This is the key type difference from Jumble/Playback/ReadAloud.
 *   Each element is a COMPLETE acceptable answer string, not a token list.
 *   Validation: typed text (trimmed, lowercased) must equal any element exactly.
 *   Uses normalizeToStringList(), NOT normalizeNestedAnswers().
 */
export interface TypingGameData extends GameData {
  gameType: 'typing';
  displayedProblem: string;
  multiAcceptedAnswers: string[];
  writtenPrompt: string;
}

/**
 * Fill in the Blank game.
 * blankForm is a sentence where the literal token '____' marks each answer position.
 * User picks one button per blank, in left-to-right order.
 *
 * multiAcceptedAnswers: FLAT (string[]).
 *   ⚠ Same flat semantics as TypingGameData — NOT nested.
 *   Element [i] is the correct answer for blank [i].  Order is significant.
 *   Uses normalizeToStringList(), NOT normalizeNestedAnswers().
 *
 * NOTE — Firestore key variant: some documents store this as 'blankform' (all lowercase).
 *   parseFillBlanks() reads both; the canonical name here is always blankForm.
 */
export interface FillBlanksGameData extends GameData {
  gameType: 'fill';
  displayedProblem: string;
  multiAcceptedAnswers: string[];
  writtenPrompt: string;
  blankForm: string;
  optionList: string[];
}

/** Discriminated union of all five game question types. */
export type AnyGameData =
  | JumbleGameData
  | PlaybackGameData
  | ReadAloudGameData
  | TypingGameData
  | FillBlanksGameData;

// ─── Sequence / session types ─────────────────────────────────────────────────

/**
 * A named filter set that selects a subset of questions for a play session.
 * Loaded from Firestore: gameData/sequenceDoc → field 'sequences'.
 */
export interface SequenceData {
  name: string;
  difficulty: string[];
  gameType: string[];
  filters: string[];
  random: boolean;
}

/**
 * Per-question telemetry recorded during a play session.
 * Accumulated in the session store (Zustand) and written to Firestore at series end.
 *
 * assistUsed: storageValue of the highest-priority assist level used during this question.
 *   Priority: 'novice' (full assist) > 'intermediate' > 'advanced' (hover only).
 *   null when no language-assist feature was touched.
 *
 * assistInteractions: ordered set of interaction event strings, e.g.
 *   ['hover_translation', 'translation_displayed', 'translation_heard'].
 */
export interface QuestionLog {
  questionId: string;
  skills: string[];
  result: boolean;
  timeTakenInSeconds: number;
  assistUsed: 'novice' | 'intermediate' | 'advanced' | null;
  assistInteractions: string[];
}

/**
 * Document written to quizAttempts/{userId}/attempts/{autoId} at series end.
 * Uses Firestore addDoc (append model) — NOT set() overwrite.
 * (Deliberate change from the Flutter app which used set() keyed by userId.)
 */
export interface QuizAttempt {
  startTime: Date;
  submissionTime: Date;
  difficulty: string;
  questions: QuestionLog[];
}
