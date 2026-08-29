# Idle Undead

A Tap Titans-style idle RPG where *you* are the undead. Tap to attack, raise an
army, collect gear and pets for idle damage, evolve your class through three
tiers (Skeleton → Bone Knight → Lich), and rebirth for Souls to buy Relics and
fuse classes.

See [docs/DESIGN.md](docs/DESIGN.md) for the design.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # engine tests (vitest)
npm run build
npx tsx scripts/sim.ts skeleton 2 5   # balance sim: class, hours, taps/sec
```

## Layout

- `src/game/` — pure TypeScript engine (no React). `engine.ts` actions, `stats.ts` derived numbers, `data/` content.
- `src/store.ts` — tiny external store + 100ms game loop + autosave.
- `src/ui/` — React screens.
- `public/sprites/` — generated SVG sprites (`npm run sprites`).

## Mobile (Capacitor)

```sh
npm run build
npx cap add ios      # or android (needs Xcode / Android Studio)
npx cap sync && npx cap open ios
```
