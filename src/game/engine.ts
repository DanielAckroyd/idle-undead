import type { ClassId, Enemy, GameEvent, GameState } from './types';
import { CLASSES } from './data/classes';
import { UNITS } from './data/units';
import { addItem, rollItem } from './items';
import { SOULFIRE_FIRST_ZONE_CLEAR } from './data/products';
import { PETS } from './data/pets';
import { RELICS } from './data/relics';
import { BOSS_EVERY, KILLS_PER_STAGE, enemyGold, enemyMaxHp, factionForStage, isBossStage } from './data/enemies';
import { derive, HERO_COST_BASE, HERO_COST_GROWTH, type Derived } from './stats';
import { geomCost, maxAffordable, rng } from './numbers';

export const SAVE_VERSION = 2;
export const COMBO_DECAY_SECONDS = 1.5;
/** Hard cap: enemy HP overflows Number past ~stage 3500. */
export const STAGE_CAP = 3000;
export const REBIRTH_MIN_STAGE = 20;
export const REBIRTH_MIN_PROGRESS = 10;

export function makeEnemy(stage: number, fightingBoss: boolean, seed: number, bossTime: number): Enemy {
  const f = factionForStage(stage);
  const boss = fightingBoss && isBossStage(stage);
  const r = rng(seed + stage * 7919);
  const name = boss ? f.boss : f.enemies[Math.floor(r() * f.enemies.length)];
  const hp = enemyMaxHp(stage, boss);
  return { name, factionId: f.id, hp, maxHp: hp, isBoss: boss, timer: boss ? bossTime : undefined };
}

export function newGame(seed = Date.now()): GameState {
  const s: GameState = {
    version: SAVE_VERSION, seed,
    classId: null, fusionId: null,
    stage: 1, maxStage: 1, runStartStage: 1, killsThisStage: 0,
    enemy: { name: '', factionId: 'holy', hp: 1, maxHp: 1, isBoss: false },
    fightingBoss: true,
    gold: 0, souls: 0, heroLevel: 0, skillPointsSpent: 0, bankedSkillPoints: 0,
    skills: {}, army: {}, pets: {}, activePet: null, relics: {},
    events: [],
    inventory: [], equipped: { weapon: null, armor: null, crown: null, trinket: null, charm: null }, scrap: 0, lastDrop: null,
    rebirths: 0, totalSouls: 0, soulfire: 0, adsRemoved: false,
    boosts: { goldUntil: 0, damageUntil: 0, offlineDoubleNext: false, adBoostsToday: 0, adBoostDay: 0 },
    claimedDaily: -1, ownedSkins: [], inventoryBonus: 0,
    comboStacks: 0, comboTimer: 0, killStacks: 0, petCooldown: 0, autoTapAcc: 0,
    lastTick: Date.now(),
    stats: { taps: 0, kills: 0, goldEarned: 0, damageDealt: 0, playSeconds: 0 },
    pendingOffline: null,
  };
  s.enemy = makeEnemy(1, true, seed, 30);
  return s;
}

// ---------- helpers ----------

function gain(s: GameState, gold: number) {
  s.gold += gold;
  s.stats.goldEarned += gold;
}

function spawn(s: GameState, d: Derived) {
  s.enemy = makeEnemy(s.stage, s.fightingBoss, s.seed + s.stats.kills, d.bossTime);
}

/** Apply damage; handles kills, gold, stage advance. Returns actual damage dealt. */
const MAX_EVENTS = 64;
export function pushEvent(s: GameState, e: GameEvent) { if (s.events.length < MAX_EVENTS) s.events.push(e); }

export function dealDamage(s: GameState, d: Derived, amount: number, source: 'tap' | 'idle' | 'pet' | 'rot' | 'auto', crit = false): number {
  if (amount <= 0 || s.enemy.hp <= 0) return 0;
  const dmg = Math.min(s.enemy.hp, amount * (s.enemy.isBoss ? d.bossMult : 1) * (s.boosts.damageUntil > s.lastTick ? 2 : 1));
  s.enemy.hp -= dmg;
  s.stats.damageDealt += dmg;
  if (source === 'tap' || source === 'pet' || source === 'auto') pushEvent(s, { t: 'hit', source, dmg, crit });
  if ((source === 'tap' || source === 'auto') && d.effects.lifestealGold) gain(s, dmg * d.effects.lifestealGold * d.goldMult);
  if (s.enemy.hp <= 0) onKill(s, d);
  return dmg;
}

