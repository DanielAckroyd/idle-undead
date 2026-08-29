import type { GameState } from './types';
import { makeEnemy, newGame, SAVE_VERSION, STAGE_CAP } from './engine';
import { CLASSES } from './data/classes';
import { PETS } from './data/pets';

const KEY = 'idle-undead-save';

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export function deserialize(json: string): GameState | null {
  try {
    const raw = JSON.parse(json) as Partial<GameState>;
    if (!raw || typeof raw !== 'object' || typeof raw.version !== 'number' || raw.version > SAVE_VERSION) return null;
    if (raw.version < 2) { delete (raw as Record<string, unknown>).gear; raw.version = 2; }
    const base = newGame(typeof raw.seed === 'number' ? raw.seed : Date.now());
    const s: GameState = { ...base, ...raw, enemy: { ...base.enemy, ...(raw.enemy ?? {}) }, stats: { ...base.stats, ...(raw.stats ?? {}) } };
    // reject unknown ids, coerce non-finite numbers
    if (s.classId !== null && !(s.classId in CLASSES)) s.classId = null;
    if (s.fusionId !== null && !(s.fusionId in CLASSES)) s.fusionId = null;
    if (s.activePet !== null && !PETS.some(p => p.id === s.activePet)) s.activePet = null;
    for (const rec of [s.skills, s.army, s.pets, s.relics] as Record<string, unknown>[]) {
      if (typeof rec !== 'object' || rec === null) continue;
      for (const k in rec) if (typeof rec[k] !== 'number' || !Number.isFinite(rec[k])) delete rec[k];
    }
    if (!Array.isArray(s.inventory)) s.inventory = [];
    s.inventory = s.inventory.filter(i => i && typeof i.uid === 'string' && Array.isArray(i.affixes));
    if (typeof s.equipped !== 'object' || s.equipped === null) s.equipped = { ...base.equipped };
    for (const k of Object.keys(base.equipped) as (keyof typeof base.equipped)[]) if (s.equipped[k] && !s.inventory.some(i => i.uid === s.equipped[k])) s.equipped[k] = null;
    const numKeys = ['stage', 'maxStage', 'runStartStage', 'killsThisStage', 'gold', 'souls', 'heroLevel', 'skillPointsSpent', 'bankedSkillPoints', 'rebirths', 'totalSouls', 'comboStacks', 'comboTimer', 'killStacks', 'petCooldown', 'lastTick', 'scrap'] as const;
    for (const k of numKeys) if (!Number.isFinite(s[k])) (s as unknown as Record<string, number>)[k] = base[k];
    for (const k of Object.keys(base.stats) as (keyof GameState['stats'])[]) if (!Number.isFinite(s.stats[k])) s.stats[k] = 0;
    if (!Number.isFinite(s.enemy.hp) || !Number.isFinite(s.enemy.maxHp) || s.enemy.maxHp <= 0) s.enemy = makeEnemy(s.stage, s.fightingBoss, s.seed, 30);
    s.stage = Math.max(1, Math.min(STAGE_CAP, s.stage));
    s.maxStage = Math.max(s.stage, Math.min(STAGE_CAP, s.maxStage));
    return s;
  } catch {
    return null;
  }
}

export function loadSave(): GameState | null {
  try {
    const json = globalThis.localStorage?.getItem(KEY);
    return json ? deserialize(json) : null;
  } catch { return null; }
}

export function writeSave(s: GameState) {
  try { globalThis.localStorage?.setItem(KEY, serialize(s)); } catch { /* ignore */ }
}

export function clearSave() {
  try { globalThis.localStorage?.removeItem(KEY); } catch { /* ignore */ }
}
