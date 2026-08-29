# Idle Undead — Game Design

Tap Titans-style idle RPG. You are an undead champion carving through the living
factions of a high-fantasy world. Tap to attack; build an army, gear and pets for
idle damage; rebirth for Souls to buy Relics and eventually fuse classes.

## Core loop
1. Tap the enemy → tap damage. Enemies drop Gold.
2. Spend Gold on: Hero levels (tap dmg), Army units (idle DPS), Gear, Pets.
3. Every stage = 5 kills; every 10th stage is a timed Boss (30s). Beat it to advance.
4. Stuck? Rebirth → reset stage/gold/upgrades, keep Souls + Relics + class unlocks.

## Classes (essence → 3 tiers)
| Class    | Essence | T1        | T2               | T3            | Playstyle              |
|----------|---------|-----------|------------------|---------------|------------------------|
| Skeleton | Bone    | Skeleton  | Bone Knight      | Lich          | Army + crits, phylactery on rebirth |
| Ghost    | Spirit  | Ghost     | Wraith           | Banshee Queen | Idle/offline, phase combo |
| Vampire  | Blood   | Vampire   | Vampire Lord     | Nosferatu     | Tap frenzy, gold lifesteal |
| Ghoul    | Flesh   | Ghoul     | Ghast            | Abomination   | Kill-stacking growth, rot DoT |

Each class has a skill tree of 3 tiers. Spending enough points in a tier unlocks
the next tier and *evolves* the character (new name, sprite, and a capstone
passive that changes play).

Skill points: 1 per 20 hero levels + 1 per 20 stages reached.
Reset on rebirth (hero levels reset), but Relics can refund/bank points.

## Idle damage sources
- **Army** (units: Zombie Horde, Skeleton Archers, Bat Swarm, Bone Golem …): each
  has base DPS, cost curve `base * 1.08^level`, and milestone multipliers at
  levels 10/25/50/100.
- **Gear** (slots: Weapon, Armor, Trinket, Crown): each gives a multiplier to
  tap / idle / gold / crit. Upgradable with gold; rarity rolls on drops.
- **Pets**: one active, others give passive bonus. Active pet attacks every N
  seconds with damage scaled from tap damage (like Tap Titans pets).

## Enemies & factions
Zones cycle every 10 stages through factions: Holy Order, Elven Wardens,
Dwarven Legion, Orc Warbands, Human Kingdom, Fae Court, Dragonkin, Demon Cult.
Enemy HP: `10 * 1.18^stage * (boss ? 6 : 1)`. Gold: `~HP^0.7 * goldMult`.

## Rebirth
Souls gained = `floor((maxStage / 10)^1.6)` (plus class/relic multipliers). Requires
maxStage ≥ 20 and at least 10 stages of progress past the run's starting stage.
Relics (permanent, cost Souls): global damage, gold, offline time, starting
stage, keep skill points, unlock class fusion.
**Fusion** (unlocked by relic "Grave Pact" after 2 rebirths): choose a secondary
class — you gain its Tier-1 nodes at 50% power and a fused title
(Skeleton+Vampire = Blood Knight, Ghost+Ghoul = Revenant …).

## Numbers
Plain JS numbers; formatted K/M/B/T then aa, ab … Offline progress capped at 8h
base (Ghost tree + relics extend).

## Tech
Vite + React + TypeScript. Pure-TS engine in `src/game` (deterministic, tested
with Vitest). UI in `src/ui`. Capacitor wrapper for iOS/Android later.

## Sprite conventions
All sprites are SVG, 64x64 viewBox, pixel/chunky-fantasy style, transparent bg, under `public/sprites/`:
- `classes/{classId}_{tier}.svg` — tier 1..3 (e.g. `skeleton_3.svg` = Lich)
- `enemies/{factionId}_{i}.svg` — i = 0..4 matching `FACTIONS[].enemies` order; `enemies/{factionId}_boss.svg`
- `units/{unitId}.svg`, `pets/{petId}.svg`
UI helper: `spriteUrl(kind, id)` in `src/ui/sprites.ts`; missing files fall back to a placeholder.
