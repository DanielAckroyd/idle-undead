import { memo } from 'react';
import type { GameState, GearDef, GearSlot } from '../../game/types';
import { GEAR } from '../../game/data/gear';
import { buyGear, gearCost } from '../../game/engine';
import { fmt } from '../../game/numbers';
import { mutate } from '../../store';
import { effectText } from '../effects';

const SLOT_ORDER: GearSlot[] = ['weapon', 'armor', 'trinket', 'crown'];
const SLOT_NAMES: Record<GearSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  trinket: 'Trinket',
  crown: 'Crown',
};

function GearRow({ s, g }: { s: GameState; g: GearDef }) {
  const lvl = s.gear[g.id] ?? 0;
  const cost = gearCost(s, g.id);
  const ok = s.gold >= cost;
  const current = lvl > 0 ? g.base + g.perLevel * (lvl - 1) : 0;
  const next = lvl > 0 ? current + g.perLevel : g.base;
  return (
    <div className="card gear-row">
      <div className="unit-info">
        <div className="row-title">{g.name}</div>
        <div className="row-sub">
          <span className="lvl">Lv {lvl}</span>
          <span className="accent"> {lvl > 0 ? effectText(g.effect, current) : 'not owned'}</span>
        </div>
        <div className="row-sub dim">Next: {effectText(g.effect, next)}</div>
      </div>
      <button
        type="button"
        className={ok ? 'btn small buy' : 'btn small buy disabled'}
        disabled={!ok}
        onClick={() => mutate(st => { buyGear(st, g.id); })}
      >
        <span className="buy-label">{lvl > 0 ? 'Upgrade' : 'Buy'}</span>
        <span className="buy-cost">{fmt(cost)}</span>
      </button>
    </div>
  );
}

function GearTab({ s }: { s: GameState }) {
  const next = GEAR.find(g => s.maxStage < g.unlockStage);
  return (
    <div className="tabpane">
      {SLOT_ORDER.map(slot => {
        const items = GEAR.filter(g => g.slot === slot && s.maxStage >= g.unlockStage);
        if (items.length === 0) return null;
        return (
          <div key={slot} className="tier-group">
            <div className="tier-head"><span>{SLOT_NAMES[slot]}</span></div>
            {items.map(g => <GearRow key={g.id} s={s} g={g} />)}
          </div>
        );
      })}
      {next && (
        <div className="card locked-row">
          <span className="row-title dim">???</span>
          <span className="row-sub dim">Unlocks at stage {next.unlockStage}</span>
        </div>
      )}
    </div>
  );
}

export default memo(GearTab);
