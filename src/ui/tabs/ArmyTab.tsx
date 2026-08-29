import { memo } from 'react';
import type { GameState, UnitDef } from '../../game/types';
import type { Derived } from '../../game/stats';
import { UNITS } from '../../game/data/units';
import { buyUnit, unitCost, unitMaxAffordable } from '../../game/engine';
import { fmt } from '../../game/numbers';
import { mutate } from '../../store';
import { effectiveUnitDps, plus, unitDelta } from '../deltas';
import Sprite from '../Sprite';

function Buy({ s, d, id, count, label }: { s: GameState; d: Derived; id: string; count: number; label: string }) {
  const cost = count > 0 ? unitCost(s, id, count) : 0;
  const ok = count > 0 && s.gold >= cost;
  // Effective DPS, i.e. what the header would move by — not the unit's raw sheet DPS.
  const gain = unitDelta(s, d, id, count);
  return (
    <button
      type="button"
      className={ok ? 'btn small buy' : 'btn small buy disabled'}
      disabled={!ok}
      onClick={() => mutate(st => { buyUnit(st, id, count); })}
    >
      <span className="buy-label">{label}</span>
      <span className="buy-gain">{plus(gain, 'DPS')}</span>
      <span className="buy-cost">{count > 0 ? fmt(cost) : '—'}</span>
    </button>
  );
}

function UnitRow({ s, d, u }: { s: GameState; d: Derived; u: UnitDef }) {
  const lvl = s.army[u.id] ?? 0;
  const max = unitMaxAffordable(s, u.id);
  const effective = effectiveUnitDps(s, d, u.id);
  return (
    <div className="card unit-row">
      <div className="unit-head">
        <Sprite kind="units" id={u.id} size={44} alt={u.name} className="row-sprite" />
        <div className="unit-info">
          <div className="row-title">{u.name}</div>
          <div className="row-sub dim">{u.desc}</div>
          <div className="row-sub">
            <span className="lvl">Lv {lvl}</span>
            <span className="accent"> {fmt(effective)} DPS</span>
            <span className="dim"> after multipliers</span>
          </div>
        </div>
      </div>
      <div className="unit-buys">
        <Buy s={s} d={d} id={u.id} count={1} label="x1" />
        <Buy s={s} d={d} id={u.id} count={10} label="x10" />
        <Buy s={s} d={d} id={u.id} count={max} label={`Max ${max}`} />
      </div>
    </div>
  );
}

function ArmyTab({ s, d }: { s: GameState; d: Derived }) {
  const unlocked = UNITS.filter(u => s.maxStage >= u.unlockStage);
  const next = UNITS.find(u => s.maxStage < u.unlockStage);
  return (
    <div className="tabpane">
      <div className="card note">
        Army DPS <b className="accent">{fmt(d.armyDps)}</b> &middot; rows show each unit&rsquo;s share
        <i> after</i> every multiplier, so they add up to the header.
      </div>
      {unlocked.map(u => <UnitRow key={u.id} s={s} d={d} u={u} />)}
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
