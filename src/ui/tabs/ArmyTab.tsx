import { memo } from 'react';
import type { GameState, UnitDef } from '../../game/types';
import { UNITS } from '../../game/data/units';
import { buyUnit, unitCost, unitMaxAffordable } from '../../game/engine';
import { unitDps } from '../../game/stats';
import { fmt } from '../../game/numbers';
import { mutate } from '../../store';
import Sprite from '../Sprite';

function Buy({ s, id, count, label }: { s: GameState; id: string; count: number; label: string }) {
  const ok = count > 0 && s.gold >= unitCost(s, id, count);
  return (
    <button
      type="button"
      className={ok ? 'btn small buy' : 'btn small buy disabled'}
      disabled={!ok}
      onClick={() => mutate(st => { buyUnit(st, id, count); })}
    >
      <span className="buy-label">{label}</span>
      <span className="buy-cost">{count > 0 ? fmt(unitCost(s, id, count)) : '—'}</span>
    </button>
  );
}

function UnitRow({ s, u }: { s: GameState; u: UnitDef }) {
  const lvl = s.army[u.id] ?? 0;
  const max = unitMaxAffordable(s, u.id);
  return (
    <div className="card unit-row">
      <div className="unit-head">
        <Sprite kind="units" id={u.id} size={44} alt={u.name} className="row-sprite" />
        <div className="unit-info">
          <div className="row-title">{u.name}</div>
          <div className="row-sub dim">{u.desc}</div>
          <div className="row-sub">
            <span className="lvl">Lv {lvl}</span>
            <span className="accent"> {fmt(unitDps(u.id, lvl))} DPS</span>
          </div>
        </div>
      </div>
      <div className="unit-buys">
        <Buy s={s} id={u.id} count={1} label="x1" />
        <Buy s={s} id={u.id} count={10} label="x10" />
        <Buy s={s} id={u.id} count={max} label={`Max ${max}`} />
      </div>
    </div>
  );
}

function ArmyTab({ s }: { s: GameState }) {
  const unlocked = UNITS.filter(u => s.maxStage >= u.unlockStage);
  const next = UNITS.find(u => s.maxStage < u.unlockStage);
  return (
    <div className="tabpane">
      {unlocked.map(u => <UnitRow key={u.id} s={s} u={u} />)}
      {next && (
        <div className="card locked-row">
          <span className="row-title dim">???</span>
          <span className="row-sub dim">Unlocks at stage {next.unlockStage}</span>
        </div>
      )}
    </div>
  );
}

export default memo(ArmyTab);
