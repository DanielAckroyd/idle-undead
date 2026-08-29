import { memo, useState } from 'react';
import type { ClassId, GameState, RelicDef } from '../../game/types';
import { RELICS } from '../../game/data/relics';
import { CLASS_LIST, fusionName } from '../../game/data/classes';
import { buyRelic, rebirth, relicCost, soulsOnRebirth } from '../../game/engine';
import { fmt } from '../../game/numbers';
import { mutate } from '../../store';

function RelicRow({ s, r }: { s: GameState; r: RelicDef }) {
  const rank = s.relics[r.id] ?? 0;
  const cost = relicCost(s, r.id);
  const maxed = rank >= r.maxRank;
  const needRebirths = (r.requiresRebirths ?? 0) > s.rebirths;
  const poor = s.souls < cost;
  const why = maxed
    ? 'Fully upgraded'
    : needRebirths
      ? `Requires ${r.requiresRebirths} rebirths`
      : poor
        ? `Need ${fmt(cost)} souls`
        : null;
  const ok = !maxed && !needRebirths && !poor;
  return (
    <div className={rank > 0 ? 'card relic-row owned' : 'card relic-row'}>
      <div className="unit-info">
        <div className="row-title">{r.name} <span className="rank">{rank}/{r.maxRank}</span></div>
        <div className="row-sub dim">{r.desc}</div>
        {why && <div className="row-sub warn">{why}</div>}
      </div>
      <button
        type="button"
        className={ok ? 'btn small buy' : 'btn small buy disabled'}
        disabled={!ok}
        title={why ?? 'Buy'}
        onClick={() => mutate(st => { buyRelic(st, r.id); })}
      >
        <span className="buy-label">Buy</span>
        <span className="buy-cost">{maxed ? '—' : `${fmt(cost)} ✦`}</span>
      </button>
    </div>
  );
}

function RebirthTab({ s }: { s: GameState }) {
  const [confirm, setConfirm] = useState(false);
  const [fusion, setFusion] = useState<ClassId | null>(null);
  const souls = soulsOnRebirth(s);
  const canFuse = (s.relics['r_pact'] ?? 0) > 0;
  const others = CLASS_LIST.filter(c => c.id !== s.classId);

  const doRebirth = () => {
    if (!confirm) { setConfirm(true); return; }
    mutate(st => { rebirth(st, canFuse ? fusion : null); });
    setConfirm(false);
  };

  return (
    <div className="tabpane">
      <div className="card rebirth-card">
        <div className="rebirth-souls">
          <span className="rebirth-num accent">{fmt(souls)}</span>
          <span className="dim"> souls on rebirth</span>
        </div>
        <p className="row-sub dim">
          Rebirth resets your stage, gold, hero level, skills, army, gear and pets. You keep
          Souls, Relics and any class unlocks — and you come back far stronger. Souls scale
          with your best stage: <b>floor((best / 10)^1.6)</b>. You need stage 20 to rebirth.
        </p>
        <div className="stat-line"><span>Best stage</span><b>{s.maxStage}</b></div>
        <div className="stat-line"><span>Souls held</span><b>{fmt(s.souls)}</b></div>
        <div className="stat-line"><span>Rebirths</span><b>{s.rebirths}</b></div>

        {canFuse && (
          <div className="fusion">
            <div className="tier-head"><span>Fusion (Grave Pact)</span></div>
            <label className="fusion-opt">
              <input type="radio" name="fusion" checked={fusion === null} onChange={() => setFusion(null)} />
              <span>No fusion</span>
            </label>
            {others.map(c => (
              <label key={c.id} className="fusion-opt">
                <input type="radio" name="fusion" checked={fusion === c.id} onChange={() => setFusion(c.id)} />
                <span>
                  {c.tierNames[0]} <span className="dim">&rarr; {fusionName(s.classId!, c.id)}</span>
                </span>
              </label>
            ))}
          </div>
        )}

        <button
          type="button"
          className={souls > 0 ? (confirm ? 'btn danger wide' : 'btn wide') : 'btn wide disabled'}
          disabled={souls <= 0}
          onClick={doRebirth}
        >
          {souls <= 0 ? 'Reach stage 20 to rebirth' : confirm ? 'Are you sure?' : `Rebirth for ${fmt(souls)} souls`}
        </button>
        {confirm && (
          <button type="button" className="btn ghost wide" onClick={() => setConfirm(false)}>Cancel</button>
        )}
      </div>

      <div className="tier-group">
        <div className="tier-head">
          <span>Relics</span>
          <span className="dim">{fmt(s.souls)} souls</span>
        </div>
        {RELICS.map(r => <RelicRow key={r.id} s={s} r={r} />)}
      </div>
    </div>
  );
}

export default memo(RebirthTab);
