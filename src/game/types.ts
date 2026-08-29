export type ClassId = 'skeleton' | 'ghost' | 'vampire' | 'ghoul';
export type Essence = 'bone' | 'spirit' | 'blood' | 'flesh';

/** Every modifier the engine understands. Multipliers are additive-percent within a
 *  source and multiplied across sources (see stats.ts). */
export type Effect =
  | 'tapMult'        // tap damage
  | 'idleMult'       // all idle damage (army + pets)
  | 'armyMult'
  | 'petMult'
  | 'allMult'        // everything
  | 'goldMult'
  | 'bossGoldMult'
  | 'critChance'     // additive, 0..1
  | 'critMult'       // additive to base 2x
  | 'bossDmg'
  | 'offlineHours'   // additive hours to offline cap
  | 'offlineMult'
  | 'soulsMult'
  | 'lifestealGold'  // % of tap damage dealt as gold
  | 'combo'          // per-tap stacking damage %, decays
  | 'comboMax'       // max stacks
  | 'killGrowth'     // % damage per kill this stage (resets on stage change)
  | 'rot'            // % of max HP dealt per second as DoT
  | 'autoTapRate'    // taps per second automatically
  | 'phylactery'     // % of gold kept on rebirth
  | 'bossTimer'      // extra seconds on boss
  | 'skipChance'     // chance a kill skips a stage
  | 'petAttackSpeed' // % faster pet attacks
  | 'keepSkillPoints'// count of skill points kept through rebirth
  | 'startStage';    // stage to start at after rebirth

export type Effects = Partial<Record<Effect, number>>;

export interface SkillNode {
  id: string;
  name: string;
  desc: string;
  tier: 1 | 2 | 3;
  maxRank: number;
  /** effect per rank */
  perRank: Effects;
  requires?: string[];   // node ids
  /** graph layout, column 0..2 and row within the tree */
  pos: [number, number];
  capstone?: boolean;    // taking this evolves the class to next tier
}

export interface ClassDef {
  id: ClassId;
  essence: Essence;
  tierNames: [string, string, string];
  blurb: string;
  baseTap: number;
  /** points needed in tier N to unlock tier N+1 */
  tierThreshold: [number, number];
  innate: Effects;
  tree: SkillNode[];
}

export interface FusionDef {
  a: ClassId;
  b: ClassId;
  name: string;
}

export interface UnitDef {
  id: string;
  name: string;
  desc: string;
  baseDps: number;
  baseCost: number;
  costGrowth: number;
  unlockStage: number;
}

export type GearSlot = 'weapon' | 'armor' | 'crown' | 'trinket' | 'charm';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Affix { effect: Effect; value: number; /** 0..1 quality of the roll */ q: number }
export interface Item {
  uid: string;
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  essence: Essence | null;
  /** stage it dropped at; scales affix values */
  ilvl: number;
  affixes: Affix[];
}
export interface PetDef {
  id: string;
  name: string;
  desc: string;
  /** active pet: attacks every `interval` seconds for tapDamage * dmgMult * level */
  interval: number;
  dmgMult: number;
  /** passive effect (per level) when owned, active or not */
  passive: Effects;
  baseCost: number;
  costGrowth: number;
  unlockStage: number;
}

export interface RelicDef {
  id: string;
  name: string;
  desc: string;
  perRank: Effects;
  maxRank: number;
  baseCost: number;
  costGrowth: number;
  /** rebirths required before it can be bought */
  requiresRebirths?: number;
}

export interface FactionDef {
  id: string;
  name: string;
  enemies: string[];
  boss: string;
  color: string;
}

export interface Enemy {
  name: string;
  factionId: string;
  hp: number;
  maxHp: number;
  isBoss: boolean;
  /** remaining boss time in seconds; undefined for non-boss */
  timer?: number;
}

export type GameEvent =
  | { t: 'hit'; source: 'tap' | 'pet' | 'auto' | 'idle' | 'rot'; dmg: number; crit: boolean }
  | { t: 'kill'; name: string; factionId: string; isBoss: boolean }
  | { t: 'bossTimeout'; name: string };

export interface GameState {
  version: number;
  seed: number;
  classId: ClassId | null;
  fusionId: ClassId | null;
  stage: number;
  maxStage: number;
  /** stage this run started at (relics can raise it); souls require progress past it */
  runStartStage: number;
  killsThisStage: number;
  enemy: Enemy;
  /** boss fight active (else we farm the stage with no timer) */
  fightingBoss: boolean;

  gold: number;
  souls: number;
  heroLevel: number;
  skillPointsSpent: number;
  bankedSkillPoints: number;
  skills: Record<string, number>;
  army: Record<string, number>;
  inventory: Item[];
  equipped: Record<GearSlot, string | null>;
  scrap: number;
  /** drop waiting for the UI to present (already in inventory) */
  lastDrop: string | null;
  /** transient FX events since the UI last drained them (not saved) */
  events: GameEvent[];
  pets: Record<string, number>;
  activePet: string | null;
  relics: Record<string, number>;

  rebirths: number;
  totalSouls: number;
  /** premium currency */
  soulfire: number;
  adsRemoved: boolean;
  boosts: { goldUntil: number; damageUntil: number; offlineDoubleNext: boolean; adBoostsToday: number; adBoostDay: number };
  claimedDaily: number; // day index of last daily claim
  ownedSkins: string[];
  inventoryBonus: number;
  comboStacks: number;
  comboTimer: number;
  killStacks: number;
  petCooldown: number;
  autoTapAcc: number;

  lastTick: number;   // ms epoch
  stats: { taps: number; kills: number; goldEarned: number; damageDealt: number; playSeconds: number; dailyStreak?: number; starterBought?: number; chestsOpened?: number };
  pendingOffline: { seconds: number; gold: number } | null;
}
