import type { ClassId, Effect, Effects, GameState } from './types';
import { CLASSES } from './data/classes';
import { UNITS, unitMilestoneMult } from './data/units';
import { GEAR } from './data/gear';
import { PETS } from './data/pets';
import { RELICS } from './data/relics';
import { BOSS_TIME } from './data/enemies';

export const BASE_OFFLINE_HOURS = 8;
export const HERO_COST_BASE = 10;
export const HERO_COST_GROWTH = 1.07;

function add(into: Effects, from: Effects, scale = 1) {
  for (const k in from) {
    const key = k as Effect;
    into[key] = (into[key] ?? 0) + (from[key] ?? 0) * scale;
  }
}

/** Sum every effect from class innate, skills, fusion, gear, pets (passive) and relics. */
export function collectEffects(s: GameState): Effects {
  const e: Effects = {};
  if (s.classId) {
    const c = CLASSES[s.classId];
    add(e, c.innate);
    for (const node of c.tree) {
      const r = s.skills[node.id] ?? 0;
      if (r > 0) add(e, node.perRank, r);
    }
  }
  if (s.fusionId) {
    const f = CLASSES[s.fusionId];
    add(e, f.innate, 0.5);
    for (const node of f.tree) if (node.tier === 1 && !node.capstone) add(e, node.perRank, node.maxRank * 0.5);
  }
  for (const g of GEAR) {
    const lvl = s.gear[g.id] ?? 0;
    if (lvl > 0) e[g.effect] = (e[g.effect] ?? 0) + g.base + g.perLevel * (lvl - 1);
  }
  for (const p of PETS) {
    const lvl = s.pets[p.id] ?? 0;
    if (lvl > 0) add(e, p.passive, lvl);
  }
  for (const r of RELICS) {
    const rank = s.relics[r.id] ?? 0;
    if (rank > 0) add(e, r.perRank, rank);
  }
  return e;
}

export interface Derived {
  effects: Effects;
  tapDamage: number;      // per tap, pre-crit
  critChance: number;
  critMult: number;
  armyDps: number;
  petDps: number;         // average dps of active pet
  idleDps: number;        // armyDps + petDps
  bossMult: number;
  goldMult: number;
  offlineHours: number;
  offlineMult: number;
  comboMax: number;
  comboPerStack: number;
  killGrowth: number;
  rot: number;
  autoTapRate: number;
  bossTime: number;
  skillPointsTotal: number;
  skillPointsAvail: number;
  tier: 1 | 2 | 3;
  title: string;
}

export function heroTapBase(classId: ClassId | null, heroLevel: number): number {
  const base = classId ? CLASSES[classId].baseTap : 5;
  // linear early, then gently exponential to keep pace with 1.18^stage enemies
  return base * (1 + heroLevel * 1.5) * Math.pow(1.04, heroLevel);
}

export function unitDps(id: string, level: number): number {
  const u = UNITS.find(u => u.id === id);
  if (!u || level <= 0) return 0;
  return u.baseDps * level * unitMilestoneMult(level) * Math.pow(1.03, level);
}

export function classTier(s: GameState): 1 | 2 | 3 {
  if (!s.classId) return 1;
  const c = CLASSES[s.classId];
  const caps = c.tree.filter(n => n.capstone).map(n => (s.skills[n.id] ?? 0) > 0);
  if (caps[1]) return 3;
  if (caps[0]) return 2;
  return 1;
}

export function skillPointsTotal(s: GameState): number {
  return Math.floor(s.heroLevel / 10) + Math.floor(s.maxStage / 10) + (s.bankedSkillPoints ?? 0);
}

export function derive(s: GameState): Derived {
  const e = collectEffects(s);
  const all = 1 + (e.allMult ?? 0);
  const killMult = 1 + (e.killGrowth ?? 0) * s.killStacks;
  const comboPerStack = e.combo ?? 0;
  const comboMax = e.comboMax ?? 0;
  const comboMult = 1 + comboPerStack * Math.min(s.comboStacks, comboMax);

  const tapDamage = heroTapBase(s.classId, s.heroLevel) * (1 + (e.tapMult ?? 0)) * all * killMult * comboMult;
  const armyRaw = UNITS.reduce((sum, u) => sum + unitDps(u.id, s.army[u.id] ?? 0), 0);
  const armyDps = armyRaw * (1 + (e.armyMult ?? 0)) * (1 + (e.idleMult ?? 0)) * all * killMult;
  let petDps = 0;
  if (s.activePet) {
    const p = PETS.find(p => p.id === s.activePet)!;
    const lvl = s.pets[p.id] ?? 0;
    const interval = p.interval / (1 + (e.petAttackSpeed ?? 0));
    petDps = (tapDamage * p.dmgMult * lvl * (1 + (e.petMult ?? 0)) * (1 + (e.idleMult ?? 0))) / interval;
  }
  const tier = classTier(s);
  const spTotal = skillPointsTotal(s);
  const title = s.classId
    ? (s.fusionId ? `${CLASSES[s.classId].tierNames[tier - 1]} (${s.fusionId})` : CLASSES[s.classId].tierNames[tier - 1])
    : 'Wanderer';
  return {
    effects: e,
    tapDamage,
    critChance: Math.min(0.75, e.critChance ?? 0),
    critMult: 2 + (e.critMult ?? 0),
    armyDps,
    petDps,
    idleDps: armyDps + petDps,
    bossMult: 1 + (e.bossDmg ?? 0),
    goldMult: (1 + (e.goldMult ?? 0)),
    offlineHours: BASE_OFFLINE_HOURS + (e.offlineHours ?? 0),
    offlineMult: 1 + (e.offlineMult ?? 0),
    comboMax,
    comboPerStack,
    killGrowth: e.killGrowth ?? 0,
    rot: e.rot ?? 0,
    autoTapRate: e.autoTapRate ?? 0,
    bossTime: BOSS_TIME + (e.bossTimer ?? 0),
    skillPointsTotal: spTotal,
    skillPointsAvail: spTotal - s.skillPointsSpent,
    tier,
    title,
  };
}
