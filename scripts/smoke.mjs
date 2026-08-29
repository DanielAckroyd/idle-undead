// Headless smoke test: pick a class, tap, buy, screenshot each tab. Usage: node scripts/smoke.mjs <outdir>
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const out = process.argv[2] ?? '.';
const vite = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
try {
  await page.goto('http://localhost:5199/');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/01-picker.png` });
  await page.getByText(/Skeleton/i).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/02-battle.png` });
  // tap a lot
  const enemy = page.locator('[class*=enemy], [class*=tap]').first();
  for (let i = 0; i < 40; i++) await enemy.click({ delay: 5 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/03-after-taps.png` });
  for (const tab of ['Hero', 'Skills', 'Army', 'Gear', 'Pets', 'Rebirth']) {
    await page.getByRole('button', { name: new RegExp(`^${tab}$`, 'i') }).first().click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/tab-${tab}.png` });
  }
  const text = await page.locator('body').innerText();
  console.log('body sample:', text.slice(0, 300).replace(/\n+/g, ' | '));
} finally {
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
  vite.kill();
}
