import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { execFileSync } from 'child_process';

const SHOTS = 'scripts/smoke-shots/stage13';
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// Reuses the /test-translate harness from Stage 12 — it renders a real
// JumbleGame (now including HoverTranslatedText) wired to the real
// sessionStore.submitAnswer() path.
await page.goto('http://localhost:3000/test-translate');
await page.evaluate(() => {
  localStorage.setItem('user', JSON.stringify({ state: { userId: 'stage13-smoke' }, version: 0 }));
});
await page.reload();

await page.waitForSelector('[data-testid="accepted-answer"]');
const accepted = JSON.parse(await page.locator('[data-testid="accepted-answer"]').textContent());
const options = JSON.parse(await page.locator('[data-testid="option-list"]').textContent());
console.log('01 question loaded · accepted:', accepted, '· options:', options);
await page.screenshot({ path: `${SHOTS}/01-question-loaded.png` });

// ── 1. Hover the first word of the problem text — real network call to /api/translate ──
const hoverWord = page.locator('[data-hover-word]').first();
const word = await hoverWord.getAttribute('data-hover-word');
await hoverWord.hover();
await page.waitForSelector('[role="tooltip"]', { timeout: 15000 }); // shows ~150ms after hover (Hover to translate / Translating…)
await page.waitForFunction(
  () => {
    const el = document.querySelector('[role="tooltip"]');
    return !!el && el.textContent !== 'Hover to translate' && el.textContent !== 'Translating…';
  },
  { timeout: 15000 },
);
const tooltipText = await page.locator('[role="tooltip"]').first().textContent();
console.log(`02 hovered "${word}" → tooltip:`, tooltipText);
await page.screenshot({ path: `${SHOTS}/02-hover-tooltip.png` });

// ── 2. Move off, hover the SAME word again — must not refire (cache hit, no re-fetch) ──
await page.mouse.move(0, 0);
await page.waitForTimeout(200);
let translateCalls = 0;
page.on('request', (req) => { if (req.url().includes('/api/translate')) translateCalls += 1; });
await hoverWord.hover();
await page.waitForSelector('[role="tooltip"]');
await page.waitForTimeout(300);
console.log('03 re-hover same word → /api/translate calls fired:', translateCalls, '(expect 0 — cached)');

// ── 3. Answer the question correctly, then confirm the hover interaction landed in the QuestionLog ──
const usedIndices = [];
for (const w of accepted) {
  const idx = options.findIndex((opt, i) => opt === w && !usedIndices.includes(i));
  if (idx === -1) throw new Error(`Could not find unused option for token "${w}"`);
  usedIndices.push(idx);
}
const wordButtons = page.locator('section > div:nth-child(4) button');
for (const idx of usedIndices) {
  await wordButtons.nth(idx).click();
}
await page.getByRole('button', { name: 'Check Answer' }).click();
console.log('04 answered correctly');

await page.waitForFunction(() => {
  const el = document.querySelector('[data-testid="last-log"]');
  return el && el.textContent.length > 0;
});
const lastLog = JSON.parse(await page.locator('[data-testid="last-log"]').textContent());
console.log('05 QuestionLog:', lastLog);

const okAssistUsed = lastLog.assistUsed === 'advanced';
const okInteractions = Array.isArray(lastLog.assistInteractions) && lastLog.assistInteractions.includes('hover_translation');
console.log('   assistUsed === "advanced":', okAssistUsed, '(hover-only session — no button click this run)');
console.log('   assistInteractions includes "hover_translation":', okInteractions);

// ── 4. Actually persist to Firestore, then read the doc back for real (not just client-side store state) ──
const userId = 'stage13-smoke';
await page.getByTestId('submit-to-firestore').click();
await page.waitForFunction(() => {
  const el = document.querySelector('[data-testid="write-status"]');
  return el && (el.textContent.startsWith('saved:') || el.textContent.startsWith('error:'));
}, { timeout: 20000 });
const writeStatus = await page.locator('[data-testid="write-status"]').textContent();
console.log('06 Firestore write status:', writeStatus);

let firestoreOk = false;
let firestoreDoc = null;
if (writeStatus.startsWith('saved:')) {
  const docId = writeStatus.slice('saved:'.length);
  // Invoke tsx's JS entry directly with execFileSync's default (no shell) so
  // args are passed as a real argv array — avoids the shell-string-concat
  // injection shape entirely, not just in this case where the args happen to
  // be safe (a literal userId and a Firestore-generated alphanumeric docId).
  const out = execFileSync(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', 'scripts/verify-firestore-attempt.ts', userId, docId],
    { encoding: 'utf-8', cwd: process.cwd() },
  );
  firestoreDoc = JSON.parse(out.trim().split('\n').pop());
  const loggedQuestion = firestoreDoc.questions?.[0];
  firestoreOk =
    loggedQuestion?.assistUsed === 'advanced' &&
    Array.isArray(loggedQuestion?.assistInteractions) &&
    loggedQuestion.assistInteractions.includes('hover_translation');
  console.log('07 Firestore doc (read back for real):', JSON.stringify(loggedQuestion));
  console.log('   hover_translation persisted in Firestore:', firestoreOk);
}

if (errors.length) console.error('Console errors:', errors);
else console.log('No console errors');

await browser.close();

if (!okAssistUsed || !okInteractions || translateCalls !== 0 || !firestoreOk) {
  console.error('\nFAIL.');
  process.exit(1);
}
console.log(`\nPASS — screenshots → ${SHOTS}/`);
