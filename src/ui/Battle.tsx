import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Enemy, GameState } from '../game/types';
import { derive, type Derived } from '../game/stats';
import { makeEnemy, tap } from '../game/engine';
import { BOSS_EVERY, FACTIONS, KILLS_PER_STAGE, factionForStage, isBossStage } from '../game/data/enemies';
import { RARITY_INFO } from '../game/data/items';
import { fmt, fmtTime } from '../game/numbers';
import { mutate } from '../store';
import Sprite from './Sprite';
import { GoldIcon, SoulIcon, SoulfireIcon, MenuIcon, GearIcon } from './Icons';
import {
  artUrl,
  backdropUrl,
  classSpriteId,
  enemySpriteId,
  preloadBackdrops,
  resolveArt,
  spriteUrl,
  useArt,
} from './sprites';
import { announce, deathBurst, floatDamage, hitReact, lunge, ripple, shake } from './fx';

const CROSSFADE_MS = 900;

/**
 * The arena is a stage, not a stack of flex rows: both fighters are anchored to a
 * ground line and the HUD lives in bands above and below them. These fractions are
 * the single source of truth — CSS gets them as custom properties, the FX layer
 * uses them to place floats and death bursts.
 */
const GROUND_Y = 0.78;   // ground line, as a fraction of arena height
const ENEMY_X = 0.62;    // enemy stands right of centre
const HERO_X = 0.18;
const ENEMY_H = 0.58;    // sprite height as a fraction of arena height
const BOSS_H = 0.70;
const HERO_H = 0.32;

const STAGE_VARS = {
  '--ground': `${GROUND_Y * 100}%`,
  '--enemy-x': `${ENEMY_X * 100}%`,
  '--hero-x': `${HERO_X * 100}%`,
  '--enemy-h': `${ENEMY_H * 100}cqh`,
  '--boss-h': `${BOSS_H * 100}cqh`,
  '--hero-h': `${HERO_H * 100}cqh`,
} as React.CSSProperties;

/** Never spray more than this many damage numbers from one 100 ms sim step. */
const MAX_FLOATS_PER_FRAME = 6;

interface BattleProps {
  s: GameState;
  d: Derived;
  onSettings: () => void;
  onMenu: () => void;
}

/** "Elven Wardens’" not "Elven Wardens’s". */
function possessive(name: string): string {
  return name.endsWith('s') ? `${name}’` : `${name}’s`;
}

function factionColor(id: string): string {
  return FACTIONS.find(f => f.id === id)?.color ?? '#e8dcc0';
}

/** Painted backdrop when it exists, a faction-tinted gradient until then. */
function useZoneLayer(factionId: string): React.CSSProperties {
  const url = backdropUrl(factionId);
  const resolved = useArt(url, '');
  const color = factionColor(factionId);
  return useMemo(() => ({
    backgroundColor: `color-mix(in srgb, ${color} 10%, #08080b)`,
    backgroundImage: resolved
      ? `url(${resolved})`
      : `radial-gradient(120% 74% at 50% 18%, color-mix(in srgb, ${color} 40%, #12121a) 0%, #0a0a10 66%),`
        + ` linear-gradient(180deg, transparent 52%, color-mix(in srgb, ${color} 22%, #06060a) 100%)`,
  }), [resolved, color]);
}

