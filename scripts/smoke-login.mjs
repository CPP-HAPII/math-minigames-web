// Smoke test: login flow + persistence across reload.
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const SHOTS = 'scripts/smoke-shots';
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// ── 1. Login page ──────────────────────────────────────────────────────────
await page.goto('http://localhost:3000');
await page.waitForSelector('input#userId');
await page.screenshot({ path: `${SHOTS}/01-login.png` });
console.log('01 login page loaded');

// ── 2. Submit empty → validation error ────────────────────────────────────
await page.click('button[type=submit]');
await page.waitForSelector('p:has-text("Please enter")');
await page.screenshot({ path: `${SHOTS}/02-validation-error.png` });
console.log('02 empty-submit validation error shown');

// ── 3. Enter wrong-length ID → validation error ────────────────────────────
await page.fill('input#userId', '12');
await page.click('button[type=submit]');
await page.waitForSelector('p:has-text("exactly 3 digits")');
await page.screenshot({ path: `${SHOTS}/03-length-error.png` });
console.log('03 wrong-length validation error shown');

// ── 4. Enter valid ID → routes to /home ───────────────────────────────────
await page.fill('input#userId', '');
await page.fill('input#userId', '042');
await page.click('button[type=submit]');
await page.waitForURL('**/home');
await page.waitForFunction(() =>
  document.body.innerText.includes('userId:')
);
await page.screenshot({ path: `${SHOTS}/04-home.png` });
const homeText = await page.innerText('h1');
console.log('04 home page text:', homeText);

// ── 5. Reload → ID persists from localStorage ─────────────────────────────
await page.reload();
await page.waitForFunction(() =>
  !document.body.innerText.includes('userId: …')
);
await page.screenshot({ path: `${SHOTS}/05-home-after-reload.png` });
const reloadText = await page.innerText('h1');
console.log('05 after reload text:', reloadText);

const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
if (errors.length) console.error('Console errors:', errors);
else console.log('No console errors');

await browser.close();
console.log(`\nScreenshots written to ${SHOTS}/`);
