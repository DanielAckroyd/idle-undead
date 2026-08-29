// Greedy-bot balance sim: taps 5/s, buys best-value upgrades, learns skills. Prints stage over time.
import { newGame, chooseClass, tap, tick, buyHero, buyUnit, buyGear, buyPet, learnSkill, heroCost, unitCost, gearCost, petCost, soulsOnRebirth, rebirth, buyRelic, makeEnemy } from '../src/game/engine';
import { derive, unitDps } from '../src/game/stats';
import { UNITS } from '../src/game/data/units';
import { GEAR } from '../src/game/data/gear';
import { PETS } from '../src/game/data/pets';
import { CLASSES } from '../src/game/data/classes';
import { fmt } from '../src/game/numbers';
import type { ClassId } from '../src/game/types';

const cls = (process.argv[2] ?? 'skeleton') as ClassId;
const hours = Number(process.argv[3] ?? 2);
const tapsPerSec = Number(process.argv[4] ?? 5);
const s = newGame(1); chooseClass(s, cls);

function shop() {
  // greedy: buy whichever gives most damage per gold among hero, units, gear, pets
  for (let i = 0; i < 20; i++) {
    const d = derive(s);
    let best: { v: number; f: () => boolean } | null = null;
    const consider = (v: number, f: () => boolean) => { if (!best || v > best.v) best = { v, f }; };
    const c = heroCost(s, 1); if (c <= s.gold) consider(d.tapDamage * tapsPerSec * 0.1 / c, () => buyHero(s, 1));
    for (const u of UNITS) if (s.maxStage >= u.unlockStage) { const c = unitCost(s, u.id, 1); if (c <= s.gold) consider((unitDps(u.id, (s.army[u.id] ?? 0) + 1) - unitDps(u.id, s.army[u.id] ?? 0)) / c, () => buyUnit(s, u.id, 1)); }
    for (const g of GEAR) if (s.maxStage >= g.unlockStage) { const c = gearCost(s, g.id); if (c <= s.gold) consider((d.tapDamage * tapsPerSec + d.idleDps) * 0.08 / c, () => buyGear(s, g.id)); }
    for (const p of PETS) if (s.maxStage >= p.unlockStage) { const c = petCost(s, p.id); if (c <= s.gold) consider(d.tapDamage * p.dmgMult / p.interval / c, () => buyPet(s, p.id)); }
    if (!best) break;
    (best as { f: () => boolean }).f();
  }
  const tree = CLASSES[cls].tree;
  for (const n of tree.filter(n => n.capstone)) learnSkill(s, n.id);
  for (const n of tree) learnSkill(s, n.id);
}

let t = 0; const total = hours * 3600; let lastPrint = -600;
while (t < total) {
  const d = derive(s);
  for (let i = 0; i < tapsPerSec; i++) tap(s, d, Math.random());
  tick(s, 1); t++;
  if (t % 5 === 0) shop();
  if (s.maxStage % 10 === 0 && !s.fightingBoss && s.killsThisStage === 0) { s.fightingBoss = true; s.enemy = makeEnemy(s.stage, true, s.seed, d.bossTime); }
  if (t - lastPrint >= 600) { lastPrint = t; console.log(`${(t/60).toFixed(0).padStart(4)}m stage ${s.stage} (max ${s.maxStage}) ${derive(s).title} hero ${s.heroLevel} gold ${fmt(s.gold)} tap ${fmt(d.tapDamage)} idle ${fmt(d.idleDps)} souls@rb ${soulsOnRebirth(s)}`); }
}
console.log('army', JSON.stringify(s.army), 'gear', JSON.stringify(s.gear), 'pets', JSON.stringify(s.pets), 'effects', JSON.stringify(derive(s).effects));
if (soulsOnRebirth(s) > 0) { rebirth(s); for (let i = 0; i < 10; i++) buyRelic(s, 'r_bone'); console.log('after rebirth: souls', s.souls, 'allMult', derive(s).effects.allMult); }
