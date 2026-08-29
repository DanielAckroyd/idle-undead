# Roadmap

Status legend: ☐ todo · ◐ in progress · ☑ done

## Phase 1 — "It's alive" (feel + art)  ◐
- ☑ Codex `image_gen` pipeline: manifest → transparent PNG → resized assets
- ☐ Real painted sprites: 12 class tiers, 48 enemies/bosses, 8 units, 5 pets
- ☐ 8 zone backdrops (portrait), zone-transition toast
- ☐ Enemy life: idle bob, hit flinch + flash, death dissolve, boss aura + entrance banner
- ☐ Tap juice: hero lunge, tap ripple, screen shake on crit, HP bar damage-lag ghost
- ☐ Main menu: title, Continue / New Game, class select flow, settings, credits
- ☐ Collapsible bottom drawer (peek bar ↔ half ↔ full)
- ☐ Honest numbers: "+X DPS" / "+X tap" deltas on every buy button, effective per-unit DPS

## Phase 2 — Build identity
- ☐ Skill tree as a graph (pan/zoom, edges, evolution preview, "N points to …")
- ☐ Gear rework: drops from bosses/chests, rarity, affixes, sets, salvage/reforge, loadouts
- ☐ Inventory UI + item cards + compare-on-equip

## Phase 3 — UI frame
- ☐ Game-frame theme: 9-slice panels, iconography (gold, souls, soulfire), typography
- ☐ Boss intro / zone intro presentation, victory splash
- ☐ Sound + music hooks (Howler-free: WebAudio), haptics via Capacitor

## Phase 4 — Business
- ☐ Soulfire economy, shop, rewarded-ad boosts, Remove Ads, starter pack, skins
- ☐ `services/monetization.ts` (fake store in dev; RevenueCat/AdMob in prod), consent flow
- ☐ Daily login, achievements, notifications

## Phase 5 — Ship
- ☐ FTUE, settings, save migration + export code, telemetry abstraction
- ☐ Native builds (iOS/Android via Capacitor), icons/splash, store listing assets
- ☐ Cloud save, localization pass, performance audit
