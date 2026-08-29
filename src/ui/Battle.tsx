import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../game/types';
import { derive, type Derived } from '../game/stats';
import { makeEnemy, tap } from '../game/engine';
import { BOSS_EVERY, FACTIONS, KILLS_PER_STAGE, factionForStage, isBossStage } from '../game/data/enemies';
import { RARITY_INFO } from '../game/data/items';
import { fmt } from '../game/numbers';
import { mutate } from '../store';
import Sprite from './Sprite';
import { GoldIcon, SoulIcon, MenuIcon, GearIcon } from './Icons';
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
import { deathBurst, floatDamage, hitReact, lunge, ripple, shake } from './fx';

const ENEMY_SIZE = 132;
const CROSSFADE_MS = 900;

interface BattleProps {
  s: GameState;
  d: Derived;
  onSettings: () => void;
  onMenu: () => void;
}

/** "Elven Wardens’" not "Elven Wardens’s". */
function possessive(name: string): string {
  return name.endsWith('s') ? `${name}\u2019` : `${name}\u2019s`;
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

  // --- death dissolve ---
  // The store spawns the next enemy the instant the current one dies, so the
  // corpse is captured here and drawn as a detached overlay in the fx layer.
  const seen = useRef<{ kills: number; spriteId: string; boss: boolean; faction: string } | null>(null);
  useEffect(() => {
    const cur = {
      kills: s.stats.kills,
      spriteId: enemySpriteId(s.enemy),
      boss: s.enemy.isBoss,
      faction: s.enemy.factionId,
    };
    const prev = seen.current;
    seen.current = cur;
    if (!prev || cur.kills <= prev.kills) return;
    const host = fxRef.current;
    const node = hitRef.current;
    if (!host || !node) return;
    const hr = host.getBoundingClientRect();
    // Measure the sprite itself, not its full-height flex wrapper.
    const nr = (node.firstElementChild ?? node).getBoundingClientRect();
    deathBurst(host, {
      src: resolveArt(artUrl('enemies', prev.spriteId), spriteUrl('enemies', prev.spriteId)),
      x: nr.left - hr.left + nr.width / 2,
      y: nr.top - hr.top + nr.height / 2,
      size: Math.round(Math.max(48, Math.min(280, nr.height || ENEMY_SIZE))),
      color: factionColor(prev.faction),
      boss: prev.boss,
    });
  });

  const isBossNow = enemy.isBoss;
  const bossMult = d.bossMult;
  const onTap = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    let result = { dmg: 0, crit: false };
    mutate(st => { result = tap(st, derive(st)); });
    const host = fxRef.current;
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    ripple(host, x, y);
    if (result.dmg <= 0) return;
    // engine.tap() returns pre-bossMult damage; dealDamage applies the boss
    // multiplier internally, so show what the enemy actually took.
    floatDamage(host, x, y, fmt(result.dmg * (isBossNow ? bossMult : 1)), result.crit);
    hitReact(hitRef.current);
    lunge(heroRef.current, 38, -24);
    if (result.crit) shake(battleRef.current);
  }, [isBossNow, bossMult]);

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
        </div>
      </header>

      <div className="arena" ref={arenaRef} onPointerDown={onTap}>
        <div className="zone-bg" aria-hidden="true">
          {zone.prev && <div className="zone-layer" key={`p-${zone.prev}`} style={prevLayer} />}
          <div className="zone-layer zone-layer-in" key={`c-${zone.cur}`} style={curLayer} />
          <div className="zone-vignette" />
        </div>

        <div className="arena-body">
          <div className="enemy-name-row">
            {enemy.isBoss && <span className="boss-badge">BOSS</span>}
            <span className="enemy-name">{enemy.name}</span>
          </div>

          <div className="enemy-sprite-wrap">
            <div className={enemy.isBoss ? 'enemy-scale boss' : 'enemy-scale'}>
              {enemy.isBoss && <span className="boss-aura" aria-hidden="true" />}
              <div className="enemy-bob">
                <div className="enemy-hit" ref={hitRef}>
                  <Sprite
                    kind="enemies"
                    id={enemySpriteId(enemy)}
                    size={ENEMY_SIZE}
                    className="enemy-sprite"
                    alt={enemy.name}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bars">
            <div className="hpbar">
              <div className="hpbar-fill" style={{ width: `${hpPct}%` }} />
              <span className="hpbar-text">{fmt(Math.max(0, enemy.hp))} / {fmt(enemy.maxHp)}</span>
            </div>
            {enemy.timer !== undefined && (
              <div className="timerbar">
                <div className="timerbar-fill" style={{ width: `${timerPct}%` }} />
                <span className="timerbar-text">{enemy.timer.toFixed(1)}s</span>
              </div>
            )}
            {!enemy.isBoss && (
              <div className="kill-pips" aria-label={`${s.killsThisStage} of ${KILLS_PER_STAGE} kills`}>
                {Array.from({ length: KILLS_PER_STAGE }, (_, i) => (
                  <span key={i} className={i < s.killsThisStage ? 'pip pip-on' : 'pip'} />
                ))}
              </div>
            )}
          </div>
        </div>

        {s.classId && (
          <div className="hero-slot" ref={heroRef} aria-hidden="true">
            <Sprite kind="classes" id={classSpriteId(s.classId, d.tier)} size={74} className="hero-fighter" alt="" />
          </div>
        )}

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
        {d.comboMax > 0 && <span className="chip"><b>Combo</b> {s.comboStacks}/{d.comboMax}</span>}
        {d.killGrowth > 0 && <span className="chip"><b>Stacks</b> {s.killStacks}</span>}
      </div>
    </section>
  );
}

export default memo(Battle);
