import { describe, it, expect } from 'vitest';
import { newGame, chooseClass, tap, tick, buyHero, buyUnit, learnSkill, canLearn, rebirth, soulsOnRebirth, buyRelic, applyOffline, tierUnlocked } from './engine';
import { derive } from './stats';
import { fmt, geomCost, maxAffordable } from './numbers';
import { CLASSES } from './data/classes';
import { enemyMaxHp } from './data/enemies';

function fresh(cls: 'skeleton' | 'ghost' | 'vampire' | 'ghoul' = 'skeleton') {
  const s = newGame(42);
  chooseClass(s, cls);
  return s;
}

describe('numbers', () => {
  it('formats', () => {
    expect(fmt(5)).toBe('5');
    expect(fmt(999)).toBe('999');
    expect(fmt(1234)).toBe('1.23K');
    expect(fmt(1.5e9)).toBe('1.50B');
    expect(fmt(2e15)).toBe('2.00aa');
    expect(fmt(3e18)).toBe('3.00ab');
  });
  it('geomCost matches loop and maxAffordable is consistent', () => {
    const c = geomCost(10, 1.07, 3, 4);
    let sum = 0; for (let i = 3; i < 7; i++) sum += 10 * 1.07 ** i;
    expect(c).toBeCloseTo(sum, 6);
    const n = maxAffordable(10, 1.07, 0, 100);
    expect(geomCost(10, 1.07, 0, n)).toBeLessThanOrEqual(100);
    expect(geomCost(10, 1.07, 0, n + 1)).toBeGreaterThan(100);
  });
});

describe('combat', () => {
  it('tap kills and advances stage after 5 kills', () => {
    const s = fresh();
    const d = derive(s);
    let guard = 0;
    while (s.stage === 1 && guard++ < 10000) tap(s, derive(s), 1);
    expect(s.stage).toBe(2);
    expect(s.gold).toBeGreaterThan(0);
    expect(s.stats.kills).toBe(5);
    expect(d.tapDamage).toBeGreaterThan(0);
  });
  it('boss timer expiry drops to farming mode, then re-fights boss', () => {
    const s = fresh();
    s.stage = 10; s.maxStage = 10;
    s.enemy = { name: 'b', factionId: 'holy', hp: 1e9, maxHp: 1e9, isBoss: true, timer: 1 };
    tick(s, 2);
    expect(s.fightingBoss).toBe(false);
    expect(s.enemy.isBoss).toBe(false);
    // kill 5 farm enemies -> boss returns
    for (let i = 0; i < 5; i++) { s.enemy.hp = 1; tap(s, derive(s), 1); }
    expect(s.fightingBoss).toBe(true);
    expect(s.enemy.isBoss).toBe(true);
    expect(s.stage).toBe(10);
  });
  it('idle dps from army does damage over ticks', () => {
    const s = fresh();
    s.gold = 1e6;
    expect(buyUnit(s, 'zombies', 10)).toBe(true);
    const before = s.stats.damageDealt;
    tick(s, 1);
    expect(s.stats.damageDealt).toBeGreaterThan(before);
  });
  it('crit uses roll', () => {
    const s = fresh();
    s.gold = 1e9; s.heroLevel = 50;
    learnSkill(s, 'sk_brittle');
    const d = derive(s);
    expect(tap(s, d, 0).crit).toBe(true);
    expect(tap(s, d, 0.99).crit).toBe(false);
  });
});

describe('skills & evolution', () => {
  it('gates tiers behind thresholds and capstones', () => {
    const s = fresh();
    s.heroLevel = 200; // 20 points + 0 stage points
    expect(tierUnlocked(s, 2)).toBe(false);
    expect(canLearn(s, 'sk_knight').ok).toBe(false);
    for (let i = 0; i < 5; i++) expect(learnSkill(s, 'sk_marrow')).toBe(true);
    expect(learnSkill(s, 'sk_marrow')).toBe(false); // maxed
    expect(canLearn(s, 'sk_knight').ok).toBe(true);
    learnSkill(s, 'sk_knight');
    expect(derive(s).tier).toBe(2);
    expect(derive(s).title).toBe('Bone Knight');
    expect(tierUnlocked(s, 2)).toBe(true);
    expect(tierUnlocked(s, 3)).toBe(false);
  });
  it('every class can reach tier 3 within its tree', () => {
    for (const c of Object.values(CLASSES)) {
      const s = fresh(c.id);
      s.heroLevel = 1000;
      const order = c.tree.filter(n => !n.capstone && n.tier < 3).concat(c.tree.filter(n => n.capstone));
      // learn everything possible, repeatedly, until tier 3
      for (let pass = 0; pass < 10; pass++) for (const n of order) while (learnSkill(s, n.id)) { /* */ }
      expect(derive(s).tier, c.id).toBe(3);
      expect(derive(s).title).toBe(c.tierNames[2]);
    }
  });
});

describe('rebirth', () => {
  it('needs stage 20, grants souls, resets progress, keeps relics', () => {
    const s = fresh('vampire');
    expect(soulsOnRebirth(s)).toBe(0);
    s.maxStage = 40; s.gold = 1000; s.heroLevel = 30; s.army.zombies = 5;
    const souls = soulsOnRebirth(s);
    expect(souls).toBeGreaterThan(0);
    expect(rebirth(s)).toBe(true);
    expect(s.souls).toBe(souls);
    expect(s.stage).toBe(1); expect(s.heroLevel).toBe(0); expect(s.army.zombies).toBeUndefined();
    expect(buyRelic(s, 'r_bone')).toBe(true);
    expect(derive(s).effects.allMult).toBeCloseTo(0.25);
  });
  it('lich phylactery keeps gold', () => {
    const s = fresh('skeleton');
    s.maxStage = 40; s.gold = 1000;
    s.skills = { sk_marrow: 5, sk_knight: 1, sk_legion: 5, sk_lich: 1 };
    rebirth(s);
    expect(s.gold).toBeCloseTo(100);
  });
  it('fusion requires Grave Pact', () => {
    const s = fresh('skeleton');
    s.maxStage = 40;
    rebirth(s, 'vampire');
    expect(s.fusionId).toBeNull();
    s.rebirths = 2; s.souls = 100;
    expect(buyRelic(s, 'r_pact')).toBe(true);
    s.maxStage = 40;
    rebirth(s, 'vampire');
    expect(s.fusionId).toBe('vampire');
    expect(derive(s).effects.goldMult).toBeGreaterThan(0.2); // fused innate half + t1 nodes
  });
});

describe('offline', () => {
  it('grants capped gold', () => {
    const s = fresh('ghost');
    s.gold = 1e6; buyUnit(s, 'zombies', 20); s.gold = 0;
    s.lastTick = Date.now() - 100 * 3600 * 1000;
    applyOffline(s, Date.now());
    expect(s.pendingOffline).not.toBeNull();
    expect(s.pendingOffline!.seconds).toBe(derive(s).offlineHours * 3600);
    expect(s.gold).toBeGreaterThan(0);
  });
});

describe('balance sanity', () => {
  it('enemy hp grows but stays finite to stage 500', () => {
    expect(enemyMaxHp(500, true)).toBeLessThan(Infinity);
    expect(enemyMaxHp(50, false)).toBeGreaterThan(enemyMaxHp(49, false));
  });
});
