import type { RelicDef } from '../types';

export const RELICS: RelicDef[] = [
  { id: 'r_bone', name: 'Femur of the First', desc: '+25% all damage per rank', perRank: { allMult: 0.25 }, maxRank: 30, baseCost: 3, costGrowth: 1.3 },
  { id: 'r_coin', name: 'Charon\'s Obol', desc: '+25% gold per rank', perRank: { goldMult: 0.25 }, maxRank: 30, baseCost: 3, costGrowth: 1.3 },
  { id: 'r_hourglass', name: 'Cracked Hourglass', desc: '+2h offline cap per rank', perRank: { offlineHours: 2 }, maxRank: 8, baseCost: 5, costGrowth: 1.6 },
  { id: 'r_urn', name: 'Ashen Urn', desc: '+10% souls per rank', perRank: { soulsMult: 0.1 }, maxRank: 10, baseCost: 10, costGrowth: 1.5 },
  { id: 'r_map', name: 'Cartographer\'s Skull', desc: 'Start 5 stages later after rebirth, per rank', perRank: { startStage: 5 }, maxRank: 20, baseCost: 8, costGrowth: 1.4 },
  { id: 'r_tome', name: 'Tome of Unlearning', desc: 'Keep 1 skill point through rebirth per rank', perRank: { keepSkillPoints: 1 }, maxRank: 10, baseCost: 15, costGrowth: 1.5 },
  { id: 'r_pet', name: 'Collar of the Dead', desc: '+50% pet damage per rank', perRank: { petMult: 0.5 }, maxRank: 20, baseCost: 6, costGrowth: 1.35 },
  { id: 'r_pact', name: 'Grave Pact', desc: 'Unlocks class fusion: pick a secondary class each rebirth.', perRank: {}, maxRank: 1, baseCost: 40, costGrowth: 1, requiresRebirths: 2 },
];
