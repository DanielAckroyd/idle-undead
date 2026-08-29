import type { ClassId, Enemy } from '../game/types';
import { FACTIONS } from '../game/data/enemies';

export type SpriteKind = 'classes' | 'enemies' | 'units' | 'pets';

/** Public path of a sprite. Files live in `public/sprites/<kind>/<id>.svg`. */
export function spriteUrl(kind: SpriteKind, id: string): string {
  return `/sprites/${kind}/${id}.svg`;
}

/** `${factionId}_${index}` for a normal enemy, `${factionId}_boss` for a boss. */
export function enemySpriteId(enemy: Enemy): string {
  if (enemy.isBoss) return `${enemy.factionId}_boss`;
  const faction = FACTIONS.find(f => f.id === enemy.factionId);
  const i = faction ? faction.enemies.indexOf(enemy.name) : -1;
  return `${enemy.factionId}_${i < 0 ? 0 : i}`;
}

/** `${classId}_${tier}` — tier is 1..3. */
export function classSpriteId(classId: ClassId, tier: number): string {
  return `${classId}_${tier}`;
}
