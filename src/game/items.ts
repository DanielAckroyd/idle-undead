import type { Effects, Essence, GameState, GearSlot, Item, Rarity } from './types';
import { AFFIXES, BASE_NAMES, INVENTORY_CAP, LEGENDARY_NAMES, RARITIES, RARITY_INFO, REFORGE_COST, SET_BONUS, SLOTS, type AffixDef } from './data/items';
import { rng } from './numbers';

const ESSENCES: Essence[] = ['bone', 'spirit', 'blood', 'flesh'];

/** Value an affix contributes at a given roll quality and item level. */
export function affixValue(def: AffixDef, q: number, ilvl: number): number {
  const base = def.min + (def.max - def.min) * q;
  return def.scales ? base * (1 + ilvl / 40) : base;
}

function rollAffix(def: AffixDef, r: () => number, rarity: Rarity, ilvl: number) {
  const q = RARITY_INFO[rarity].rollMin + r() * (1 - RARITY_INFO[rarity].rollMin);
  return { effect: def.effect, value: affixValue(def, q, ilvl), q };
}

/** Rarity weights shift toward rarer with stage. */
export function rollRarity(r: () => number, stage: number, luck = 0): Rarity {
  const bonus = 1 + stage / 60 + luck;
  const weights = RARITIES.map((k, i) => RARITY_INFO[k].weight * Math.pow(bonus, i));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < RARITIES.length; i++) { x -= weights[i]; if (x <= 0) return RARITIES[i]; }
  return 'common';
}

export function rollItem(seed: number, stage: number, forcedSlot?: GearSlot, forcedRarity?: Rarity): Item {
  const r = rng(seed);
  const slot = forcedSlot ?? SLOTS[Math.floor(r() * SLOTS.length)];
  const rarity = forcedRarity ?? rollRarity(r, stage);
  const essence = r() < 0.45 ? ESSENCES[Math.floor(r() * 4)] : null;
  const pool = AFFIXES.filter(a => a.slots.includes(slot) && (!a.essence || a.essence === essence));
  const count = Math.min(RARITY_INFO[rarity].affixes, pool.length);
  const chosen: AffixDef[] = [];
  const bag = [...pool];
  for (let i = 0; i < count; i++) chosen.push(bag.splice(Math.floor(r() * bag.length), 1)[0]);
  // essence-tagged affix is guaranteed first when essence present and available
  const affixes = chosen.map(def => rollAffix(def, r, rarity, stage));
  const names = BASE_NAMES[slot];
  const name = rarity === 'legendary'
    ? LEGENDARY_NAMES[slot][Math.floor(r() * LEGENDARY_NAMES[slot].length)]
    : essence ? names[essence] : names.none[Math.floor(r() * names.none.length)];
  return { uid: `${seed.toString(36)}-${stage.toString(36)}`, name, slot, rarity, essence, ilvl: stage, affixes };
}

/** Add to inventory; if full, auto-salvage and return false. */
export function addItem(s: GameState, item: Item): boolean {
  if (s.inventory.length >= INVENTORY_CAP + (s.inventoryBonus ?? 0)) { s.scrap += RARITY_INFO[item.rarity].scrap; return false; }
  s.inventory.push(item);
  s.lastDrop = item.uid;
  return true;
}

export function equip(s: GameState, uid: string): boolean {
  const it = s.inventory.find(i => i.uid === uid);
  if (!it) return false;
  s.equipped[it.slot] = uid;
  return true;
}
export function unequip(s: GameState, slot: GearSlot) { s.equipped[slot] = null; }

export function salvage(s: GameState, uid: string): boolean {
  const idx = s.inventory.findIndex(i => i.uid === uid);
  if (idx < 0) return false;
  const it = s.inventory[idx];
  for (const slot of SLOTS) if (s.equipped[slot] === uid) s.equipped[slot] = null;
  s.inventory.splice(idx, 1);
  s.scrap += RARITY_INFO[it.rarity].scrap;
  if (s.lastDrop === uid) s.lastDrop = null;
  return true;
}

/** Re-roll one affix (value and effect from the slot pool) for scrap. */
export function reforge(s: GameState, uid: string, affixIndex: number, seed: number): boolean {
  const it = s.inventory.find(i => i.uid === uid);
  if (!it || !it.affixes[affixIndex]) return false;
  const cost = REFORGE_COST[it.rarity];
  if (s.scrap < cost) return false;
  const r = rng(seed);
  const taken = new Set(it.affixes.map((a, i) => i === affixIndex ? '' : a.effect));
  const pool = AFFIXES.filter(a => a.slots.includes(it.slot) && (!a.essence || a.essence === it.essence) && !taken.has(a.effect));
  if (pool.length === 0) return false;
  s.scrap -= cost;
  it.affixes[affixIndex] = rollAffix(pool[Math.floor(r() * pool.length)], r, it.rarity, it.ilvl);
  return true;
}

export function equippedItems(s: GameState): Item[] {
  return SLOTS.map(sl => s.inventory.find(i => i.uid === s.equipped[sl])).filter((i): i is Item => !!i);
}

export function activeSets(s: GameState): Essence[] {
  const counts: Partial<Record<Essence, number>> = {};
  for (const it of equippedItems(s)) if (it.essence) counts[it.essence] = (counts[it.essence] ?? 0) + 1;
  return ESSENCES.filter(e => (counts[e] ?? 0) >= 3);
}

export function gearEffects(s: GameState): Effects {
  const e: Effects = {};
  for (const it of equippedItems(s)) for (const a of it.affixes) e[a.effect] = (e[a.effect] ?? 0) + a.value;
  for (const es of activeSets(s)) for (const k in SET_BONUS[es].effects) {
    const key = k as keyof Effects; e[key] = (e[key] ?? 0) + (SET_BONUS[es].effects[key] ?? 0);
  }
  return e;
}

/** Compare: effects delta if `item` replaced what's in its slot. */
export function compareEquip(s: GameState, uid: string): Effects {
  const it = s.inventory.find(i => i.uid === uid);
  if (!it) return {};
  const before = gearEffects(s);
  const clone: GameState = { ...s, equipped: { ...s.equipped, [it.slot]: uid } };
  const after = gearEffects(clone);
  const out: Effects = {};
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof Effects>) {
    const d = (after[k] ?? 0) - (before[k] ?? 0);
    if (Math.abs(d) > 1e-9) out[k] = d;
  }
  return out;
}
