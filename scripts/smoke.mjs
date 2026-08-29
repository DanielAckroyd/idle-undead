// Headless smoke test of the whole flow: main menu -> new game -> class -> battle,
// tap juice, every drawer snap state, every tab. Usage: node scripts/smoke.mjs <outdir>
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? '.';
mkdirSync(out, { recursive: true });

const vite = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const errors = [];
// Painted art is generated out-of-band; a 404 on /art/** is the expected
// "not generated yet" path and the UI falls back to the SVG placeholder.
const expectedMiss = t => /\/art\//.test(t) && /404|Failed to load resource/i.test(t);
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (!expectedMiss(t)) errors.push('console: ' + t);
});
page.on('requestfailed', r => {
  const t = `${r.url()} ${r.failure()?.errorText ?? ''}`;
  if (!expectedMiss(t)) errors.push('requestfailed: ' + t);
});

const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const btn = (name) => page.getByRole('button', { name: new RegExp(name, 'i') }).first();

try {
  await page.goto('http://localhost:5199/');
  await page.waitForTimeout(600);
  await shot('01-menu');

  await btn('^New Game$').click();
  await page.waitForTimeout(300);
  await shot('02-class-picker');

  await page.getByText(/Skeleton/i).first().click();
  await page.waitForTimeout(400);
  await shot('03-battle');

  // tap juice: a burst of taps in the middle of the arena
  const arena = page.locator('.arena');
  const box = await arena.boundingBox();
  for (let i = 0; i < 40; i++) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42, { delay: 4 });
  }
  await page.waitForTimeout(120);
  await shot('04-after-taps');

  // drawer snap states — the grab handle cycles peek -> half -> full
  const grab = page.locator('.grab');
  await grab.click();
  await page.waitForTimeout(400);
  await shot('05-drawer-full');
  await grab.click();
  await page.waitForTimeout(400);
  await shot('06-drawer-peek');
  await grab.click();
  await page.waitForTimeout(400);
  await shot('07-drawer-half');

  // Grind to the first boss so there is a real drop to look at.
  let bossShot = false;
  let dropShot = false;
  for (let round = 0; round < 12; round++) {
    const maxBtn = page.getByRole('button', { name: /^Max \(/ }).first();
    if (await maxBtn.isEnabled().catch(() => false)) await maxBtn.click().catch(() => {});
    const b = await arena.boundingBox();
    for (let i = 0; i < 45; i++) await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.45, { delay: 2 });
    if (!bossShot && await page.locator('.boss-badge').count()) {
      bossShot = true;
      await shot('10-boss');
    }
    if (!dropShot && await page.locator('.drop-card').count()) {
      dropShot = true;
      await shot('11-drop');
    }
    if (bossShot && dropShot) break;
  }
  await shot('12-progress');

  for (const tab of ['Hero', 'Skills', 'Army', 'Gear', 'Pets', 'Rebirth']) {
    await page.getByRole('button', { name: new RegExp(`^${tab}$`, 'i') }).first().click();
    await page.waitForTimeout(250);
    await shot(`tab-${tab}`);
  }

  // gear detail: open the newest item
  await page.getByRole('button', { name: /^Gear$/i }).first().click();
  await page.waitForTimeout(200);
  if (await page.locator('.inv-cell').count()) {
    await page.locator('.inv-cell').first().click();
    await page.waitForTimeout(250);
    await shot('13-item-detail');
  }

  // back to the menu, then reload to prove Continue survives a restart
  await page.locator('button[aria-label="Menu"]').click();
  await page.waitForTimeout(300);
  await shot('08-menu-continue');
  await page.reload();
  await page.waitForTimeout(700);
  await btn('^Continue').click();
  await page.waitForTimeout(400);
  await shot('09-continued');

  // reduce-motion pass: everything must still render and time out correctly
  const rm = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  rm.on('pageerror', e => errors.push('pageerror(reduced-motion): ' + e.message));
  await rm.goto('http://localhost:5199/');
  await rm.waitForTimeout(600);
  // a fresh context, so there is no save to continue from
  await rm.getByRole('button', { name: /^New Game$/i }).click();
  await rm.waitForTimeout(250);
  await rm.getByText(/Skeleton/i).first().click();
  await rm.waitForTimeout(400);
  const rb = await rm.locator('.arena').boundingBox();
  for (let i = 0; i < 10; i++) await rm.mouse.click(rb.x + rb.width / 2, rb.y + rb.height * 0.45, { delay: 4 });
  await rm.waitForTimeout(200);
  await rm.screenshot({ path: `${out}/14-reduced-motion.png` });
  await rm.close();

  const text = await page.locator('body').innerText();
  console.log('body sample:', text.slice(0, 300).replace(/\n+/g, ' | '));
} finally {
  console.log('errors:', errors.length ? errors.slice(0, 12) : 'none');
  await browser.close();
  vite.kill();
}