function onKill(s: GameState, d: Derived) {
  const wasBoss = s.enemy.isBoss;
  pushEvent(s, { t: 'kill', name: s.enemy.name, factionId: s.enemy.factionId, isBoss: wasBoss });
  const gold = enemyGold(s.stage, wasBoss) * d.goldMult * (wasBoss ? 1 + (d.effects.bossGoldMult ?? 0) : 1) * (s.boosts.goldUntil > s.lastTick ? 2 : 1);
  gain(s, gold);
  s.stats.kills++;
  s.killStacks++;
  const r = rng(s.seed + s.stats.kills * 31);

  if (wasBoss) {
    addItem(s, rollItem(s.seed + s.stats.kills * 977 + s.stage, s.stage));
    if (s.stage === s.maxStage) { s.soulfire += SOULFIRE_FIRST_ZONE_CLEAR; pushEvent(s, { t: 'soulfire', amount: SOULFIRE_FIRST_ZONE_CLEAR, reason: 'zone' }); }
    advanceStage(s, 1);
  } else {
    s.killsThisStage++;
    if (s.killsThisStage >= KILLS_PER_STAGE) {
      if (isBossStage(s.stage)) {
        // farmed enough on a boss stage: re-enable boss fight
        s.fightingBoss = true;
        s.killsThisStage = 0;
      } else {
        const skip = (d.effects.skipChance ?? 0) > 0 && r() < (d.effects.skipChance ?? 0) && !isBossStage(s.stage + 1);
        advanceStage(s, skip ? 2 : 1);
      }
    }
  }
  spawn(s, d);
}

function advanceStage(s: GameState, by: number) {
  s.stage = Math.min(STAGE_CAP, s.stage + by);
  s.killsThisStage = 0;
  s.killStacks = 0;
  s.fightingBoss = true;
  if (s.stage > s.maxStage) s.maxStage = s.stage;
}

// ---------- actions (all mutate `s` in place; the store clones) ----------

export function chooseClass(s: GameState, id: ClassId) {
  if (s.classId) return;
  s.classId = id;
}

export function tap(s: GameState, d: Derived, roll: number = Math.random()): { dmg: number; crit: boolean } {
  if (!s.classId) return { dmg: 0, crit: false };
  s.stats.taps++;
  if (d.comboMax > 0) {
    s.comboStacks = Math.min(d.comboMax, s.comboStacks + 1);
    s.comboTimer = COMBO_DECAY_SECONDS;
  }
  const crit = roll < d.critChance;
  const dmg = dealDamage(s, d, d.tapDamage * (crit ? d.critMult : 1), 'tap', crit);
  return { dmg, crit };
}

/** Advance simulation by dt seconds (idle DPS, pets, rot, boss timer, combo decay). */
export function tick(s: GameState, dt: number) {
  if (!s.classId || dt <= 0) return;
  let d = derive(s);
  s.stats.playSeconds += dt;

  // combo decay
  if (s.comboStacks > 0) {
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) { s.comboStacks = 0; s.comboTimer = 0; d = derive(s); }
  }

  // auto taps
  if (d.autoTapRate > 0) {
    const r = rng(s.seed + Math.floor(s.stats.playSeconds * 1000));
    s.autoTapAcc += d.autoTapRate * dt;
    while (s.autoTapAcc >= 1) {
      s.autoTapAcc -= 1;
      const crit = r() < d.critChance;
      dealDamage(s, d, d.tapDamage * (crit ? d.critMult : 1), 'auto', crit);
    }
  }

  // army idle dps
  if (d.armyDps > 0) dealDamage(s, d, d.armyDps * dt, 'idle');

  // rot: % of max hp per second (never kills on its own past 1 hp)
  if (d.rot > 0 && s.enemy.hp > 1) {
    dealDamage(s, d, Math.min(s.enemy.hp - 1, s.enemy.maxHp * d.rot * dt), 'rot');
  }

  // pet attacks
  if (s.activePet) {
    const p = PETS.find(p => p.id === s.activePet)!;
    const lvl = s.pets[p.id] ?? 0;
    if (lvl > 0) {
      const interval = p.interval / (1 + (d.effects.petAttackSpeed ?? 0));
      s.petCooldown -= dt;
      while (s.petCooldown <= 0) {
        s.petCooldown += interval;
        const dmg = d.tapDamage * p.dmgMult * lvl * (1 + (d.effects.petMult ?? 0)) * (1 + (d.effects.idleMult ?? 0));
        dealDamage(s, d, dmg, 'pet');
      }
    }
  }

  // boss timer — checked after this slice's damage so a lethal tick still counts
  if (s.enemy.isBoss && s.enemy.timer !== undefined) {
    s.enemy.timer -= dt;
    if (s.enemy.timer <= 0) {
      pushEvent(s, { t: 'bossTimeout', name: s.enemy.name });
      s.fightingBoss = false;
      s.killsThisStage = 0;
      s.enemy = makeEnemy(s.stage, false, s.seed + s.stats.kills, d.bossTime);
    }
  }
}

