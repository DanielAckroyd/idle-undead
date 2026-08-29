import type { Effect, Effects } from '../game/types';

export const EFFECT_LABELS: Record<Effect, string> = {
  tapMult: 'tap damage',
  idleMult: 'idle damage',
  armyMult: 'army damage',
  petMult: 'pet damage',
  allMult: 'all damage',
  goldMult: 'gold',
  bossGoldMult: 'boss gold',
  critChance: 'crit chance',
  critMult: 'crit damage',
  bossDmg: 'boss damage',
  offlineHours: 'offline cap',
  offlineMult: 'offline earnings',
  soulsMult: 'souls',
  lifestealGold: 'tap damage as gold',
  combo: 'damage per combo stack',
  comboMax: 'max combo stacks',
  killGrowth: 'damage per kill stack',
  rot: 'max HP/sec rot',
  autoTapRate: 'auto-taps/sec',
  phylactery: 'gold kept on rebirth',
  bossTimer: 'boss timer',
  skipChance: 'stage skip chance',
  petAttackSpeed: 'pet attack speed',
  keepSkillPoints: 'skill points kept',
  startStage: 'starting stage',
};

const FLAT: Partial<Record<Effect, (v: number) => string>> = {
  offlineHours: v => `+${v}h offline cap`,
  bossTimer: v => `+${v}s boss timer`,
  autoTapRate: v => `+${v} auto-taps/sec`,
  comboMax: v => `+${v} max combo stacks`,
  keepSkillPoints: v => `keep ${v} skill point${v === 1 ? '' : 's'}`,
  startStage: v => `start ${v} stages later`,
};

function pct(v: number): string {
  const p = v * 100;
  const rounded = Math.abs(p) < 10 ? Math.round(p * 10) / 10 : Math.round(p);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

/** Human-readable text for one effect at a given magnitude. */
export function effectText(effect: Effect, value: number): string {
  const flat = FLAT[effect];
  if (flat) return flat(value);
  return `${pct(value)} ${EFFECT_LABELS[effect]}`;
}

/** Comma-joined text for a bag of effects. */
export function effectsText(effects: Effects): string {
  const parts: string[] = [];
  for (const key in effects) {
    const e = key as Effect;
    const v = effects[e];
    if (v) parts.push(effectText(e, v));
  }
  return parts.join(', ');
}
