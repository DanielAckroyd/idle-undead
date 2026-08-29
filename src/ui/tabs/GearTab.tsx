import { memo, useMemo, useState } from 'react';
import type { Effect, GameState, GearSlot, Item } from '../../game/types';
import type { Derived } from '../../game/stats';
import { INVENTORY_CAP, RARITIES, RARITY_INFO, REFORGE_COST, SET_BONUS, SLOTS } from '../../game/data/items';
import { activeSets, compareEquip, equip, reforge, salvage, unequip } from '../../game/items';
import { mutate } from '../../store';
import { effectText } from '../effects';
import { ESSENCE_NAME } from '../theme';
import { equipDelta, plus } from '../deltas';
import { fmt } from '../../game/numbers';

const SLOT_NAMES: Record<GearSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  crown: 'Crown',
  trinket: 'Trinket',
  charm: 'Charm',
};

function rarityName(r: Item['rarity']): string {
  return r.charAt(0).toUpperCase() + r.slice(1);
}

/** effectText, but with an explicit sign so a downgrade reads as one. */
function signed(effect: Effect, v: number): string {
  const body = effectText(effect, Math.abs(v)).replace(/^\+/, '');
  return `${v < 0 ? '−' : '+'}${body}`;
}

function SlotChip({ s, slot, sel, onSelect }: { s: GameState; slot: GearSlot; sel: string | null; onSelect: (uid: string | null) => void }) {
  const uid = s.equipped[slot];
  const it = uid ? s.inventory.find(i => i.uid === uid) : undefined;
  const color = it ? RARITY_INFO[it.rarity].color : 'var(--line)';
  return (
    <button
      type="button"
      className={it && sel === it.uid ? 'slot-chip sel' : 'slot-chip'}
      style={{ '--rarity': color } as React.CSSProperties}
      onClick={() => onSelect(it ? it.uid : null)}
    >
      <span className="slot-chip-slot">{SLOT_NAMES[slot]}</span>
      <span className="slot-chip-name">{it ? it.name : 'empty'}</span>
    </button>
  );
}

function ItemCard({ s, d, it, onClose }: { s: GameState; d: Derived; it: Item; onClose: () => void }) {
  const info = RARITY_INFO[it.rarity];
  const isEquipped = s.equipped[it.slot] === it.uid;
  const cmp = useMemo(() => (isEquipped ? {} : compareEquip(s, it.uid)), [s, it.uid, isEquipped]);
  const gain = useMemo(
    () => (isEquipped ? { tap: 0, dps: 0 } : equipDelta(s, d, it.uid)),
    [isEquipped, s, d, it.uid],
  );
  const cost = REFORGE_COST[it.rarity];
  const cmpKeys = Object.keys(cmp) as Effect[];

  return (
    <div className="card item-card" style={{ '--rarity': info.color } as React.CSSProperties}>
      <div className="item-head">
        <div>
          <div className="item-name">{it.name}</div>
          <div className="row-sub dim">
            {rarityName(it.rarity)} {SLOT_NAMES[it.slot]} &middot; i{it.ilvl}
            {it.essence && <> &middot; <span className="ess-tag">{ESSENCE_NAME[it.essence]}</span></>}
          </div>
        </div>
        <button type="button" className="icon-btn small" onClick={onClose} aria-label="Close item">&times;</button>
      </div>

      <div className="affix-list">
        {it.affixes.map((a, i) => (
          <div key={`${a.effect}-${i}`} className="affix">
            <span className="affix-text accent">{effectText(a.effect, a.value)}</span>
            <span className="affix-q" aria-label={`roll quality ${Math.round(a.q * 100)}%`}>
              <span className="affix-q-fill" style={{ width: `${Math.round(a.q * 100)}%` }} />
            </span>
            <button
              type="button"
              className={s.scrap >= cost ? 'btn tiny' : 'btn tiny disabled'}
              disabled={s.scrap < cost}
              title={`Reforge this affix for ${cost} scrap`}
              onClick={() => mutate(st => { reforge(st, it.uid, i, Date.now() + i); })}
            >
              Reforge {cost}
            </button>
          </div>
        ))}
      </div>

      {!isEquipped && cmpKeys.length > 0 && (
        <div className="compare">
          <div className="tier-head"><span>vs equipped</span></div>
          {cmpKeys.map(k => (
            <div key={k} className={(cmp[k] ?? 0) >= 0 ? 'cmp up' : 'cmp down'}>{signed(k, cmp[k] ?? 0)}</div>
          ))}
        </div>
      )}

      <div className="item-actions">
        {isEquipped ? (
          <button type="button" className="btn small" onClick={() => mutate(st => unequip(st, it.slot))}>
            Unequip
          </button>
        ) : (
          <button type="button" className="btn small buy" onClick={() => mutate(st => { equip(st, it.uid); })}>
            <span className="buy-label">Equip</span>
            <span className="buy-gain">
              {gain.tap === 0 && gain.dps === 0
                ? 'no tap/DPS change'
                : `${gain.tap !== 0 ? plus(gain.tap, 'tap') : ''}${gain.tap !== 0 && gain.dps !== 0 ? ' · ' : ''}${gain.dps !== 0 ? plus(gain.dps, 'DPS') : ''}`}
            </span>
          </button>
        )}
        <button
          type="button"
          className="btn small quiet-danger"
          onClick={() => { mutate(st => { salvage(st, it.uid); }); onClose(); }}
        >
          Salvage +{info.scrap}
        </button>
      </div>
    </div>
  );
}

