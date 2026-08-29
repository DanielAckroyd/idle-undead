import type { PetDef } from '../types';

export const PETS: PetDef[] = [
  { id: 'rat', name: 'Plague Rat', desc: 'Nibbles. Passive: +5% gold/level.', interval: 3, dmgMult: 2, passive: { goldMult: 0.03 }, baseCost: 500, costGrowth: 1.35, unlockStage: 3 },
  { id: 'crow', name: 'Carrion Crow', desc: 'Pecks eyes. Passive: +8% tap/level.', interval: 2.5, dmgMult: 1.5, passive: { tapMult: 0.05 }, baseCost: 5_000, costGrowth: 1.35, unlockStage: 12 },
  { id: 'hound', name: 'Barghest', desc: 'Black hound of omen. Passive: +10% army/level.', interval: 4, dmgMult: 6, passive: { armyMult: 0.06 }, baseCost: 80_000, costGrowth: 1.35, unlockStage: 22 },
  { id: 'wisp', name: 'Grave Wisp', desc: 'Flickers. Passive: +1% crit chance/level.', interval: 2, dmgMult: 1.2, passive: { critChance: 0.005 }, baseCost: 1.5e6, costGrowth: 1.35, unlockStage: 38 },
  { id: 'hydra', name: 'Bone Hydra', desc: 'Three skulls. Passive: +15% boss dmg/level.', interval: 5, dmgMult: 15, passive: { bossDmg: 0.1 }, baseCost: 5e7, costGrowth: 1.35, unlockStage: 55 },
];
