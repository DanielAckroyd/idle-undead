import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/types';
import type { Derived } from '../game/stats';
import { dayIndex } from '../game/premium';
import HeroTab from './tabs/HeroTab';
import SkillsTab from './tabs/SkillsTab';
import ArmyTab from './tabs/ArmyTab';
import GearTab from './tabs/GearTab';
import PetsTab from './tabs/PetsTab';
import ShopTab from './tabs/ShopTab';
import RebirthTab from './tabs/RebirthTab';

const TABS = ['Hero', 'Skills', 'Army', 'Gear', 'Pets', 'Shop', 'Rebirth'] as const;
type Tab = (typeof TABS)[number];

type Snap = 'peek' | 'half' | 'full';
const SNAPS: Snap[] = ['peek', 'half', 'full'];
/** Peek shows the grab handle plus the tab bar and nothing else. */
const PEEK_PX = 62;
const STORAGE_KEY = 'idle-undead-drawer';

function viewportHeight(): number {
  return typeof window === 'undefined' ? 800 : window.innerHeight;
}

/** The battle area never collapses below this, whatever the drawer wants. */
const BATTLE_MIN_PX = 200;

function maxDrawer(vh: number): number {
  return Math.max(PEEK_PX, Math.min(Math.round(vh * 0.85), vh - BATTLE_MIN_PX));
}

function snapHeight(snap: Snap, vh: number): number {
  if (snap === 'peek') return PEEK_PX;
  if (snap === 'half') return Math.round(vh * 0.45);
  return maxDrawer(vh);
}

function loadSnap(): Snap {
  try {
    const v = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (v === 'peek' || v === 'half' || v === 'full') return v;
  } catch { /* private mode, ignore */ }
  return 'half';
}

function saveSnap(snap: Snap) {
  try { globalThis.localStorage?.setItem(STORAGE_KEY, snap); } catch { /* ignore */ }
}

function BottomPanel({ s, d }: { s: GameState; d: Derived }) {
  const [tab, setTab] = useState<Tab>('Hero');
  const [snap, setSnap] = useState<Snap>(loadSnap);
  const [vh, setVh] = useState(viewportHeight);
  const [dragPx, setDragPx] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startH: number; moved: boolean } | null>(null);

  useEffect(() => { saveSnap(snap); }, [snap]);

  useEffect(() => {
    const onResize = () => setVh(viewportHeight());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cycle = useCallback(() => {
    setSnap(cur => SNAPS[(SNAPS.indexOf(cur) + 1) % SNAPS.length]);
  }, []);

  const onTab = useCallback((t: Tab) => {
    setTab(t);
    setSnap(cur => {
      if (cur === 'peek') return 'half';
      // tapping the tab you are already on cycles the drawer instead
      return t === tab ? SNAPS[(SNAPS.indexOf(cur) + 1) % SNAPS.length] : cur;
    });
  }, [tab]);

  const onHandleDown = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    ev.currentTarget.setPointerCapture(ev.pointerId);
    const startH = snapHeight(snap, vh);
    drag.current = { startY: ev.clientY, startH, moved: false };
    setDragPx(startH);
  }, [snap, vh]);

  const onHandleMove = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    const dr = drag.current;
    if (!dr) return;
    const dy = dr.startY - ev.clientY;
    if (Math.abs(dy) > 4) dr.moved = true;
    setDragPx(Math.max(PEEK_PX, Math.min(maxDrawer(vh), dr.startH + dy)));
  }, [vh]);

  const onHandleUp = useCallback(() => {
    const dr = drag.current;
    drag.current = null;
    if (!dr) return;
    if (!dr.moved) { setDragPx(null); cycle(); return; }
    setDragPx(cur => {
      const h = cur ?? dr.startH;
      let best = SNAPS[0];
      for (const sn of SNAPS) {
        if (Math.abs(snapHeight(sn, vh) - h) < Math.abs(snapHeight(best, vh) - h)) best = sn;
      }
      setSnap(best);
      return null;
    });
  }, [cycle, vh]);

  const height = dragPx ?? snapHeight(snap, vh);
  const open = height > PEEK_PX + 8;

  return (
    <section
      className={`panel panel-${snap}`}
      style={{ height, transition: dragPx === null ? 'height 0.22s cubic-bezier(.3,.8,.3,1)' : 'none' }}
    >
      <div
        className="grab"
        role="button"
        tabIndex={0}
        aria-label={`Drawer: ${snap}. Drag or tap to resize.`}
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(); } }}
      >
        <span className="grab-bar" />
      </div>

      <nav className="tabbar">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            className={t === tab ? 'tab active' : 'tab'}
            onClick={() => onTab(t)}
          >
            {t}
            {t === 'Skills' && d.skillPointsAvail > 0 && <span className="tab-dot" />}
            {t === 'Gear' && s.lastDrop && <span className="tab-dot drop" />}
            {t === 'Shop' && s.claimedDaily !== dayIndex(s.lastTick) && <span className="tab-dot shop" />}
          </button>
        ))}
      </nav>

      {open && (
        <div className="tabbody">
          {tab === 'Hero' && <HeroTab s={s} d={d} />}
          {tab === 'Skills' && <SkillsTab s={s} d={d} />}
          {tab === 'Army' && <ArmyTab s={s} d={d} />}
          {tab === 'Gear' && <GearTab s={s} d={d} />}
          {tab === 'Pets' && <PetsTab s={s} d={d} />}
          {tab === 'Shop' && <ShopTab s={s} d={d} />}
          {tab === 'Rebirth' && <RebirthTab s={s} />}
        </div>
      )}
    </section>
  );
}

export default memo(BottomPanel);
