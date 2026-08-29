import type { Effect, Essence, GearSlot, Rarity } from '../types';

export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const RARITY_INFO: Record<Rarity, { affixes: number; rollMin: number; color: string; scrap: number; weight: number }> = {
  common:    { affixes: 1, rollMin: 0.0, color: '#b8b8b8', scrap: 1,  weight: 50 },
  uncommon:  { affixes: 2, rollMin: 0.2, color: '#6fcf6f', scrap: 3,  weight: 30 },
  rare:      { affixes: 3, rollMin: 0.4, color: '#5aa9ff', scrap: 8,  weight: 14 },
  epic:      { affixes: 4, rollMin: 0.6, color: '#b46cff', scrap: 20, weight: 5 },
  legendary: { affixes: 4, rollMin: 0.9, color: '#ffb534', scrap: 50, weight: 1 },
};

export const SLOTS: GearSlot[] = ['weapon', 'armor', 'crown', 'trinket', 'charm'];

/** Affix pool entry: base roll range at item level 1; values scale with item level. */
export interface AffixDef { effect: Effect; min: number; max: number; slots: GearSlot[]; essence?: Essence; scales: boolean }
export const AFFIXES: AffixDef[] = [
  { effect: 'tapMult',        min: 0.10, max: 0.30, slots: ['weapon', 'trinket'], scales: true },
  { effect: 'armyMult',       min: 0.10, max: 0.30, slots: ['armor', 'crown'], scales: true },
  { effect: 'petMult',        min: 0.15, max: 0.40, slots: ['charm', 'trinket'], scales: true },
  { effect: 'allMult',        min: 0.05, max: 0.15, slots: ['crown', 'charm'], scales: true },
  { effect: 'goldMult',       min: 0.05, max: 0.20, slots: ['trinket', 'armor'], scales: true },
  { effect: 'bossGoldMult',   min: 0.10, max: 0.40, slots: ['crown', 'charm'], scales: false },
  { effect: 'critChance',     min: 0.02, max: 0.06, slots: ['weapon', 'trinket'], scales: false },
  { effect: 'critMult',       min: 0.20, max: 0.60, slots: ['weapon', 'crown'], scales: false },
  { effect: 'bossDmg',        min: 0.10, max: 0.40, slots: ['weapon', 'charm'], scales: true },
  { effect: 'bossTimer',      min: 2,    max: 6,    slots: ['armor', 'charm'], scales: false },
  { effect: 'petAttackSpeed', min: 0.10, max: 0.30, slots: ['charm'], scales: false },
  { effect: 'comboMax',       min: 1,    max: 3,    slots: ['weapon', 'trinket'], essence: 'blood', scales: false },
  { effect: 'lifestealGold',  min: 0.005, max: 0.02, slots: ['weapon', 'trinket'], essence: 'blood', scales: false },
  { effect: 'offlineMult',    min: 0.10, max: 0.40, slots: ['armor', 'charm'], essence: 'spirit', scales: false },
  { effect: 'offlineHours',   min: 1,    max: 3,    slots: ['crown'], essence: 'spirit', scales: false },
  { effect: 'killGrowth',     min: 0.02, max: 0.06, slots: ['weapon', 'armor'], essence: 'flesh', scales: false },
  { effect: 'rot',            min: 0.002, max: 0.006, slots: ['charm', 'trinket'], essence: 'flesh', scales: false },
  { effect: 'phylactery',     min: 0.02, max: 0.05, slots: ['crown'], essence: 'bone', scales: false },
  { effect: 'soulsMult',      min: 0.03, max: 0.08, slots: ['crown', 'charm'], essence: 'bone', scales: false },
];

export const BASE_NAMES: Record<GearSlot, { none: string[]; bone: string; spirit: string; blood: string; flesh: string }> = {
  weapon:  { none: ['Grave Blade', 'Rusted Cleaver', 'Barrow Spear'], bone: 'Femur Mace', spirit: 'Wisp Scythe', blood: 'Crimson Rapier', flesh: 'Gorehook' },
  armor:   { none: ['Burial Shroud', 'Tarnished Mail', 'Coffin Plate'], bone: 'Ribcage Cuirass', spirit: 'Mist Mantle', blood: 'Sanguine Coat', flesh: 'Stitched Hide' },
  crown:   { none: ['Iron Circlet', 'Funeral Wreath', 'Cracked Diadem'], bone: 'Skull Crown', spirit: 'Halo of Ash', blood: 'Bloodthorn Crown', flesh: 'Sinew Wreath' },
  trinket: { none: ['Coin of Charon', 'Grave Dirt Pouch', 'Widow\'s Locket'], bone: 'Knucklebone Dice', spirit: 'Lantern of Souls', blood: 'Vial of Vitae', flesh: 'Beating Heart' },
  charm:   { none: ['Raven Feather', 'Black Candle', 'Mourner\'s Bell'], bone: 'Bone Fetish', spirit: 'Ectoplasm Orb', blood: 'Bat Totem', flesh: 'Maggot Jar' },
};

export const LEGENDARY_NAMES: Record<GearSlot, string[]> = {
  weapon: ['Kingslayer', 'The Last Sunset', 'Widowmaker'],
  armor: ['Plate of the Unburied', 'Nightfall Aegis'],
  crown: ['Crown of the Barrow King', 'The Hollow Halo'],
  trinket: ['Eye of Morrigan', 'The Debt Unpaid'],
  charm: ['Heart of the Dracolich', 'Titania\'s Regret'],
};

/** Set bonus for 3+ equipped items sharing an essence. */
export const SET_BONUS: Record<Essence, { name: string; desc: string; effects: Partial<Record<Effect, number>> }> = {
  bone:   { name: 'Bone Set', desc: '+15% crit chance, +50% army', effects: { critChance: 0.15, armyMult: 0.5 } },
  spirit: { name: 'Spirit Set', desc: '+100% idle, +4h offline cap', effects: { idleMult: 1, offlineHours: 4 } },
  blood:  { name: 'Blood Set', desc: '+100% tap, +2% lifesteal', effects: { tapMult: 1, lifestealGold: 0.02 } },
  flesh:  { name: 'Flesh Set', desc: '+10% kill growth, +1% rot', effects: { killGrowth: 0.1, rot: 0.01 } },
};

export const INVENTORY_CAP = 30;
export const REFORGE_COST: Record<Rarity, number> = { common: 2, uncommon: 5, rare: 12, epic: 30, legendary: 80 };
