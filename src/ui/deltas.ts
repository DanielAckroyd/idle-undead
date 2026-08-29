/**
 * "Honest numbers": every buy button states the gain in the same unit the header
 * shows. Deltas are computed by deriving a shallow clone of the state with the
 * purchase applied — `derive` is pure and never mutates, so a shallow clone with
 * one replaced record is safe (and much cheaper than a deep copy).
 */
import type { GameState } from '../game/types';
import { derive, unitDps, type Derived } from '../game/stats';
import { UNITS } from '../game/data/units';
import { fmt } from '../game/numbers';

export interface Delta {
  tap: number;
  dps: number;
}

/**
 * The drawer re-renders at 10 Hz while it is open, and every button wants a
 * `derive` of a hypothetical state. Keying a small module-level cache on the few
 * scalars that can change the answer keeps that to a handful of real derives per
 * second — and avoids a `useMemo` in every row.
 */
const cache = new Map<string, unknown>();

function cached<T>(key: string, compute: () => T): T {
  if (cache.has(key)) return cache.get(key) as T;
  const value = compute();
  if (cache.size > 512) cache.clear();
  cache.set(key, value);
  return value;
}

function diff(next: Derived, now: Derived): Delta {
  return { tap: next.tapDamage - now.tapDamage, dps: next.idleDps - now.idleDps };
}

export function heroDelta(s: GameState, d: Derived, count: number): Delta {
  if (count <= 0) return { tap: 0, dps: 0 };
  // tapDamage/idleDps fingerprint every multiplier that could change the answer.
  return cached(`h|${s.heroLevel}|${count}|${d.tapDamage}|${d.idleDps}`,
    () => diff(derive({ ...s, heroLevel: s.heroLevel + count }), d));
}

export function unitDelta(s: GameState, d: Derived, id: string, count: number): number {
  if (count <= 0) return 0;
  return cached(`u|${id}|${count}|${s.army[id] ?? 0}|${d.armyDps}`, () => {
    const next = derive({ ...s, army: { ...s.army, [id]: (s.army[id] ?? 0) + count } });
    return next.armyDps - d.armyDps;
  });
}

export function petDelta(s: GameState, d: Derived, id: string): Delta {
  return cached(`p|${id}|${s.pets[id] ?? 0}|${s.activePet}|${d.tapDamage}|${d.idleDps}`, () => {
    const pets = { ...s.pets, [id]: (s.pets[id] ?? 0) + 1 };
    // Buying an unowned pet also makes it active (see engine.buyPet), which is what
    // the player will actually experience — mirror that so the number is honest.
    const activePet = s.activePet ?? id;
    return diff(derive({ ...s, pets, activePet }), d);
  });
}

/** What equipping this item would do to the two headline numbers. */
export function equipDelta(s: GameState, d: Derived, uid: string): Delta {
  const it = s.inventory.find(i => i.uid === uid);
  if (!it) return { tap: 0, dps: 0 };
  return cached(`e|${uid}|${s.equipped[it.slot]}|${d.tapDamage}|${d.idleDps}`,
    () => diff(derive({ ...s, equipped: { ...s.equipped, [it.slot]: uid } }), d));
}

/**
 * Everything that scales raw army DPS into the number the header shows. Taken as
 * the ratio of derived to raw where possible so it can never drift from stats.ts.
 */
export function armyMultiplier(s: GameState, d: Derived): number {
  const raw = UNITS.reduce((sum, u) => sum + unitDps(u.id, s.army[u.id] ?? 0), 0);
  if (raw > 0) return d.armyDps / raw;
  const e = d.effects;
  return (1 + (e.armyMult ?? 0)) * (1 + (e.idleMult ?? 0)) * (1 + (e.allMult ?? 0))
    * (1 + (e.killGrowth ?? 0) * s.killStacks);
}

/** A unit's share of the DPS the header shows, not its raw sheet value. */
export function effectiveUnitDps(s: GameState, d: Derived, id: string): number {
  return unitDps(id, s.army[id] ?? 0) * armyMultiplier(s, d);
}

/** `+1.2K DPS`, or an em dash when the purchase grants nothing measurable. */
export function plus(n: number, unit: string): string {
  if (!isFinite(n) || n <= 0) return `— ${unit}`;
  return `+${fmt(n)} ${unit}`;
}
