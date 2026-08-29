// Headless smoke test of the whole flow: main menu -> new game -> class -> battle,
// tap juice, every drawer snap state, every tab, the skill graph and the shop.
// Also re-checks the arena layout on a small phone. Usage: node scripts/smoke.mjs <outdir>
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

// The dev FakeStore asks for confirmation via window.confirm; Playwright dismisses
// dialogs by default, which would make every purchase path a no-op.
page.on('dialog', d => d.accept().catch(() => {}));

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

  for (const tab of ['Hero', 'Skills', 'Army', 'Gear', 'Pets', 'Shop', 'Rebirth']) {
    await page.getByRole('button', { name: new RegExp(`^${tab}$`, 'i') }).first().click();
    await page.waitForTimeout(250);
    await shot(`tab-${tab}`);
  }

  // --- skill graph: open, learn, inspect, zoom ---
  await page.getByRole('button', { name: /^Skills$/i }).first().click();
  await page.waitForTimeout(400);
  if (!(await page.locator('.graph-canvas').count())) errors.push('skills: graph did not render');
  await shot('15-skills-graph');

  for (let i = 0; i < 6; i++) {
    const node = page.locator('.node-available').first();
    if (!(await node.count())) break;
    await node.click();
    await page.waitForTimeout(160);
    const learn = page.locator('.btn.learn:not([disabled])').first();
    if (!(await learn.count())) break;
    await learn.click();
    await page.waitForTimeout(140);
  }
  await shot('16-skills-learned');

  // the capstone sheet: an evolution preview plus its "N points to evolve" gate
  const capstone = page.locator('.node-capstone').first();
  if (await capstone.count()) {
    await capstone.click();
    await page.waitForTimeout(250);
    await shot('17-skills-capstone');
  }

  // pan + zoom
  await page.getByRole('button', { name: /Zoom out/i }).click();
  await page.getByRole('button', { name: /Zoom out/i }).click();
  await page.waitForTimeout(250);
  await shot('18-skills-zoomed-out');
  const gv = await page.locator('.graph-viewport').boundingBox();
  await page.mouse.move(gv.x + gv.width / 2, gv.y + gv.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(gv.x + gv.width / 2, gv.y + gv.height * 0.25, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  await shot('19-skills-panned');

  // --- shop: daily, ad boost, soulfire purchase, IAP, restore ---
  await page.getByRole('button', { name: /^Shop$/i }).first().click();
  await page.waitForTimeout(300);
  await shot('20-shop-top');

  // the button's accessible name includes its reward chip ("Claim +10 ✧")
  const claim = page.locator('.shop-daily .btn:not([disabled])').first();
  if (await claim.count()) {
    await claim.click();
    await page.waitForTimeout(300);
    await shot('21-shop-daily-claimed');
  }

  // 2x Gold: dev store confirms the "ad", then the boost chip appears in the HUD
  const boost = page.locator('.boost-card:not([disabled])').first();
  if (await boost.count()) {
    await boost.click();
    await page.waitForTimeout(400);
    await shot('22-shop-boost');
    if (!(await page.locator('.chip.boost').count())) errors.push('shop: ad boost did not reach the HUD chips');
  }

  // buy soulfire with real money, then spend it in the soulfire shop
  const pack = page.getByRole('button', { name: /^\$1\.99$/ }).first();
  if (await pack.count()) {
    await pack.click();
    await page.waitForTimeout(400);
  }
  await page.locator('.shop-card.chest .btn').first().click().catch(() => {});
  await page.waitForTimeout(350);
  await shot('23-shop-purchased');

  await page.getByRole('button', { name: /Restore purchases/i }).click();
  await page.waitForTimeout(350);
  await page.locator('.tabbody').evaluate(el => { el.scrollTop = el.scrollHeight; }).catch(() => {});
  await page.waitForTimeout(150);
  await shot('24-shop-packs');

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

  // small-phone pass: the arena must stay legible at 360x640 with the drawer half
  // open — the sprite anchored to its ground line, bands clear of the art.
  const sm = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  sm.on('pageerror', e => errors.push('pageerror(360): ' + e.message));
  await sm.goto('http://localhost:5199/');
  await sm.waitForTimeout(600);
  // a fresh context, so there is no save to continue from
  await sm.getByRole('button', { name: /^New Game$/i }).click();
  await sm.waitForTimeout(250);
  await sm.getByText(/Skeleton/i).first().click();
  await sm.waitForTimeout(400);
  const smb = await sm.locator('.arena').boundingBox();
  for (let i = 0; i < 30; i++) await sm.mouse.click(smb.x + smb.width / 2, smb.y + smb.height * 0.45, { delay: 2 });
  await sm.waitForTimeout(300);
  await sm.screenshot({ path: `${out}/25-small-arena.png` });
  await sm.getByRole('button', { name: /^Skills$/i }).first().click();
  await sm.waitForTimeout(400);
  await sm.screenshot({ path: `${out}/26-small-skills.png` });
  await sm.getByRole('button', { name: /^Shop$/i }).first().click();
  await sm.waitForTimeout(400);
  await sm.screenshot({ path: `${out}/27-small-shop.png` });
  await sm.close();

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
