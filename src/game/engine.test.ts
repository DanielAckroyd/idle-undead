import { describe, it, expect } from 'vitest';
import { newGame, chooseClass, tap, tick, buyUnit, buyPet, setActivePet, learnSkill, canLearn, rebirth, soulsOnRebirth, buyRelic, applyOffline, tierUnlocked, STAGE_CAP } from './engine';
import { serialize, deserialize } from './save';
import { rollItem, addItem, equip, salvage, reforge, activeSets, gearEffects } from './items';
import { INVENTORY_CAP } from './data/items';
import { claimDaily, applyAdBoost, buyShop, grantPurchase } from './premium';
import { AD_BOOSTS_PER_DAY } from './data/products';
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
    expect(canLearn(s, 'sk_knight').ok).toBe(false); // needs 6 points in tier
    expect(learnSkill(s, 'sk_brittle')).toBe(true);
    expect(canLearn(s, 'sk_knight').ok).toBe(true);
    learnSkill(s, 'sk_knight');
    expect(derive(s).tier).toBe(2);
    expect(derive(s).title).toBe('Bone Knight');
    expect(tierUnlocked(s, 2)).toBe(true);
    expect(tierUnlocked(s, 3)).toBe(false);
  });
  it('every class can reach tier 3 within its tree', () => {
    for (const c of Object.values(CLASSES)) {
      for (const tier of [1, 2] as const) {
        const ranks = c.tree.filter(n => n.tier === tier && !n.capstone).reduce((a, n) => a + n.maxRank, 0);
        expect(ranks, `${c.id} tier ${tier} has enough ranks`).toBeGreaterThanOrEqual(c.tierThreshold[tier - 1]);
      }
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

describe('review regressions', () => {
  it('start-stage relic cannot be farmed for souls', () => {
    const s = fresh('skeleton');
    s.maxStage = 40; s.souls = 1000;
    for (let i = 0; i < 4; i++) buyRelic(s, 'r_map');
    rebirth(s);
    expect(s.stage).toBe(21);
    expect(soulsOnRebirth(s)).toBe(0);
    s.maxStage = 31;
    expect(soulsOnRebirth(s)).toBeGreaterThan(0);
  });
  it('lethal damage in the same tick as boss expiry still kills the boss', () => {
    const s = fresh();
    s.gold = 1e9; buyUnit(s, 'zombies', 50); s.stage = 10; s.maxStage = 10;
    s.enemy = { name: 'b', factionId: 'holy', hp: 1, maxHp: 1, isBoss: true, timer: 0.5 };
    tick(s, 1);
    expect(s.stage).toBe(11);
  });
  it('switching pets does not grant a free attack', () => {
    const s = fresh();
    s.pets = { rat: 1, crow: 1 }; s.activePet = 'rat'; s.petCooldown = 2;
    setActivePet(s, 'crow');
    expect(s.petCooldown).toBeGreaterThan(0);
  });
  it('offline ignores combo stacks', () => {
    const s = fresh('ghost');
    s.gold = 1e9; buyUnit(s, 'zombies', 10); buyPet(s, 'rat'); s.gold = 0;
    s.skills = { gh_phase: 5 }; s.comboStacks = 10;
    s.lastTick = Date.now() - 3600 * 1000;
    applyOffline(s, Date.now());
    expect(s.comboStacks).toBe(0);
  });
  it('deserialize repairs corrupt saves', () => {
    const s = fresh();
    const raw = JSON.parse(serialize(s));
    raw.classId = 'dragon'; raw.stats = { taps: 'x' }; raw.gold = null; raw.army = { zombies: 'many', archers: 3 }; raw.stage = 1e9;
    const out = deserialize(JSON.stringify(raw))!;
    expect(out.classId).toBeNull();
    expect(out.stats.taps).toBe(0); expect(out.stats.kills).toBe(0);
    expect(out.gold).toBe(0);
    expect(out.army).toEqual({ archers: 3 });
    expect(out.stage).toBe(STAGE_CAP);
    expect(deserialize('{nope')).toBeNull();
  });
});

describe('items', () => {
  it('bosses drop items; rarity affix counts and scaling hold', () => {
    const s = fresh();
    s.stage = 10; s.maxStage = 10; s.gold = 1e12; buyUnit(s, 'zombies', 100);
    s.enemy = { name: 'b', factionId: 'holy', hp: 1, maxHp: 1, isBoss: true, timer: 30 };
    tick(s, 0.1);
    expect(s.inventory.length).toBe(1);
    expect(s.lastDrop).toBe(s.inventory[0].uid);
    const leg = rollItem(7, 50, 'weapon', 'legendary');
    expect(leg.affixes.length).toBe(4);
    expect(leg.affixes.every(a => a.q >= 0.9)).toBe(true);
    const c1 = rollItem(7, 1, 'weapon', 'common'), c2 = rollItem(7, 81, 'weapon', 'common');
    expect(c2.affixes[0].value).toBeGreaterThanOrEqual(c1.affixes[0].value);
  });
  it('equip applies effects, salvage removes and grants scrap, reforge rerolls', () => {
    const s = fresh();
    const it = rollItem(3, 20, 'weapon', 'rare');
    addItem(s, it); equip(s, it.uid);
    const eff = gearEffects(s);
    expect(Object.keys(eff).length).toBeGreaterThan(0);
    s.scrap = 100;
    const before = JSON.stringify(it.affixes[0]);
    expect(reforge(s, it.uid, 0, 99)).toBe(true);
    expect(s.scrap).toBe(88);
    expect(JSON.stringify(it.affixes[0])).not.toBe(before);
    expect(salvage(s, it.uid)).toBe(true);
    expect(s.equipped.weapon).toBeNull();
    expect(s.scrap).toBe(96);
  });
  it('full inventory auto-salvages; sets need 3 same-essence pieces', () => {
    const s = fresh();
    for (let i = 0; i < INVENTORY_CAP; i++) addItem(s, rollItem(i, 5));
    expect(addItem(s, rollItem(999, 5))).toBe(false);
    expect(s.scrap).toBeGreaterThan(0);
    const t = fresh();
    let n = 0;
    for (let seed = 0; n < 3 && seed < 500; seed++) { const it = rollItem(seed, 30); if (it.essence === 'blood' && !t.equipped[it.slot]) { addItem(t, it); equip(t, it.uid); n++; } }
    expect(activeSets(t)).toEqual(['blood']);
    expect(gearEffects(t).tapMult).toBeGreaterThanOrEqual(1);
  });
  it('inventory survives rebirth and v1 saves migrate', () => {
    const s = fresh(); s.maxStage = 40;
    addItem(s, rollItem(1, 10));
    rebirth(s);
    expect(s.inventory.length).toBe(1);
    const raw = JSON.parse(serialize(s)); raw.version = 1; raw.gear = { rusted_blade: 3 };
    const out = deserialize(JSON.stringify(raw))!;
    expect(out.version).toBe(2);
    expect((out as unknown as { gear?: unknown }).gear).toBeUndefined();
  });
});

describe('premium', () => {
  it('daily claim once per day with streak', () => {
    const s = fresh();
    const day = 86_400_000;
    expect(claimDaily(s, 10 * day + 5)).toBe(10);
    expect(claimDaily(s, 10 * day + 9)).toBe(0);
    expect(claimDaily(s, 11 * day + 1)).toBe(10);
    expect(claimDaily(s, 12 * day + 1)).toBe(15);
    expect(s.soulfire).toBe(35);
  });
  it('ad boosts are capped per day unless ads removed; gold boost doubles drops', () => {
    const s = fresh();
    const now = 1_000_000;
    for (let i = 0; i < AD_BOOSTS_PER_DAY; i++) expect(applyAdBoost(s, 'ad_gold', now)).toBe(true);
    expect(applyAdBoost(s, 'ad_gold', now)).toBe(false);
    s.adsRemoved = true;
    expect(applyAdBoost(s, 'ad_gold', now)).toBe(true);
    s.lastTick = now;
    const g0 = s.gold; s.enemy.hp = 1; tap(s, derive(s), 1);
    const boosted = s.gold - g0;
    const t = fresh(); t.lastTick = now; t.enemy.hp = 1; tap(t, derive(t), 1);
    expect(boosted).toBeCloseTo(t.gold * 2);
  });
  it('shop: time skip needs idle dps, chest pity, skins once, IAP grants', () => {
    const s = fresh();
    s.soulfire = 1000;
    expect(buyShop(s, 'skip_4h', 5).ok).toBe(false);
    s.gold = 1e6; buyUnit(s, 'zombies', 10); s.gold = 0;
    expect(buyShop(s, 'skip_4h', 5).ok).toBe(true);
    expect(s.gold).toBeGreaterThan(0);
    expect(buyShop(s, 'skin_ghost_ember', 5).ok).toBe(true);
    expect(buyShop(s, 'skin_ghost_ember', 5).ok).toBe(false);
    for (let i = 0; i < 5; i++) buyShop(s, 'chest', 100 + i);
    expect(s.inventory.some(i => i.rarity === 'legendary')).toBe(true);
    expect(grantPurchase(s, 'remove_ads', 5)).toBe(true);
    expect(s.adsRemoved).toBe(true);
    expect(grantPurchase(s, 'starter', 5)).toBe(true);
    expect(grantPurchase(s, 'starter', 5)).toBe(false);
  });
});

describe('events', () => {
  it('tap returns applied damage and emits hit/kill events; auto taps are discrete', () => {
    const s = fresh();
    s.enemy = { name: 'b', factionId: 'holy', hp: 1e9, maxHp: 1e9, isBoss: true, timer: 30 };
    s.skills = { sk_death: 5 }; // +200% boss dmg
    const d = derive(s);
    const r = tap(s, d, 1);
    expect(r.dmg).toBeCloseTo(d.tapDamage * 3);
    expect(s.events.at(-1)).toMatchObject({ t: 'hit', source: 'tap', crit: false });
    s.events = [];
    s.enemy.hp = 1; tap(s, d, 1);
    expect(s.events.map(e => e.t).slice(0, 2)).toEqual(['hit', 'kill']);
    const a = fresh(); a.skills = { sk_bonestorm: 3 }; a.enemy.hp = 1e12; a.enemy.maxHp = 1e12;
    tick(a, 1);
    expect(a.events.filter(e => e.t === 'hit' && e.source === 'auto').length).toBe(6);
  });
});

describe('premium fixes', () => {
  it('restore only re-grants non-consumables', () => {
    const s = fresh();
    expect(grantPurchase(s, 'sf_small', 1, true)).toBe(false);
    expect(s.soulfire).toBe(0);
    expect(grantPurchase(s, 'remove_ads', 1, true)).toBe(true);
  });
  it('boss retry re-enters a failed boss', () => {
    const s = fresh(); s.adsRemoved = true;
    s.stage = 10; s.maxStage = 10;
    s.enemy = { name: 'b', factionId: 'holy', hp: 1e9, maxHp: 1e9, isBoss: true, timer: 0.1 };
    tick(s, 1);
    expect(s.fightingBoss).toBe(false);
    expect(applyAdBoost(s, 'ad_boss', 5)).toBe(true);
    expect(s.enemy.isBoss).toBe(true);
    const t = fresh(); t.adsRemoved = true;
    expect(applyAdBoost(t, 'ad_boss', 5)).toBe(false);
  });
});
