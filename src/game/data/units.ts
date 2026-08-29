import type { UnitDef } from '../types';

export const UNITS: UnitDef[] = [
  { id: 'zombies', name: 'Zombie Horde', desc: 'Slow, hungry, numerous.', baseDps: 2, baseCost: 25, costGrowth: 1.075, unlockStage: 1 },
  { id: 'archers', name: 'Skeleton Archers', desc: 'Bone bows never miss.', baseDps: 12, baseCost: 300, costGrowth: 1.08, unlockStage: 4 },
  { id: 'bats', name: 'Bat Swarm', desc: 'A thousand tiny bites.', baseDps: 60, baseCost: 3_000, costGrowth: 1.08, unlockStage: 8 },
  { id: 'wights', name: 'Barrow Wights', desc: 'Cold hands from cold graves.', baseDps: 350, baseCost: 40_000, costGrowth: 1.085, unlockStage: 15 },
  { id: 'golem', name: 'Bone Golem', desc: 'Assembled from a battlefield.', baseDps: 2_500, baseCost: 600_000, costGrowth: 1.085, unlockStage: 25 },
  { id: 'knights', name: 'Death Knights', desc: 'Fallen paladins, sworn anew.', baseDps: 20_000, baseCost: 1.2e7, costGrowth: 1.09, unlockStage: 40 },
  { id: 'dracolich', name: 'Dracolich', desc: 'A dragon that refused to die.', baseDps: 2e5, baseCost: 3e8, costGrowth: 1.09, unlockStage: 60 },
  { id: 'reapers', name: 'Reaper Choir', desc: 'They sing, and the living stop.', baseDps: 3e6, baseCost: 1e10, costGrowth: 1.095, unlockStage: 85 },
];

/** Milestone multipliers at unit levels. */
export function unitMilestoneMult(level: number): number {
  let m = 1;
  if (level >= 10) m *= 2;
  if (level >= 25) m *= 2;
  if (level >= 50) m *= 3;
  if (level >= 100) m *= 4;
  if (level >= 200) m *= 5;
  return m;
}
