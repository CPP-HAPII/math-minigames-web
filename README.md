# MathMinigames (Web)

A Next.js / TypeScript / Firebase web port of **MathMinigames** — a set of bilingual math-language minigames built by Dr. Ben Steichen's HCI lab (CPP-HAPII) at Cal Poly Pomona, in collaboration with Santa Clara University. The original app was built in Flutter; this repo is a full rewrite of that app for the web, plus new features not present in the Flutter version (assist-level scaffolding, interaction logging, and an in-progress teacher-facing analytics portal).

## Background

Many multilingual learners (MLs) struggle with math not because of the math itself, but because of the **academic language** math is taught in — specialized vocabulary, word problems, and instructions in a language that may not be their first. MathMinigames is a set of minigames designed specifically to support **mathematics language literacy**, not just numeracy, for K-5 bilingual (primarily Spanish-English) students. Pilot studies of the original prototypes (see `MultilingualMath_CR.pdf` in this repo) found that students who spoke Spanish at home reported higher perceived difficulty with the exercises and also learned more new vocabulary — suggesting these tools are most beneficial to students with lower English proficiency, exactly the population they're designed for.

## What's here

### Game types
- **Jumble** — sentence construction from word blocks
- **Playback** — listening comprehension, with audio playback controls
- **Read Aloud** — speaking confidence, using speech-to-text
- **Typing** — written math reasoning (numbers to words, expressions to words)
- **Fill in the Blank** — structured response accuracy

Each game type covers a mix of math skills (addition, subtraction, multiplication, division, fractions, decimals) and language skills (listening, spoken response, word problems, numbers-to-words, words-to-numbers, sentence building). Questions are organized into 5 levels, each split into a handful of sublevels (e.g. "Level 3, sublevel 3.2 · Understanding Large Numbers"), with a Continue banner on the home screen that resumes a student's next incomplete sublevel.

### No login/auth, by design
Students enter a 3-digit Student ID on the welcome screen — no password, no account, no role system. This is intentional: for a K-5 classroom tool with no sensitive or personally identifying data, a professor confirmed real authentication isn't needed, so it was dropped from scope rather than left half-built.

### Student UI theming
Three selectable color themes (Green, Hapii, Dark green), picked from a switcher on both the welcome screen and the home screen and persisted per browser. Each theme drives its own palette across the home screen (headers, level cards, progress accents) and the play screen (question/answer cards, choice buttons, calculator, translate/speak controls), all sourced from one `ColorProfile` per theme rather than scattered hardcoded colors.

### Language assist levels
Three tiers of scaffolding, selectable per user:
- **Novice (Full Assist)** — question auto-translates on load, plus a "Speak question" TTS button and a "Play translation" spoken option
- **Intermediate (Half Assist)** — manual "Translate" button only, no TTS
- **Advanced (Low Assist)** — no assist card at all; hover-translate remains available at every level, regardless of assist tier

### Logging
Every question attempt is logged per user with correctness, time taken, and which assist interaction (if any) was used — recorded via a priority scheme (`advanced < intermediate < novice`) that captures the *highest-tier interaction actually used* per question, not just the user's assigned level. This means a student assigned "intermediate" who also happens to trigger a novice-tier interaction (e.g., "Play translation") gets that logged accurately.

### Teacher-facing analytics portal
An educator dashboard (`/teacher-portal`), built and live, reachable without restriction (see "No login/auth" above), covering:
- **Class Overview** — class-wide skill accuracy, weak-topic detection, average time per skill, with chart visualizations
- **Student Detail** — per-student breakdown of the same, via a student picker, with chart visualizations
- **Assist Usage** — class-wide interaction-type ranking and per-student assist-tier breakdown, with chart visualizations

Not yet built: teacher controls for selecting question sequences/difficulty.

## System architecture

```
Flutter Application (MathMinigames)  →  Next.js port (this repo)

UI / Presentation        Business Logic              Data Services
- Welcome (Student ID)   - Game logic & validation    - FirebaseService
- Home / level select    - Language assistance        - QuestionService
- Game screens           - Translation (EN <-> ES)     - SequenceService
- Score / Progress       - Text-to-speech (TTS)         - QuizAttemptService
- Teacher portal          - Sequence & filter engine

                                    ↓ (HTTPS)

Firestore Database
- gameData: questions, sequences (filters, difficulty, gameTypes)
- quizAttempts: per-user, per-session logs — results, timing, assist
  level used, translations viewed, scaffolding usage
```

Firestore's `quizAttempts` collection stores each attempt's `questions[]` as an array of maps (not flat documents), which means Firestore can't natively query into fields like `assistUsed` across many documents — analytics aggregation reads whole documents and reduces over `questions[]` in code rather than using a native Firestore query.

## Tech stack
- **Frontend:** Next.js, TypeScript, React, Zustand (client state/persisted theme), Tailwind CSS
- **Charts:** Recharts (teacher portal visualizations)
- **Backend:** Firebase (Firestore)
- **Testing:** Vitest (unit tests for the analytics service layer), Playwright (smoke scripts under `scripts/`)
- **Deployment:** Vercel — live demo at `math-minigames-web.vercel.app`

## Development

```bash
npm run dev       # start the dev server at localhost:3000
npm run build     # production build
npx tsc --noEmit  # type-check
npx eslint .      # lint
npx vitest run    # run unit tests
```

## Project status

Originally built across 15 stages (data layer, game types, sequencing, translation, hover-translate, theming, and polish). Since then:
- ✅ Assist-level features (novice/intermediate/advanced) — implemented and verified across all five game types
- ✅ Logging completeness — audited end-to-end, no gaps found
- ✅ Analytics/aggregation layer — data access, stats computation (accuracy, weak-topics, assist usage, timing), and a documented decision to defer caching until there's a real performance need
- ✅ Teacher portal UI (data-wired) — Class Overview, Student Detail, and Assist Usage sections all wired to real Firestore data, with chart visualizations
- ✅ Unit tests for the analytics service layer — 100% coverage, cross-checked against real audit data
- ✅ Levels/sublevels migration — questions organized into 5 levels with sublevels, plus a Continue banner that resumes progress
- ✅ Redesigned student-facing UI — new home screen (level grid, Continue banner), a 3-theme color system with a switcher on both the welcome and home screens, and matching play-screen theming (question cards, choice buttons, calculator, translate/speak controls)
- 🔲 Teacher controls for selecting sequences/difficulty

Auth/role gating is intentionally out of scope — see "No login/auth, by design" above.

## Acknowledgments

This work is part of Dr. Ben Steichen's HCI research lab (CPP-HAPII) at Cal Poly Pomona, and builds on research and pilot studies conducted with Santa Clara University (see `MultilingualMath_CR.pdf`).