// --- purchases ---

export function heroCost(s: GameState, count: number): number {
  return geomCost(HERO_COST_BASE, HERO_COST_GROWTH, s.heroLevel, count);
}
export function heroMaxAffordable(s: GameState): number {
  return maxAffordable(HERO_COST_BASE, HERO_COST_GROWTH, s.heroLevel, s.gold);
}
export function buyHero(s: GameState, count: number): boolean {
  const cost = heroCost(s, count);
  if (count <= 0 || s.gold < cost) return false;
  s.gold -= cost;
  s.heroLevel += count;
  return true;
}

export function unitCost(s: GameState, id: string, count: number): number {
  const u = UNITS.find(u => u.id === id)!;
  return geomCost(u.baseCost, u.costGrowth, s.army[id] ?? 0, count);
}
export function unitMaxAffordable(s: GameState, id: string): number {
  const u = UNITS.find(u => u.id === id)!;
  return maxAffordable(u.baseCost, u.costGrowth, s.army[id] ?? 0, s.gold);
}
export function buyUnit(s: GameState, id: string, count: number): boolean {
  const u = UNITS.find(u => u.id === id);
  if (!u || count <= 0 || s.maxStage < u.unlockStage) return false;
  const cost = unitCost(s, id, count);
  if (s.gold < cost) return false;
  s.gold -= cost;
  s.army[id] = (s.army[id] ?? 0) + count;
  return true;
}

export function petCost(s: GameState, id: string): number {
  const p = PETS.find(p => p.id === id)!;
  return geomCost(p.baseCost, p.costGrowth, s.pets[id] ?? 0, 1);
}
export function buyPet(s: GameState, id: string): boolean {
  const p = PETS.find(p => p.id === id);
  if (!p || s.maxStage < p.unlockStage) return false;
  const cost = petCost(s, id);
  if (s.gold < cost) return false;
  s.gold -= cost;
  s.pets[id] = (s.pets[id] ?? 0) + 1;
  if (!s.activePet) s.activePet = id;
  return true;
}
export function setActivePet(s: GameState, id: string) {
  if ((s.pets[id] ?? 0) > 0 && s.activePet !== id) {
    const p = PETS.find(p => p.id === id)!;
    s.activePet = id;
    s.petCooldown = p.interval / (1 + (derive(s).effects.petAttackSpeed ?? 0));
  }
}

// --- skills ---

export function pointsInTier(s: GameState, tier: number): number {
  if (!s.classId) return 0;
  return CLASSES[s.classId].tree.filter(n => n.tier === tier).reduce((a, n) => a + (s.skills[n.id] ?? 0), 0);
}

export function tierUnlocked(s: GameState, tier: 1 | 2 | 3): boolean {
  if (!s.classId) return false;
  const c = CLASSES[s.classId];
  if (tier === 1) return true;
  if (tier === 2) return pointsInTier(s, 1) >= c.tierThreshold[0] && (s.skills[c.tree.find(n => n.tier === 1 && n.capstone)!.id] ?? 0) > 0;
  return pointsInTier(s, 2) >= c.tierThreshold[1] && (s.skills[c.tree.find(n => n.tier === 2 && n.capstone)!.id] ?? 0) > 0;
}

