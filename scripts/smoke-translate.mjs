import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const SHOTS = 'scripts/smoke-shots/stage12';
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// ── Seed a userId so app code that reads it doesn't choke, then load the harness ──
await page.goto('http://localhost:3000/test-translate');
await page.evaluate(() => {
  localStorage.setItem('user', JSON.stringify({ state: { userId: 'stage12-smoke' }, version: 0 }));
});
await page.reload();

await page.waitForSelector('[data-testid="accepted-answer"]');
const acceptedJson = await page.locator('[data-testid="accepted-answer"]').textContent();
const optionsJson = await page.locator('[data-testid="option-list"]').textContent();
const accepted = JSON.parse(acceptedJson);
const options = JSON.parse(optionsJson);
console.log('01 question loaded · accepted:', accepted, '· options:', options);
await page.screenshot({ path: `${SHOTS}/01-question-loaded.png` });

// ── 1. Trigger the translate button — real network call to /api/translate ──
await page.getByRole('button', { name: 'Translate' }).click();
await page.waitForFunction(() => document.body.innerText.includes('Translation:'), { timeout: 15000 });
const translationText = await page.locator('text=Translation:').first().textContent();
console.log('02 translate button → translation shown:', translationText);
await page.screenshot({ path: `${SHOTS}/02-translation-shown.png` });

// ── 2. Answer the question correctly. Click by DOM position (4th direct child
// of <section> is the word-button palette, in optionList order) rather than by
// label text, since Jumble option labels can repeat (e.g. duplicate words). ──
const usedIndices = [];
for (const word of accepted) {
  const idx = options.findIndex((opt, i) => opt === word && !usedIndices.includes(i));
  if (idx === -1) throw new Error(`Could not find unused option for token "${word}"`);
  usedIndices.push(idx);
}
const wordButtons = page.locator('section > div:nth-child(4) button');
for (const idx of usedIndices) {
  await wordButtons.nth(idx).click();
}
await page.getByRole('button', { name: 'Check Answer' }).click();
console.log('03 answered correctly');
await page.screenshot({ path: `${SHOTS}/03-answered.png` });

// ── 3. Confirm the interaction landed in the QuestionLog via the real sessionStore.submitAnswer() path ──
await page.waitForFunction(() => {
  const el = document.querySelector('[data-testid="last-log"]');
  return el && el.textContent.length > 0;
});
const lastLogJson = await page.locator('[data-testid="last-log"]').textContent();
const lastLog = JSON.parse(lastLogJson);
console.log('04 QuestionLog:', lastLog);

const okAssistUsed = lastLog.assistUsed === 'intermediate';
const okInteractions = Array.isArray(lastLog.assistInteractions) && lastLog.assistInteractions.includes('translation_displayed');
console.log('   assistUsed === "intermediate":', okAssistUsed);
console.log('   assistInteractions includes "translation_displayed":', okInteractions);

if (errors.length) console.error('Console errors:', errors);
else console.log('No console errors');

await browser.close();

if (!okAssistUsed || !okInteractions) {
  console.error('\nFAIL: translation interaction did not land in the QuestionLog as expected.');
  process.exit(1);
}
console.log(`\nPASS — screenshots → ${SHOTS}/`);
