import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const SHOTS = 'scripts/smoke-shots/stage5';
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
// Reuse storage so userId is already set from the Stage 4 smoke run
const ctx = await browser.newContext({
  storageState: undefined,
});
const page = await ctx.newPage();

// ── Seed localStorage with a userId so we land on /home directly ──────────
await page.goto('http://localhost:3000/home');
await page.evaluate(() => {
  localStorage.setItem('user', JSON.stringify({ state: { userId: '042' }, version: 0 }));
});
await page.reload();
await page.waitForFunction(() => document.body.innerText.includes('Welcome'));

// 1. Home page initial state
await page.screenshot({ path: `${SHOTS}/01-home-green.png` });
console.log('01 home page (green theme)');

// 2. Switch to Blue theme
await page.click('button[aria-label="Switch to Blue theme"]');
await page.waitForFunction(() =>
  getComputedStyle(document.querySelector('main')).backgroundColor !== 'rgb(121, 156, 84)'
);
await page.screenshot({ path: `${SHOTS}/02-home-blue.png` });
console.log('02 blue theme applied');

// 3. Switch to Dark theme
await page.click('button[aria-label="Switch to Dark theme"]');
await page.waitForFunction(() =>
  getComputedStyle(document.querySelector('main')).backgroundColor === 'rgb(0, 0, 0)'
);
await page.screenshot({ path: `${SHOTS}/03-home-dark.png` });
console.log('03 dark theme applied');

// 4. Switch back to Green, select Hard difficulty
await page.click('button[aria-label="Switch to Green theme"]');
await page.getByText('Hard').first().click();
await page.screenshot({ path: `${SHOTS}/04-difficulty-hard.png` });
console.log('04 Hard difficulty selected');

// 5. Switch Language Assist to Advanced
await page.getByText('Advanced').first().click();
await page.screenshot({ path: `${SHOTS}/05-assist-advanced.png` });
console.log('05 Advanced assist selected');

// 6. Click a skill card → navigates to /play with correct params
await page.getByText('Money Operations').click();
await page.waitForURL('**/play**');
await page.waitForFunction(() => document.body.innerText.includes('Difficulty'));
await page.screenshot({ path: `${SHOTS}/06-play-page.png` });
const url = page.url();
console.log('06 play page URL:', url);
const hasHard   = url.includes('difficulty=hard');
const hasMoney  = url.includes('category=money');
console.log('   difficulty=hard:', hasHard, '| category=money:', hasMoney);

// 7. Back button returns to /home
await page.click('button:has-text("Back")');
await page.waitForURL('**/home**');
await page.screenshot({ path: `${SHOTS}/07-back-to-home.png` });
console.log('07 back to home');

// Console errors check
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
if (errors.length) console.error('Console errors:', errors);
else console.log('No console errors');

await browser.close();
console.log(`\nScreenshots → ${SHOTS}/`);