export function canLearn(s: GameState, nodeId: string): { ok: boolean; why?: string } {
  if (!s.classId) return { ok: false, why: 'No class' };
  const c = CLASSES[s.classId];
  const n = c.tree.find(n => n.id === nodeId);
  if (!n) return { ok: false, why: 'Unknown skill' };
  if ((s.skills[nodeId] ?? 0) >= n.maxRank) return { ok: false, why: 'Maxed' };
  if (!tierUnlocked(s, n.tier)) return { ok: false, why: `Tier ${n.tier} locked` };
  if (n.capstone && pointsInTier(s, n.tier) < c.tierThreshold[n.tier - 1]) return { ok: false, why: `Spend ${c.tierThreshold[n.tier - 1]} points in this tier first` };
  for (const req of n.requires ?? []) if ((s.skills[req] ?? 0) === 0) return { ok: false, why: `Requires ${c.tree.find(x => x.id === req)?.name}` };
  if (derive(s).skillPointsAvail <= 0) return { ok: false, why: 'No skill points' };
  return { ok: true };
}

export function learnSkill(s: GameState, nodeId: string): boolean {
  if (!canLearn(s, nodeId).ok) return false;
  s.skills[nodeId] = (s.skills[nodeId] ?? 0) + 1;
  s.skillPointsSpent++;
  return true;
}

// --- rebirth ---

export function soulsOnRebirth(s: GameState): number {
  if (s.maxStage < REBIRTH_MIN_STAGE || s.maxStage < s.runStartStage + REBIRTH_MIN_PROGRESS) return 0;
  const d = derive(s);
  return Math.floor(Math.pow(s.maxStage / 10, 1.6) * (1 + (d.effects.soulsMult ?? 0)));
}

export function canRebirth(s: GameState): boolean {
  return soulsOnRebirth(s) > 0;
}

export function rebirth(s: GameState, fusion: ClassId | null = null): boolean {
  const souls = soulsOnRebirth(s);
  if (souls <= 0) return false;
  const d = derive(s);
  const keptGold = s.gold * (d.effects.phylactery ?? 0);
  const keepSp = Math.min(d.effects.keepSkillPoints ?? 0, d.skillPointsTotal);
  const startStage = 1 + (d.effects.startStage ?? 0);
  const fusionAllowed = (s.relics['r_pact'] ?? 0) > 0 && fusion && fusion !== s.classId;

  s.souls += souls;
  s.totalSouls += souls;
  s.rebirths++;
  s.gold = keptGold;
  s.heroLevel = 0;
  s.skills = {};
  s.skillPointsSpent = 0;
  s.bankedSkillPoints = keepSp;
  s.army = {}; s.pets = {}; s.activePet = null; // inventory, equipped and scrap persist
  s.comboStacks = 0; s.comboTimer = 0; s.killStacks = 0; s.petCooldown = 0; s.autoTapAcc = 0;
  s.stage = startStage; s.maxStage = startStage; s.runStartStage = startStage; s.killsThisStage = 0; s.fightingBoss = true;
  s.fusionId = fusionAllowed ? fusion : null;
  spawn(s, derive(s));
  return true;
}

export function relicCost(s: GameState, id: string): number {
  const r = RELICS.find(r => r.id === id)!;
  return Math.ceil(r.baseCost * Math.pow(r.costGrowth, s.relics[id] ?? 0));
}
export function buyRelic(s: GameState, id: string): boolean {
  const r = RELICS.find(r => r.id === id);
  if (!r) return false;
  if ((s.relics[id] ?? 0) >= r.maxRank) return false;
  if ((r.requiresRebirths ?? 0) > s.rebirths) return false;
  const cost = relicCost(s, id);
  if (s.souls < cost) return false;
  s.souls -= cost;
  s.relics[id] = (s.relics[id] ?? 0) + 1;
  return true;
}

// --- offline ---

/** Grant offline gold based on idle dps versus the current stage's enemies. */
export function applyOffline(s: GameState, nowMs: number) {
  const elapsed = (nowMs - s.lastTick) / 1000;
  s.lastTick = nowMs;
  if (!s.classId || elapsed < 30) return;
  // transient buffs never survive a long absence
  s.comboStacks = 0; s.comboTimer = 0;
  const d = derive(s);
  const capped = Math.min(elapsed, d.offlineHours * 3600);
  if (d.idleDps <= 0) return;
  const hp = enemyMaxHp(s.stage, false);
  const kills = (d.idleDps * capped) / hp;
  let gold = kills * enemyGold(s.stage, false) * d.goldMult * d.offlineMult;
  if (s.boosts.offlineDoubleNext) { gold *= 2; s.boosts.offlineDoubleNext = false; }
  if (gold > 0) {
    gain(s, gold);
    s.pendingOffline = { seconds: capped, gold };
  }
}

export { BOSS_EVERY };
