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

Each game type covers a mix of math skills (addition, subtraction, multiplication, division, fractions, decimals) and language skills (listening, spoken response, word problems, numbers-to-words, words-to-numbers, sentence building).

### Language assist levels
Three tiers of scaffolding, selectable per user:
- **Novice (Full Assist)** — question auto-translates on load, plus a "Speak question" TTS button and a "Play translation" spoken option
- **Intermediate (Half Assist)** — manual "Translate" button only, no TTS
- **Advanced (Low Assist)** — no assist card at all; hover-translate remains available at every level, regardless of assist tier

### Logging
Every question attempt is logged per user with correctness, time taken, and which assist interaction (if any) was used — recorded via a priority scheme (`advanced < intermediate < novice`) that captures the *highest-tier interaction actually used* per question, not just the user's assigned level. This means a student assigned "intermediate" who also happens to trigger a novice-tier interaction (e.g., "Play translation") gets that logged accurately.

### Teacher-facing analytics portal (in progress)
An educator dashboard (`/teacher-portal`) currently in development, covering:
- **Class Overview** — class-wide skill accuracy, weak-topic detection, average time per skill
- **Student Detail** — per-student breakdown of the same, via a student picker
- **Assist Usage** — class-wide interaction-type ranking and per-student assist-tier breakdown

Not yet built: auth/role gating (the portal is currently reachable without restriction), teacher controls for selecting question sequences/difficulty, and chart-based visualizations (current views are table/list-based).

## System architecture

```
Flutter Application (MathMinigames)  →  Next.js port (this repo)

UI / Presentation        Business Logic              Data Services
- Home / Dashboard       - Game logic & validation    - FirebaseService
- Login / Register       - Language assistance        - AuthService
- Game screens           - Translation (EN <-> ES)     - QuestionService
- Score / Progress       - Text-to-speech (TTS)         - SequenceService
                          - Sequence & filter engine     - QuizAttemptService

                                    ↓ (HTTPS)

Firestore Database
- gameData: questions, sequences (filters, difficulty, gameTypes)
- quizAttempts: per-user, per-session logs — results, timing, assist
  level used, translations viewed, scaffolding usage
```

Firestore's `quizAttempts` collection stores each attempt's `questions[]` as an array of maps (not flat documents), which means Firestore can't natively query into fields like `assistUsed` across many documents — analytics aggregation reads whole documents and reduces over `questions[]` in code rather than using a native Firestore query.

## Tech stack
- **Frontend:** Next.js, TypeScript, React
- **Backend:** Firebase (Firestore, Auth)
- **Testing:** Vitest (unit tests for the analytics service layer)
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
- ✅ Teacher portal UI (data-wired) — Class Overview, Student Detail, and Assist Usage sections all wired to real Firestore data
- ✅ Unit tests for the analytics service layer — 100% coverage, cross-checked against real audit data
- 🔲 Chart/visualization polish for the portal UI
- 🔲 Auth/role distinction (student vs. teacher accounts)
- 🔲 Teacher controls for selecting sequences/difficulty
- 🔲 Optional layout/design redesign

## Acknowledgments

This work is part of Dr. Ben Steichen's HCI research lab (CPP-HAPII) at Cal Poly Pomona, and builds on research and pilot studies conducted with Santa Clara University (see `MultilingualMath_CR.pdf`).
