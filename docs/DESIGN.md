# Idle Undead — Game Design (v2)

> Tap Titans-style idle RPG where *you* are the undead, carving through the living
> factions of a high-fantasy world. This document is the source of truth for what
> the game is. `ROADMAP.md` is the order we build it in.

## Pillars
1. **Tapping feels violent.** Every tap has impact: sprite flinch, hit flash,
   screen shake on crits, damage numbers that pop, boss kills that shatter.
2. **Your build is visible.** The skill *tree* is a real graph you navigate; your
   character sprite evolves with it; your gear loadout is a set of choices, not a
   price list.
3. **The world pushes back.** Each zone has its own painted backdrop, faction,
   music cue and boss with an entrance. You are the monster invading *their* land.
4. **Every session ends with a goal.** The next unlock (evolution, zone, gear
   affix, relic) is always on screen.

## Fantasy & tone
Grim but playful. The living are pompous (Holy Order), haughty (Elves), stubborn
(Dwarves), brutish (Orcs), officious (Kingdom), capricious (Fae), arrogant
(Dragonkin) and rival-evil (Demon Cult). Bosses taunt on entry; the undead hero
never speaks — the army does.

## Core loop
Tap → gold → upgrade hero / army / pets → clear stage (5 kills) → boss every 10
stages (timed) → new zone every 10 stages → wall → **rebirth** → Souls → Relics →
deeper run, class evolution, fusion.

## Player character
### Classes (essence → 3 tiers)
| Class    | Essence | T1       | T2           | T3            | Identity |
|----------|---------|----------|--------------|---------------|----------|
| Skeleton | Bone    | Skeleton | Bone Knight  | Lich          | crits, army, phylactery (keep gold on rebirth) |
| Ghost    | Spirit  | Ghost    | Wraith       | Banshee Queen | offline/idle, tap combos |
| Vampire  | Blood   | Vampire  | Vampire Lord | Nosferatu     | tap frenzy, gold lifesteal |
| Ghoul    | Flesh   | Ghoul    | Ghast        | Abomination   | kill-stacking growth, rot DoT |

Later classes (post-launch): Mummy (Dust — curses/slow bosses), Wight (Frost —
freeze boss timer), Revenant (Hate — damage scales with rebirths).

### Skill tree (graph, not list)
Each class has a hand-laid node graph: three vertical tiers, 4 nodes per tier
plus a capstone at each tier boundary. Edges are explicit (`requires`). The UI
renders it as a pannable graph: locked (dark), available (lit border), ranked
(filled), maxed (gold). The capstone shows the *evolved sprite* as a preview and
the path to it is highlighted ("3 more points to Bone Knight"). Skill points:
1 per 20 hero levels + 1 per 20 stages; relic *Tome of Unlearning* banks points
through rebirth.

### Gear (rework — drops, not purchases)
Gear is **found**, never bought with gold.
- **Sources:** every boss kill drops one item (rarity weighted by stage); zone
  chests (one per zone first clear); daily reward; premium "Grave Chest".
- **Slots:** Weapon, Armor, Crown, Trinket, Charm (5). One item per slot.
- **Rarity:** Common / Uncommon / Rare / Epic / Legendary — sets affix count
  (1–4) and roll range.
- **Affixes** roll from pools that push *builds*, e.g. `+% tap dmg`, `+% army`,
  `+% pet attack speed`, `+combo max`, `+% gold from bosses`, `+% crit dmg`,
  `+s boss timer`, `+% rot`, `+% kill growth`, `+% offline`. Some are
  essence-tagged: Blood items roll lifesteal, Spirit items roll offline.
- **Sets:** 3 pieces of one essence → set bonus (e.g. *Bone set*: crits refund
  army cost 5%).
- **Salvage** → Scrap; Scrap **reforges** one affix. Inventory 30 slots (premium
  expands).
- **Loadouts:** 2 saved loadouts (swap between "boss" and "farm" builds).

### Idle sources
- **Army** — 8 units, gold cost curve, milestone multipliers at 10/25/50/100/200.
- **Pets** — one active (attacks on a timer, scaled from tap), all owned give passives.
- **Gear** — affixes as above.

## World
8 factions cycle by zone (10 stages each). Each zone has a painted backdrop,
5 enemy types, 1 boss. Bosses get an entrance banner + taunt line. Zone
transition = backdrop crossfade + "Entering the Elven Wardens' Moonwood" toast.

## Prestige
**Rebirth** (≥ stage 20 and ≥10 stages past run start) → Souls =
`floor((maxStage/10)^1.6) × soulsMult`. Keeps Souls, Relics, gear inventory,
class unlocks, achievements. **Relics** (Souls shop, permanent). **Fusion**
(Grave Pact relic): secondary class grants its T1 nodes at half power and a
fused title (Blood Knight, Revenant, …).

## Monetization (fair, genre-standard)
Premium currency **Soulfire** (✧).
- **Earn free:** daily login, achievements, first boss kill per zone, rebirth milestones.
- **Rewarded ads** (opt-in, capped/day): 2× gold for 4h, instant boss-timer reset,
  double offline earnings, revive failed boss attempt.
- **IAP:** Soulfire packs; *Remove Ads* (one-time, includes the ad boosts passively);
  *Starter Pack*; class **skins** (cosmetic, evolve with tiers); premium pets;
  time-skips (4h/12h idle gold); inventory + loadout slots; Grave Chests
  (gear, with pity counter — no blind boxes without a visible pity).
- **Never sold:** stages, souls directly, skill points. Progression is time or skill.
- Implemented behind `services/monetization.ts` (fake store in dev; RevenueCat +
  AdMob Capacitor plugins in prod). Consent (GDPR/ATT) before any ad SDK init.

## Production checklist (what "shippable" means)
- FTUE: 90-second guided first fight; tooltips on first open of each panel.
- Settings: sound, music, haptics, damage-number density, notifications, language.
- Push notification when offline cap is reached ("Your army has earned 1.2M gold").
- Save: versioned + migrated, autosave 5s, export/import code, cloud sync (Game
  Center / Play Games) later; light tamper check (HMAC of save).
- Analytics + crash reporting behind `services/telemetry.ts` (no PII).
- Performance: 60fps on a 2019 mid phone; sprite atlas; no layout thrash from
  10 Hz state updates (battle view rerenders, drawers memoized).
- Store assets: icon, splash, screenshots, privacy policy, age rating (no gore).
- Localization scaffold: all strings through `t()`.
- Accessibility: reduce-motion honours OS setting; min 44pt targets; colour-blind safe rarity (icons + colour).

## Art direction & pipeline
Hand-painted dark-fantasy, saturated accents, readable silhouettes at 120px.
Generated with Codex `image_gen` (transparent PNG), manifest-driven
(`art/manifest.json` → `scripts/gen-art.mjs`), resized to 512px sprites / 1080px
backgrounds, atlased for prod. Each enemy has: idle bob (CSS), hit flinch,
death dissolve (shader-free: scale + fade + particle burst). Hero has attack
lunge on tap. Bosses are 1.5× scale with an aura.

## Numbers
Plain JS numbers formatted K/M/B/T/aa…; stage cap 3000 (HP overflow guard).
Enemy HP `10 × 1.22^(stage−1) × (1+0.05·stage) × (boss ? 6 : 1)`; gold `1.6·HP^0.68`.
Balance target: first run walls ~stage 100–130 at ~1.5 h active; T2 evolution
~30 min; T3 after 1–2 rebirths.