function Battle({ s, d, onSettings, onMenu }: BattleProps) {
  const battleRef = useRef<HTMLElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  /** Where the player last touched, so tap floats land under the finger. */
  const tapPoint = useRef<{ x: number; y: number } | null>(null);

  const faction = factionForStage(s.stage);
  const enemy = s.enemy;

  // --- zone crossfade ---
  // Adjusting state during render is React's own answer to "derive from changed
  // input"; the outgoing layer is then dropped by a timer once the fade is done.
  const [zone, setZone] = useState<{ cur: string; prev: string | null }>(() => ({ cur: faction.id, prev: null }));
  if (zone.cur !== faction.id) setZone({ cur: faction.id, prev: zone.cur });

  useEffect(() => {
    if (!zone.prev) return;
    const t = setTimeout(() => setZone(z => ({ ...z, prev: null })), CROSSFADE_MS);
    return () => clearTimeout(t);
  }, [zone.prev]);

  const curLayer = useZoneLayer(zone.cur);
  const prevLayer = useZoneLayer(zone.prev ?? zone.cur);

  // Warm this zone's backdrop and the next one's so the crossfade never pops.
  const nextFaction = factionForStage((Math.floor((s.stage - 1) / BOSS_EVERY) + 1) * BOSS_EVERY + 1);
  useEffect(() => {
    preloadBackdrops(faction.id, nextFaction.id);
  }, [faction.id, nextFaction.id]);

  // --- event drain ---
  // The engine records what happened in `s.events`; the view turns each entry into
  // one effect and clears the queue. Nothing here infers anything from counters, so
  // pet hits, auto-taps and off-screen kills all get their own presentation.
  useEffect(() => {
    if (s.events.length === 0) return;
    const host = fxRef.current;
    const arena = arenaRef.current;
    const w = arena?.clientWidth ?? 0;
    const h = arena?.clientHeight ?? 0;
    // Geometry of the enemy's box, derived from the stage constants rather than
    // measured, so a corpse burst is placed correctly even though the store has
    // already swapped in the next (differently sized) enemy.
    const boxOf = (boss: boolean) => {
      const size = h * (boss ? BOSS_H : ENEMY_H);
      return { x: w * ENEMY_X, cy: h * GROUND_Y - size * 0.55, size };
    };

    let floats = 0;
    let lunged = false;
    for (const ev of s.events) {
      if (ev.t === 'hit') {
        hitReact(hitRef.current);
        if (!lunged && (ev.source === 'tap' || ev.source === 'auto')) {
          lunged = true;
          lunge(heroRef.current, 38, -24);
        }
        if (ev.crit && ev.source === 'tap') shake(battleRef.current);
        if (floats >= MAX_FLOATS_PER_FRAME) continue;
        floats++;
        const box = boxOf(enemy.isBoss);
        const from = ev.source === 'tap' ? tapPoint.current : null;
        const jitter = from ? 0 : (Math.random() * 2 - 1) * box.size * 0.28;
        floatDamage(
          host,
          from ? from.x : box.x + jitter,
          from ? from.y : box.cy + jitter * 0.4,
          fmt(ev.dmg),
          ev.crit,
          ev.source === 'idle' || ev.source === 'rot' ? 'auto' : ev.source,
        );
        if (ev.source === 'tap') tapPoint.current = null;
      } else if (ev.t === 'kill') {
        const box = boxOf(ev.isBoss);
        const spriteId = enemySpriteId({ name: ev.name, factionId: ev.factionId, isBoss: ev.isBoss } as Enemy);
        deathBurst(host, {
          src: resolveArt(artUrl('enemies', spriteId), spriteUrl('enemies', spriteId)),
          x: box.x,
          y: box.cy,
          size: Math.round(Math.max(48, Math.min(300, box.size))),
          color: factionColor(ev.factionId),
          boss: ev.isBoss,
        });
      } else if (ev.t === 'bossTimeout') {
        announce(host, `${ev.name} escaped`);
      }
    }
    mutate(st => { st.events = []; });
  });

  const onTap = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (rect) {
      const point = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      tapPoint.current = point;
      ripple(fxRef.current, point.x, point.y);
    }
    // Every visible consequence of the hit is played from the event queue above.
    mutate(st => { tap(st, derive(st)); });
  }, []);

  const fightBoss = useCallback((ev: React.MouseEvent) => {
    ev.stopPropagation();
    mutate(st => {
      st.fightingBoss = true;
      st.enemy = makeEnemy(st.stage, true, st.seed + st.stats.kills, derive(st).bossTime);
    });
  }, []);

  const drop = s.lastDrop ? s.inventory.find(i => i.uid === s.lastDrop) : undefined;
  const dismissDrop = useCallback((ev: React.PointerEvent) => {
    ev.stopPropagation();
    mutate(st => { st.lastDrop = null; });
  }, []);

  const hpPct = Math.max(0, Math.min(1, enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0)) * 100;
  const timerPct = enemy.timer !== undefined ? Math.max(0, Math.min(1, enemy.timer / d.bossTime)) * 100 : 0;
  const showFightBoss = isBossStage(s.stage) && !s.fightingBoss;

  // s.lastTick is the store's own wall clock, stamped on every 100 ms tick — the
  // same clock the engine compares boosts against, and stable within a render.
  const goldLeft = s.boosts.goldUntil - s.lastTick;
  const dmgLeft = s.boosts.damageUntil - s.lastTick;

  return (
    <section className="battle" ref={battleRef} style={{ '--faction': faction.color } as React.CSSProperties}>
      <header className="hud">
        <div className="hud-row">
          <button type="button" className="icon-btn" onClick={onMenu} aria-label="Menu">
            <MenuIcon />
          </button>
          <div className="hud-stage">
            <span className="hud-stage-num">Stage {s.stage}</span>
            <span className="hud-faction">{faction.name}</span>
          </div>
          <button type="button" className="icon-btn" onClick={onSettings} aria-label="Settings">
            <GearIcon />
          </button>
        </div>
        <div className="hud-row hud-res">
          <span className="res gold" title="Gold">
            <GoldIcon />{fmt(s.gold)}
          </span>
          <span className="res souls" title="Souls">
            <SoulIcon />{fmt(s.souls)}
          </span>
          <span className="res soulfire" title="Soulfire">
            <SoulfireIcon />{fmt(s.soulfire)}
          </span>
        </div>
      </header>

      <div className="arena" ref={arenaRef} onPointerDown={onTap} style={STAGE_VARS}>
        <div className="zone-bg" aria-hidden="true">
          {zone.prev && <div className="zone-layer" key={`p-${zone.prev}`} style={prevLayer} />}
          <div className="zone-layer zone-layer-in" key={`c-${zone.cur}`} style={curLayer} />
          <div className="zone-vignette" />
        </div>

        {/* --- the stage: two fighters on one ground line --- */}
        <div className="stage" aria-hidden="true">
          <span className={enemy.isBoss ? 'unit-shadow enemy-shadow boss' : 'unit-shadow enemy-shadow'} />
          <div className={enemy.isBoss ? 'unit enemy-anchor boss' : 'unit enemy-anchor'}>
            {enemy.isBoss && <span className="boss-aura" />}
            <div className="enemy-bob">
              <div className="enemy-hit" ref={hitRef}>
                <Sprite kind="enemies" id={enemySpriteId(enemy)} size={220} className="enemy-sprite" alt="" />
              </div>
            </div>
          </div>

          {s.classId && (
            <>
              <span className="unit-shadow hero-shadow" />
              <div className="unit hero-anchor">
                <div className="hero-lunge" ref={heroRef}>
                  <Sprite kind="classes" id={classSpriteId(s.classId, d.tier)} size={120} className="hero-fighter" alt="" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* --- top band: who you are fighting --- */}
        <div className="band band-top">
          <div className="enemy-name-row">
            {enemy.isBoss && <span className="boss-badge">BOSS</span>}
            <span className="enemy-name">{enemy.name}</span>
          </div>
        </div>

        {/* --- bottom band: how the fight is going --- */}
        <div className="band band-bottom">
          <div className="bars">
            <div className="hpbar">
              <div className="hpbar-fill" style={{ width: `${hpPct}%` }} />
              <span className="hpbar-text">{fmt(Math.max(0, enemy.hp))} / {fmt(enemy.maxHp)}</span>
            </div>
            {enemy.timer !== undefined ? (
              <div className="timerbar">
                <div className="timerbar-fill" style={{ width: `${timerPct}%` }} />
                <span className="timerbar-text">{enemy.timer.toFixed(1)}s</span>
              </div>
            ) : (
              <div className="kill-pips" aria-label={`${s.killsThisStage} of ${KILLS_PER_STAGE} kills`}>
                {Array.from({ length: KILLS_PER_STAGE }, (_, i) => (
                  <span key={i} className={i < s.killsThisStage ? 'pip pip-on' : 'pip'} />
                ))}
              </div>
            )}
          </div>
        </div>

        {drop && (
          <div
            className="drop-card"
            style={{ '--rarity': RARITY_INFO[drop.rarity].color } as React.CSSProperties}
            onPointerDown={e => e.stopPropagation()}
          >
            <span className="drop-tag">NEW DROP</span>
            <span className="drop-name">{drop.name}</span>
            <span className="drop-meta dim">{drop.rarity} {drop.slot}</span>
            <button type="button" className="btn tiny" onPointerDown={dismissDrop}>Got it</button>
          </div>
        )}

        {/* Keyed so a new zone / boss remounts the element and replays its
            one-shot CSS animation — no timers, no state, no re-render churn. */}
        <div className="zone-toast" key={`toast-${faction.id}`}>Entering {possessive(faction.name)} lands</div>
        {enemy.isBoss && (
          <div className="boss-banner" key={`banner-${enemy.factionId}-${enemy.name}`}>
            <span className="boss-banner-tag">BOSS</span>
            <span className="boss-banner-name">{enemy.name}</span>
          </div>
        )}

        {showFightBoss && (
          <button type="button" className="btn boss-btn" onClick={fightBoss} onPointerDown={e => e.stopPropagation()}>
            Fight boss
          </button>
        )}

        <div className="fx-layer" ref={fxRef} aria-hidden="true" />
      </div>

      <div className="chips">
        <span className="chip"><b>Tap</b> {fmt(d.tapDamage)}</span>
        <span className="chip"><b>DPS</b> {fmt(d.idleDps)}</span>
        {goldLeft > 0 && <span className="chip boost gold"><b>2× Gold</b> {fmtTime(goldLeft / 1000)}</span>}
        {dmgLeft > 0 && <span className="chip boost dmg"><b>2× Dmg</b> {fmtTime(dmgLeft / 1000)}</span>}
        {d.comboMax > 0 && <span className="chip"><b>Combo</b> {s.comboStacks}/{d.comboMax}</span>}
        {d.killGrowth > 0 && <span className="chip"><b>Stacks</b> {s.killStacks}</span>}
      </div>
    </section>
  );
}

export default memo(Battle);
