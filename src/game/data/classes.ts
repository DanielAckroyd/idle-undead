import type { ClassDef, FusionDef, ClassId } from '../types';

export const CLASSES: Record<ClassId, ClassDef> = {
  skeleton: {
    id: 'skeleton', essence: 'bone',
    tierNames: ['Skeleton', 'Bone Knight', 'Lich'],
    blurb: 'Hardy bones and a growing horde. Crits, army and a phylactery that cheats rebirth.',
    baseTap: 6, tierThreshold: [6, 12],
    innate: { armyMult: 0.15 },
    tree: [
      { id: 'sk_marrow', name: 'Marrow Strike', desc: '+20% tap damage per rank', pos: [0, 0], tier: 1, maxRank: 5, perRank: { tapMult: 0.2 } },
      { id: 'sk_brittle', name: 'Brittle Edge', desc: '+4% crit chance per rank', pos: [1, 0], tier: 1, maxRank: 5, perRank: { critChance: 0.04 } },
      { id: 'sk_rattle', name: 'Rattling Ranks', desc: '+25% army damage per rank', pos: [2, 0], tier: 1, maxRank: 5, perRank: { armyMult: 0.25 } },
      { id: 'sk_knight', name: 'Rise, Bone Knight', desc: 'Evolve. +50% all damage, +50% crit damage.', pos: [1, 1], tier: 1, maxRank: 1, perRank: { allMult: 0.5, critMult: 0.5 }, requires: ['sk_marrow'], capstone: true },
      { id: 'sk_shield', name: 'Shieldwall of Bone', desc: '+10s boss timer per rank', pos: [0, 2], requires: ['sk_knight'], tier: 2, maxRank: 3, perRank: { bossTimer: 10 } },
      { id: 'sk_legion', name: 'Legion of the Fallen', desc: '+60% army damage per rank', pos: [1, 2], requires: ['sk_knight'], tier: 2, maxRank: 5, perRank: { armyMult: 0.6 } },
      { id: 'sk_splinter', name: 'Splintering Blows', desc: '+50% crit damage per rank', pos: [2, 2], requires: ['sk_knight'], tier: 2, maxRank: 5, perRank: { critMult: 0.5 } },
      { id: 'sk_lich', name: 'Ascend to Lichdom', desc: 'Evolve. Phylactery keeps 10% of gold on rebirth. +100% all damage.', pos: [1, 3], tier: 2, maxRank: 1, perRank: { phylactery: 0.1, allMult: 1 }, requires: ['sk_legion'], capstone: true },
      { id: 'sk_phyl', name: 'Deeper Phylactery', desc: '+10% gold kept on rebirth per rank', pos: [0, 4], requires: ['sk_lich'], tier: 3, maxRank: 4, perRank: { phylactery: 0.1 } },
      { id: 'sk_death', name: 'Touch of Death', desc: '+40% boss damage per rank', pos: [2, 4], requires: ['sk_lich'], tier: 3, maxRank: 5, perRank: { bossDmg: 0.4 } },
      { id: 'sk_soulwell', name: 'Soul Well', desc: '+15% souls on rebirth per rank', pos: [0, 5], requires: ['sk_phyl'], tier: 3, maxRank: 4, perRank: { soulsMult: 0.15 } },
      { id: 'sk_bonestorm', name: 'Bonestorm', desc: '+2 auto-taps/sec per rank', pos: [2, 5], requires: ['sk_death'], tier: 3, maxRank: 3, perRank: { autoTapRate: 2 } },
    ],
  },
  ghost: {
    id: 'ghost', essence: 'spirit',
    tierNames: ['Ghost', 'Wraith', 'Banshee Queen'],
    blurb: 'Drift through the world. Strongest while you are away; taps phase into combos.',
    baseTap: 4, tierThreshold: [6, 12],
    innate: { idleMult: 0.25, offlineHours: 2 },
    tree: [
      { id: 'gh_haunt', name: 'Haunting', desc: '+30% idle damage per rank', pos: [0, 0], tier: 1, maxRank: 5, perRank: { idleMult: 0.3 } },
      { id: 'gh_phase', name: 'Phase Strike', desc: 'Taps stack +5% damage (max 10 stacks) per rank', pos: [1, 0], tier: 1, maxRank: 5, perRank: { combo: 0.05, comboMax: 2 } },
      { id: 'gh_linger', name: 'Lingering Presence', desc: '+2h offline cap per rank', pos: [2, 0], tier: 1, maxRank: 3, perRank: { offlineHours: 2 } },
      { id: 'gh_wraith', name: 'Become Wraith', desc: 'Evolve. +100% offline earnings, +50% idle damage.', pos: [1, 1], tier: 1, maxRank: 1, perRank: { offlineMult: 1, idleMult: 0.5 }, requires: ['gh_haunt'], capstone: true },
      { id: 'gh_chill', name: 'Grave Chill', desc: '+50% pet damage per rank', pos: [0, 2], requires: ['gh_wraith'], tier: 2, maxRank: 5, perRank: { petMult: 0.5 } },
      { id: 'gh_echo', name: 'Echoing Wail', desc: '+8% chance a kill skips a stage per rank', pos: [1, 2], requires: ['gh_wraith'], tier: 2, maxRank: 3, perRank: { skipChance: 0.08 } },
      { id: 'gh_veil', name: 'Spectral Veil', desc: '+40% idle damage per rank', pos: [2, 2], requires: ['gh_wraith'], tier: 2, maxRank: 5, perRank: { idleMult: 0.4 } },
      { id: 'gh_banshee', name: 'Crown of the Banshee', desc: 'Evolve. Combo stacks max +10, +150% idle damage.', pos: [1, 3], tier: 2, maxRank: 1, perRank: { comboMax: 10, idleMult: 1.5 }, requires: ['gh_veil'], capstone: true },
      { id: 'gh_scream', name: 'Deathscream', desc: '+10% combo damage per stack per rank', pos: [0, 4], requires: ['gh_banshee'], tier: 3, maxRank: 3, perRank: { combo: 0.1 } },
      { id: 'gh_eternal', name: 'Eternal Vigil', desc: '+4h offline cap and +50% offline earnings per rank', pos: [2, 4], requires: ['gh_banshee'], tier: 3, maxRank: 3, perRank: { offlineHours: 4, offlineMult: 0.5 } },
      { id: 'gh_reap', name: 'Reaper\'s Due', desc: '+20% souls on rebirth per rank', pos: [0, 5], requires: ['gh_scream'], tier: 3, maxRank: 3, perRank: { soulsMult: 0.2 } },
      { id: 'gh_swarm', name: 'Restless Dead', desc: '+80% pet damage per rank', pos: [2, 5], requires: ['gh_eternal'], tier: 3, maxRank: 4, perRank: { petMult: 0.8 } },
    ],
  },
  vampire: {
    id: 'vampire', essence: 'blood',
    tierNames: ['Vampire', 'Vampire Lord', 'Nosferatu'],
    blurb: 'Fast, greedy, deadly. Every tap drinks gold; frenzy rewards rapid tapping.',
    baseTap: 7, tierThreshold: [6, 12],
    innate: { goldMult: 0.2 },
    tree: [
      { id: 'va_fang', name: 'Fang Strike', desc: '+25% tap damage per rank', pos: [0, 0], tier: 1, maxRank: 5, perRank: { tapMult: 0.25 } },
      { id: 'va_drain', name: 'Blood Drain', desc: '1% of tap damage returned as gold per rank', pos: [1, 0], tier: 1, maxRank: 5, perRank: { lifestealGold: 0.01 } },
      { id: 'va_greed', name: 'Noble Greed', desc: '+20% gold per rank', pos: [2, 0], tier: 1, maxRank: 5, perRank: { goldMult: 0.2 } },
      { id: 'va_lord', name: 'Vampire Lord', desc: 'Evolve. Taps stack +8% (max 6). +50% tap damage.', pos: [1, 1], tier: 1, maxRank: 1, perRank: { combo: 0.08, comboMax: 6, tapMult: 0.5 }, requires: ['va_fang'], capstone: true },
      { id: 'va_frenzy', name: 'Frenzy', desc: '+2 max combo stacks per rank', pos: [0, 2], requires: ['va_lord'], tier: 2, maxRank: 5, perRank: { comboMax: 2 } },
      { id: 'va_thrall', name: 'Thralls', desc: '+30% army damage per rank', pos: [1, 2], requires: ['va_lord'], tier: 2, maxRank: 4, perRank: { armyMult: 0.3 } },
      { id: 'va_cruel', name: 'Cruelty', desc: '+5% crit chance, +30% crit damage per rank', pos: [2, 2], requires: ['va_lord'], tier: 2, maxRank: 4, perRank: { critChance: 0.05, critMult: 0.3 } },
      { id: 'va_nos', name: 'Nosferatu', desc: 'Evolve. +100% tap damage, +50% boss gold, 3% lifesteal.', pos: [1, 3], tier: 2, maxRank: 1, perRank: { tapMult: 1, bossGoldMult: 0.5, lifestealGold: 0.03 }, requires: ['va_frenzy'], capstone: true },
      { id: 'va_night', name: 'Endless Night', desc: '+60% tap damage per rank', pos: [0, 4], requires: ['va_nos'], tier: 3, maxRank: 5, perRank: { tapMult: 0.6 } },
      { id: 'va_bat', name: 'Bat Form', desc: '+3 auto-taps/sec per rank', pos: [2, 4], requires: ['va_nos'], tier: 3, maxRank: 3, perRank: { autoTapRate: 3 } },
      { id: 'va_hoard', name: 'Crimson Hoard', desc: '+50% gold per rank', pos: [0, 5], requires: ['va_night'], tier: 3, maxRank: 4, perRank: { goldMult: 0.5 } },
      { id: 'va_elder', name: 'Elder Blood', desc: '+15% souls on rebirth per rank', pos: [2, 5], requires: ['va_bat'], tier: 3, maxRank: 3, perRank: { soulsMult: 0.15 } },
    ],
  },
  ghoul: {
    id: 'ghoul', essence: 'flesh',
    tierNames: ['Ghoul', 'Ghast', 'Abomination'],
    blurb: 'Eat, grow, rot. Every kill makes you stronger this stage; enemies decay around you.',
    baseTap: 8, tierThreshold: [6, 12],
    innate: { killGrowth: 0.05 },
    tree: [
      { id: 'go_devour', name: 'Devour', desc: '+5% damage per kill this stage, per rank', pos: [0, 0], tier: 1, maxRank: 5, perRank: { killGrowth: 0.05 } },
      { id: 'go_claw', name: 'Rending Claws', desc: '+20% tap damage per rank', pos: [1, 0], tier: 1, maxRank: 5, perRank: { tapMult: 0.2 } },
      { id: 'go_rot', name: 'Rot', desc: 'Enemies lose 0.5% max HP/sec per rank', pos: [2, 0], tier: 1, maxRank: 4, perRank: { rot: 0.005 } },
      { id: 'go_ghast', name: 'Swell into Ghast', desc: 'Evolve. +75% all damage, +10% boss damage per kill stack.', pos: [1, 1], tier: 1, maxRank: 1, perRank: { allMult: 0.75, killGrowth: 0.1 }, requires: ['go_devour'], capstone: true },
      { id: 'go_plague', name: 'Plaguebearer', desc: 'Rot +1% max HP/sec per rank', pos: [0, 2], requires: ['go_ghast'], tier: 2, maxRank: 3, perRank: { rot: 0.01 } },
      { id: 'go_hunger', name: 'Hunger', desc: '+30% gold per rank', pos: [1, 2], requires: ['go_ghast'], tier: 2, maxRank: 4, perRank: { goldMult: 0.3 } },
      { id: 'go_pack', name: 'Pack Feeding', desc: '+40% army damage per rank', pos: [2, 2], requires: ['go_ghast'], tier: 2, maxRank: 5, perRank: { armyMult: 0.4 } },
      { id: 'go_abom', name: 'Stitched Abomination', desc: 'Evolve. +150% all damage, +20s boss timer.', pos: [1, 3], tier: 2, maxRank: 1, perRank: { allMult: 1.5, bossTimer: 20 }, requires: ['go_pack'], capstone: true },
      { id: 'go_titan', name: 'Flesh Titan', desc: '+50% boss damage per rank', pos: [0, 4], requires: ['go_abom'], tier: 3, maxRank: 5, perRank: { bossDmg: 0.5 } },
      { id: 'go_gorge', name: 'Gorge', desc: '+10% damage per kill stack per rank', pos: [2, 4], requires: ['go_abom'], tier: 3, maxRank: 3, perRank: { killGrowth: 0.1 } },
      { id: 'go_carrion', name: 'Carrion Call', desc: '+80% pet damage per rank', pos: [0, 5], requires: ['go_titan'], tier: 3, maxRank: 3, perRank: { petMult: 0.8 } },
      { id: 'go_soul', name: 'Soul Gluttony', desc: '+15% souls on rebirth per rank', pos: [2, 5], requires: ['go_gorge'], tier: 3, maxRank: 3, perRank: { soulsMult: 0.15 } },
    ],
  },
};

export const FUSIONS: FusionDef[] = [
  { a: 'skeleton', b: 'ghost', name: 'Revenant' },
  { a: 'skeleton', b: 'vampire', name: 'Blood Knight' },
  { a: 'skeleton', b: 'ghoul', name: 'Bone Gorger' },
  { a: 'ghost', b: 'vampire', name: 'Night Shade' },
  { a: 'ghost', b: 'ghoul', name: 'Plague Spirit' },
  { a: 'vampire', b: 'ghoul', name: 'Crimson Glutton' },
];

export function fusionName(a: ClassId, b: ClassId): string {
  const f = FUSIONS.find(f => (f.a === a && f.b === b) || (f.a === b && f.b === a));
  return f ? f.name : `${CLASSES[a].tierNames[0]}-${CLASSES[b].tierNames[0]}`;
}

export const CLASS_LIST = Object.values(CLASSES);
