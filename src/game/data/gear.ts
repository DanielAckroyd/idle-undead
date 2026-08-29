import type { GearDef } from '../types';

export const GEAR: GearDef[] = [
  { id: 'rusted_blade', slot: 'weapon', name: 'Rusted Grave-Blade', effect: 'tapMult', base: 0.1, perLevel: 0.1, baseCost: 150, costGrowth: 1.3, unlockStage: 1 },
  { id: 'bone_plate', slot: 'armor', name: 'Bone Plate', effect: 'armyMult', base: 0.1, perLevel: 0.1, baseCost: 400, costGrowth: 1.3, unlockStage: 5 },
  { id: 'coin_purse', slot: 'trinket', name: 'Miser\'s Purse', effect: 'goldMult', base: 0.05, perLevel: 0.05, baseCost: 800, costGrowth: 1.3, unlockStage: 10 },
  { id: 'iron_crown', slot: 'crown', name: 'Crown of the Barrow', effect: 'allMult', base: 0.05, perLevel: 0.05, baseCost: 5_000, costGrowth: 1.3, unlockStage: 20 },
  { id: 'soul_edge', slot: 'weapon', name: 'Soul-Edge', effect: 'critChance', base: 0.02, perLevel: 0.01, baseCost: 50_000, costGrowth: 1.3, unlockStage: 30 },
  { id: 'shroud', slot: 'armor', name: 'Wraith Shroud', effect: 'idleMult', base: 0.15, perLevel: 0.15, baseCost: 200_000, costGrowth: 1.3, unlockStage: 35 },
  { id: 'fang_amulet', slot: 'trinket', name: 'Fang Amulet', effect: 'petMult', base: 0.2, perLevel: 0.2, baseCost: 1e6, costGrowth: 1.3, unlockStage: 45 },
  { id: 'lich_crown', slot: 'crown', name: 'Lich\'s Diadem', effect: 'bossDmg', base: 0.2, perLevel: 0.2, baseCost: 2e7, costGrowth: 1.3, unlockStage: 70 },
];
