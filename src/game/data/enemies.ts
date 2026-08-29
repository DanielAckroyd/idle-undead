import type { FactionDef } from '../types';

export const FACTIONS: FactionDef[] = [
  { id: 'holy', name: 'Holy Order', color: '#f5d76e', enemies: ['Acolyte', 'Templar', 'Inquisitor', 'Cleric', 'Crusader'], boss: 'High Paladin Aurelion' },
  { id: 'elves', name: 'Elven Wardens', color: '#7ed6a5', enemies: ['Warden Scout', 'Moon Archer', 'Thornweaver', 'Bladesinger', 'Treant'], boss: 'Archdruid Sylvanne' },
  { id: 'dwarves', name: 'Dwarven Legion', color: '#c98b4a', enemies: ['Shieldbreaker', 'Runesmith', 'Tunnel Guard', 'Cannoneer', 'Iron Golem'], boss: 'Thane Borgrim Ironhand' },
  { id: 'orcs', name: 'Orc Warbands', color: '#8cbf4a', enemies: ['Grunt', 'Wolfrider', 'Berserker', 'Shaman', 'Warg'], boss: 'Warchief Gorrak' },
  { id: 'kingdom', name: 'Human Kingdom', color: '#6f9be0', enemies: ['Militia', 'Pikeman', 'Knight', 'Battlemage', 'Royal Guard'], boss: 'King Aldric the Bold' },
  { id: 'fae', name: 'Fae Court', color: '#d78ee8', enemies: ['Pixie Swarm', 'Redcap', 'Dryad', 'Trickster', 'Unicorn'], boss: 'Queen Titania' },
  { id: 'dragonkin', name: 'Dragonkin', color: '#e8663d', enemies: ['Kobold', 'Drake', 'Wyvern', 'Dragon Priest', 'Salamander'], boss: 'Ancient Wyrm Vaelthrax' },
  { id: 'demons', name: 'Demon Cult', color: '#b03a48', enemies: ['Cultist', 'Imp', 'Hellhound', 'Succubus', 'Pit Fiend'], boss: 'Archfiend Malgorath' },
];

export const KILLS_PER_STAGE = 5;
export const BOSS_EVERY = 10;
export const BOSS_TIME = 30;

export function factionForStage(stage: number): FactionDef {
  const zone = Math.floor((stage - 1) / BOSS_EVERY);
  return FACTIONS[zone % FACTIONS.length];
}

export function isBossStage(stage: number): boolean {
  return stage % BOSS_EVERY === 0;
}

export function enemyMaxHp(stage: number, boss: boolean): number {
  const base = 10 * Math.pow(1.18, stage - 1) * (1 + stage * 0.05);
  return Math.floor(base * (boss ? 6 : 1));
}

export function enemyGold(stage: number, boss: boolean): number {
  const hp = enemyMaxHp(stage, false);
  return Math.max(1, Math.floor(Math.pow(hp, 0.72) * 1.4 * (boss ? 8 : 1)));
}
