import { memo } from 'react';
import type { GameState } from '../../game/types';
import type { Derived } from '../../game/stats';
import { buyHero, heroCost, heroMaxAffordable } from '../../game/engine';
import { fmt } from '../../game/numbers';
import { mutate } from '../../store';
import { classSpriteId } from '../sprites';
import Sprite from '../Sprite';

function BuyButton({ s, count, label }: { s: GameState; count: number; label: string }) {
  const affordable = count > 0 && s.gold >= heroCost(s, count);
  return (
    <button
      type="button"
      className={affordable ? 'btn buy' : 'btn buy disabled'}
      disabled={!affordable}
      onClick={() => mutate(st => { buyHero(st, count); })}
    >
      <span className="buy-label">{label}</span>
      <span className="buy-cost">{count > 0 ? fmt(heroCost(s, count)) : '—'}</span>
    </button>
  );
}

function HeroTab({ s, d }: { s: GameState; d: Derived }) {
  const max = heroMaxAffordable(s);
  return (
    <div className="tabpane">
      <div className="card hero-card">
        <Sprite kind="classes" id={classSpriteId(s.classId!, d.tier)} size={56} alt={d.title} className="hero-sprite" />
        <div className="hero-info">
          <div className="row-title">{d.title}</div>
          <div className="row-sub">Level {s.heroLevel}</div>
          <div className="row-sub accent">Tap damage {fmt(d.tapDamage)}</div>
          <div className="row-sub dim">
            Crit {Math.round(d.critChance * 100)}% for {d.critMult.toFixed(1)}x
          </div>
        </div>
      </div>

      <div className="buy-grid">
        <BuyButton s={s} count={1} label="Level x1" />
        <BuyButton s={s} count={10} label="Level x10" />
        <BuyButton s={s} count={100} label="Level x100" />
        <BuyButton s={s} count={max} label={`Max (${max})`} />
      </div>

      <div className="card stats-card">
        <div className="stat-line"><span>Kills</span><b>{fmt(s.stats.kills)}</b></div>
        <div className="stat-line"><span>Taps</span><b>{fmt(s.stats.taps)}</b></div>
        <div className="stat-line"><span>Gold earned</span><b>{fmt(s.stats.goldEarned)}</b></div>
        <div className="stat-line"><span>Best stage</span><b>{s.maxStage}</b></div>
        <div className="stat-line"><span>Rebirths</span><b>{s.rebirths}</b></div>
      </div>
    </div>
  );
}

export default memo(HeroTab);