function GearTab({ s, d }: { s: GameState; d: Derived }) {
  const [sel, setSel] = useState<string | null>(null);
  const selected = sel ? s.inventory.find(i => i.uid === sel) : undefined;
  const sets = activeSets(s);

  // Freshest drop first, then rarity — the thing you just earned is what you want.
  const sorted = useMemo(() => {
    const rank = (it: Item) => (it.uid === s.lastDrop ? 99 : RARITIES.indexOf(it.rarity));
    return [...s.inventory].sort((a, b) => rank(b) - rank(a) || b.ilvl - a.ilvl || a.name.localeCompare(b.name));
  }, [s.inventory, s.lastDrop]);

  return (
    <div className="tabpane">
      <div className="card note gear-top">
        <span>Scrap <b className="accent">{fmt(s.scrap)}</b></span>
        <span className="dim">{s.inventory.length}/{INVENTORY_CAP} items</span>
      </div>

      {sets.length > 0 && (
        <div className="card set-card">
          {sets.map(e => (
            <div key={e} className="row-sub">
              <b className="accent">{SET_BONUS[e].name}</b> <span className="dim">{SET_BONUS[e].desc}</span>
            </div>
          ))}
        </div>
      )}

      <div className="slot-row">
        {SLOTS.map(slot => <SlotChip key={slot} s={s} slot={slot} sel={sel} onSelect={setSel} />)}
      </div>

      {selected && <ItemCard s={s} d={d} it={selected} onClose={() => setSel(null)} />}

      <div className="tier-head">
        <span>Inventory</span>
        <span className="dim">bosses drop gear</span>
      </div>

      {sorted.length === 0 ? (
        <div className="card locked-row">
          <span className="row-title dim">No gear yet</span>
          <span className="row-sub dim">Every boss you kill drops an item.</span>
        </div>
      ) : (
        <div className="inv-grid">
          {sorted.map(it => {
            const eq = s.equipped[it.slot] === it.uid;
            return (
              <button
                key={it.uid}
                type="button"
                className={`inv-cell${sel === it.uid ? ' sel' : ''}${eq ? ' equipped' : ''}`}
                style={{ '--rarity': RARITY_INFO[it.rarity].color } as React.CSSProperties}
                onClick={() => setSel(cur => (cur === it.uid ? null : it.uid))}
              >
                <span className="inv-name">{it.name}</span>
                <span className="inv-meta">{SLOT_NAMES[it.slot]} &middot; i{it.ilvl}</span>
                {it.essence && <span className="inv-ess">{ESSENCE_NAME[it.essence]}</span>}
                {eq && <span className="inv-eq" aria-label="equipped">E</span>}
                {it.uid === s.lastDrop && !eq && <span className="inv-eq inv-new">NEW</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default memo(GearTab);
