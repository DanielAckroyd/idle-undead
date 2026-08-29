import { memo } from 'react';
import type { GameState, PetDef } from '../../game/types';
import { PETS } from '../../game/data/pets';
import { buyPet, petCost, setActivePet } from '../../game/engine';
import { fmt } from '../../game/numbers';
import { mutate } from '../../store';
import Sprite from '../Sprite';
import { effectsText } from '../effects';

function PetRow({ s, p }: { s: GameState; p: PetDef }) {
  const lvl = s.pets[p.id] ?? 0;
  const cost = petCost(s, p.id);
  const ok = s.gold >= cost;
  const active = s.activePet === p.id;
  return (
    <div className={active ? 'card pet-row active' : 'card pet-row'}>
      <div className="unit-head">
        <Sprite kind="pets" id={p.id} size={44} alt={p.name} className="row-sprite" />
        <div className="unit-info">
          <div className="row-title">
            {p.name}
            {active && <span className="evo-badge">ACTIVE</span>}
          </div>
          <div className="row-sub dim">{p.desc}</div>
          <div className="row-sub">
            <span className="lvl">Lv {lvl}</span>
            <span className="accent"> {effectsText(p.passive)} per level</span>
          </div>
          {lvl > 0 && (
            <div className="row-sub dim">Attacks every {p.interval}s for {fmt(p.dmgMult * lvl)}x tap damage</div>
          )}
        </div>
      </div>
      <div className="unit-buys">
        <button
          type="button"
          className={ok ? 'btn small buy' : 'btn small buy disabled'}
          disabled={!ok}
          onClick={() => mutate(st => { buyPet(st, p.id); })}
        >
          <span className="buy-label">{lvl > 0 ? 'Level up' : 'Buy'}</span>
          <span className="buy-cost">{fmt(cost)}</span>
        </button>
        <button
          type="button"
          className={lvl > 0 && !active ? 'btn small' : 'btn small disabled'}
          disabled={lvl === 0 || active}
          onClick={() => mutate(st => setActivePet(st, p.id))}
        >
          {active ? 'Active' : 'Set active'}
        </button>
      </div>
    </div>
  );
}

function PetsTab({ s }: { s: GameState }) {
  const unlocked = PETS.filter(p => s.maxStage >= p.unlockStage);
  const next = PETS.find(p => s.maxStage < p.unlockStage);
  const active = PETS.find(p => p.id === s.activePet);
  return (
    <div className="tabpane">
      <div className="card note">
        Active pet: <b className="accent">{active ? active.name : 'none'}</b>. Every owned pet keeps giving its passive.
      </div>
      {unlocked.map(p => <PetRow key={p.id} s={s} p={p} />)}
      {next && (
        <div className="card locked-row">
          <span className="row-title dim">???</span>
          <span className="row-sub dim">Unlocks at stage {next.unlockStage}</span>
        </div>
      )}
    </div>
  );
}

export default memo(PetsTab);
