import { memo, useCallback, useRef, useState } from 'react';
import type { GameState } from '../game/types';
import { derive, type Derived } from '../game/stats';
import { makeEnemy, tap } from '../game/engine';
import { KILLS_PER_STAGE, factionForStage, isBossStage } from '../game/data/enemies';
import { fmt } from '../game/numbers';
import { mutate } from '../store';
import Sprite from './Sprite';
import { enemySpriteId } from './sprites';

interface DamageFloat { id: number; x: number; y: number; text: string; crit: boolean }

interface BattleProps {
  s: GameState;
  d: Derived;
  onSettings: () => void;
}

function Battle({ s, d, onSettings }: BattleProps) {
  const [floats, setFloats] = useState<DamageFloat[]>([]);
  const nextId = useRef(0);

  const onTap = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    let result = { dmg: 0, crit: false };
    mutate(st => { result = tap(st, derive(st)); });
    if (result.dmg <= 0) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    const float: DamageFloat = {
      id,
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
      text: fmt(result.dmg),
      crit: result.crit,
    };
    setFloats(prev => (prev.length > 24 ? prev.slice(-24) : prev).concat(float));
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 750);
  }, []);

  const fightBoss = useCallback((ev: React.MouseEvent) => {
    ev.stopPropagation();
    mutate(st => {
      st.fightingBoss = true;
      st.enemy = makeEnemy(st.stage, true, st.seed + st.stats.kills, derive(st).bossTime);
    });
  }, []);

  const faction = factionForStage(s.stage);
  const enemy = s.enemy;
  const hpPct = Math.max(0, Math.min(1, enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0)) * 100;
  const timerPct = enemy.timer !== undefined ? Math.max(0, Math.min(1, enemy.timer / d.bossTime)) * 100 : 0;
  const bossStage = isBossStage(s.stage);
  const showFightBoss = bossStage && !s.fightingBoss;

  return (
    <section className="battle">
      <header className="hud">
        <div className="hud-row">
          <div className="hud-stage">
            <span className="hud-stage-num">Stage {s.stage}</span>
            <span className="hud-faction" style={{ color: faction.color }}>{faction.name}</span>
          </div>
          <button type="button" className="icon-btn" onClick={onSettings} aria-label="Settings">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5m9.4 4.6.1-1.1-.1-1.1 2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.9-1.1L16.8 3h-4l-.4 2.4c-.7.3-1.3.7-1.9 1.1l-2.3-.9-2 3.4 2 1.5-.1 1.1.1 1.1-2 1.5 2 3.4 2.3-.9c.6.5 1.2.8 1.9 1.1l.4 2.4h4l.4-2.4c.7-.3 1.3-.6 1.9-1.1l2.3.9 2-3.4z"
              />
            </svg>
          </button>
        </div>
        <div className="hud-row hud-res">
          <span className="res gold" title="Gold">
            <span className="res-icon" aria-hidden="true">&#9679;</span>{fmt(s.gold)}
          </span>
          <span className="res souls" title="Souls">
            <span className="res-icon" aria-hidden="true">&#10022;</span>{fmt(s.souls)}
          </span>
        </div>
      </header>

      <div className="enemy-area" onPointerDown={onTap}>
        <div className="enemy-name-row">
          {enemy.isBoss && <span className="boss-badge">BOSS</span>}
          <span className="enemy-name">{enemy.name}</span>
        </div>

        <div className="enemy-sprite-wrap">
          <Sprite kind="enemies" id={enemySpriteId(enemy)} size={132} className="enemy-sprite" alt={enemy.name} />
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

        {showFightBoss && (
          <button type="button" className="btn boss-btn" onClick={fightBoss} onPointerDown={e => e.stopPropagation()}>
            Fight boss
          </button>
        )}

        {floats.map(f => (
          <span
            key={f.id}
            className={f.crit ? 'dmg-float dmg-crit' : 'dmg-float'}
            style={{ left: f.x, top: f.y }}
          >
            {f.text}{f.crit ? '!' : ''}
          </span>
        ))}
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
