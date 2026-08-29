/**
 * Skill-node presentation rules, kept out of the component file so the graph can
 * stay a pure component module (and so the detail sheet can ask for the same
 * state the graph paints).
 */
import type { Effect, GameState, SkillNode } from '../game/types';
import { canLearn } from '../game/engine';

export type NodeState = 'locked' | 'available' | 'ranked' | 'maxed';

export function nodeState(s: GameState, node: SkillNode): NodeState {
  const rank = s.skills[node.id] ?? 0;
  if (rank >= node.maxRank) return 'maxed';
  if (rank > 0) return 'ranked';
  return canLearn(s, node.id).ok ? 'available' : 'locked';
}

// ---------- glyphs ----------

export type Glyph = 'blade' | 'horde' | 'paw' | 'coin' | 'skull' | 'glass' | 'moon' | 'soul' | 'rot' | 'skip';

/** Which emblem stands for a node, taken from its first (primary) effect. */
const GLYPH_FOR: Partial<Record<Effect, Glyph>> = {
  tapMult: 'blade', critChance: 'blade', critMult: 'blade', combo: 'blade', comboMax: 'blade', autoTapRate: 'blade',
  armyMult: 'horde', idleMult: 'horde', allMult: 'horde',
  petMult: 'paw', petAttackSpeed: 'paw',
  goldMult: 'coin', bossGoldMult: 'coin', lifestealGold: 'coin',
  bossDmg: 'skull',
  bossTimer: 'glass',
  offlineHours: 'moon', offlineMult: 'moon',
  soulsMult: 'soul', phylactery: 'soul', keepSkillPoints: 'soul', startStage: 'soul',
  rot: 'rot', killGrowth: 'rot',
  skipChance: 'skip',
};

export function glyphFor(node: SkillNode): Glyph {
  for (const key in node.perRank) {
    const g = GLYPH_FOR[key as Effect];
    if (g) return g;
  }
  return 'blade';
}

export const GLYPH_PATHS: Record<Glyph, string[]> = {
  blade: ['M12 1.5l3.2 7.4-3.2 3.4-3.2-3.4z', 'M10.9 13h2.2v6h-2.2z', 'M8.6 19h6.8v2.4H8.6z'],
  horde: ['M3.5 6.2 12 10.4l8.5-4.2v3.1L12 13.6 3.5 9.3z', 'M3.5 13.2 12 17.4l8.5-4.2v3.1L12 20.6l-8.5-4.3z'],
  paw: ['M12 10.2c3.4 0 5.9 2.6 5.9 5.1 0 2-1.7 3.3-3.5 2.9a10 10 0 0 0-4.8 0c-1.8.4-3.5-.9-3.5-2.9 0-2.5 2.5-5.1 5.9-5.1z'],
  coin: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 2.6a6.4 6.4 0 1 1 0 12.8 6.4 6.4 0 0 1 0-12.8z', 'M12 8.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2z'],
  skull: ['M12 2.4c-5 0-8.6 3.4-8.6 7.8 0 2.6 1.3 4.3 2.6 5.4v2.6c0 1 .8 1.8 1.8 1.8h.9v1.2a1 1 0 0 0 2 0v-1.2h2.6v1.2a1 1 0 0 0 2 0v-1.2h.9c1 0 1.8-.8 1.8-1.8v-2.6c1.3-1.1 2.6-2.8 2.6-5.4 0-4.4-3.6-7.8-8.6-7.8z'],
  glass: ['M5.6 2.6h12.8v3.2L13.6 12l4.8 6.2v3.2H5.6v-3.2L10.4 12 5.6 5.8z'],
  moon: ['M15.9 2.6A9.4 9.4 0 1 0 21.4 14 7.6 7.6 0 0 1 15.9 2.6z'],
  soul: ['M12 1.6 14.5 9.2 22 12l-7.5 2.8L12 22.4 9.5 14.8 2 12l7.5-2.8z'],
  rot: ['M12 2.2s5.8 6.3 5.8 10.1A5.8 5.8 0 1 1 6.2 12.3C6.2 8.5 12 2.2 12 2.2z'],
  skip: ['M4.4 4.4 11.8 12l-7.4 7.6z', 'M12.6 4.4 20 12l-7.4 7.6z'],
};
