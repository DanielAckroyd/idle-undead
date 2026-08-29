/**
 * The skill tree as a graph, not a list.
 *
 * Nodes are hand-placed by `pos: [col, row]` in the class data and wired by their
 * explicit `requires`, so the layout here is pure presentation: a fixed grid, an
 * SVG edge layer beneath the nodes, and a pan/zoom viewport around both. Panning
 * is pointer-driven (drag, two-finger pinch) with buttons for the thumb-only case.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ClassDef, GameState } from '../game/types';
import { pointsInTier } from '../game/engine';
import Sprite from './Sprite';
import { classSpriteId } from './sprites';
import { GLYPH_PATHS, glyphFor, nodeState, type Glyph } from './skillNodes';

const COL = 110;   // horizontal spacing between columns
const ROW = 96;    // vertical spacing between rows
const PAD = 54;    // margin around the outermost node centres
const NODE = 58;
const CAPSTONE = 86;

const MIN_Z = 0.45;
const MAX_Z = 1.8;
const DRAG_SLOP = 6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const cx = (col: number) => PAD + col * COL;
const cy = (row: number) => PAD + row * ROW;

interface View { x: number; y: number; z: number }

/**
 * Keep the canvas inside the viewport: no panning off into empty space, and a
 * canvas smaller than the viewport is centred rather than pinned to a corner.
 */
function clampView(v: View, w: number, h: number, gw: number, gh: number): View {
  const cw = gw * v.z;
  const ch = gh * v.z;
  return {
    z: v.z,
    x: cw <= w ? (w - cw) / 2 : clamp(v.x, w - cw, 0),
    y: ch <= h ? (h - ch) / 2 : clamp(v.y, h - ch, 0),
  };
}

function GlyphIcon({ glyph }: { glyph: Glyph }) {
  return (
    <svg viewBox="0 0 24 24" className="node-glyph" aria-hidden="true">
      {GLYPH_PATHS[glyph].map((dPath, i) => (
        <path key={i} d={dPath} fill="currentColor" fillRule="evenodd" />
      ))}
    </svg>
  );
}

// ---------- ring ----------

const R = 45;
const CIRC = 2 * Math.PI * R;

function RankRing({ pct }: { pct: number }) {
  return (
    <svg viewBox="0 0 100 100" className="node-ring" aria-hidden="true">
      <circle className="node-ring-track" cx="50" cy="50" r={R} />
      {pct > 0 && (
        <circle
          className="node-ring-fill"
          cx="50"
          cy="50"
          r={R}
          strokeDasharray={`${pct * CIRC} ${CIRC}`}
          transform="rotate(-90 50 50)"
        />
      )}
    </svg>
  );
}

// ---------- graph ----------

interface Band { tier: 1 | 2 | 3; top: number; bottom: number; name: string }

function bands(c: ClassDef): Band[] {
  return ([1, 2, 3] as const).map(tier => {
    const rows = c.tree.filter(n => n.tier === tier).map(n => n.pos[1]);
    const top = cy(Math.min(...rows)) - ROW / 2;
    const bottom = cy(Math.max(...rows)) + ROW / 2;
    return { tier, top, bottom, name: c.tierNames[tier - 1] };
  });
}

interface Props {
  s: GameState;
  c: ClassDef;
  tier: 1 | 2 | 3;
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function SkillGraph({ s, c, tier, selected, onSelect }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 1 });

  const origins = useRef(new Map<number, { x: number; y: number }>());
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef(0);
  const dragged = useRef(false);

  const layout = useMemo(() => {
    const cols = c.tree.map(n => n.pos[0]);
    const rows = c.tree.map(n => n.pos[1]);
    return {
      w: cx(Math.max(...cols)) + PAD,
      h: cy(Math.max(...rows)) + PAD,
      bandList: bands(c),
    };
  }, [c]);

  // Open onto the tier the player is actually spending in, framed to fit.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    const band = layout.bandList.find(b => b.tier === tier) ?? layout.bandList[0];
    const z = clamp(Math.min(w / (layout.w + 16), h / (band.bottom - band.top + 24)), MIN_Z, 1.1);
    setView(clampView(
      { z, x: w / 2 - (layout.w / 2) * z, y: h / 2 - ((band.top + band.bottom) / 2) * z },
      w, h, layout.w, layout.h,
    ));
  }, [tier, layout, c.id]);

  // The viewport changes size whenever the drawer snaps or the detail sheet opens.
  // Re-fitting would throw away the player's own framing, so only re-clamp: the
  // graph stays exactly where it was, minus any space that just stopped existing.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      setView(v => clampView(v, w, h, layout.w, layout.h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);

  // Opening the sheet eats the bottom of the viewport, which is exactly where the
  // node you just tapped often is. Nudge it back into view once the sheet has laid
  // out (a frame later, after the resize observer has had its say).
  useEffect(() => {
    if (!selected) return;
    const node = c.tree.find(n => n.id === selected);
    const el = viewportRef.current;
    if (!node || !el) return;
    let frame = 0;
    const run = () => setView(v => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const nx = cx(node.pos[0]) * v.z + v.x;
      const ny = cy(node.pos[1]) * v.z + v.y;
      const m = (CAPSTONE / 2 + 26) * v.z;  // node radius plus its label
      let { x, y } = v;
      if (nx - m < 0) x += m - nx; else if (nx + m > w) x -= nx + m - w;
      if (ny - m < 0) y += m - ny; else if (ny + m > h) y -= ny + m - h;
      return clampView({ ...v, x, y }, w, h, layout.w, layout.h);
    });
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(run); });
    return () => cancelAnimationFrame(frame);
  }, [selected, c.tree, layout]);

  const zoomBy = useCallback((factor: number) => {
    const el = viewportRef.current;
    const w = el?.clientWidth ?? 0;
    const h = el?.clientHeight ?? 0;
    setView(v => {
      const z = clamp(v.z * factor, MIN_Z, MAX_Z);
      const k = z / v.z;
      // keep the viewport centre pinned while zooming
      return clampView({ z, x: w / 2 - (w / 2 - v.x) * k, y: h / 2 - (h / 2 - v.y) * k }, w, h, layout.w, layout.h);
    });
  }, [layout]);

  // Note: no setPointerCapture here. Touch pointers are implicitly captured by the
  // element they went down on, so a press that starts on a node still pans, while
  // capturing the viewport up-front would swallow the node's click.
  const onPointerDown = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    origins.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.current.size === 1) dragged.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }, []);

  const onPointerMove = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(ev.pointerId);
    if (!prev) return;
    const next = { x: ev.clientX, y: ev.clientY };
    pointers.current.set(ev.pointerId, next);
    const origin = origins.current.get(ev.pointerId) ?? prev;
    const pts = [...pointers.current.values()];

    if (pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDist.current > 0) {
        const rect = viewportRef.current?.getBoundingClientRect();
        const mx = (pts[0].x + pts[1].x) / 2 - (rect?.left ?? 0);
        const my = (pts[0].y + pts[1].y) / 2 - (rect?.top ?? 0);
        setView(v => {
          const z = clamp(v.z * (dist / pinchDist.current), MIN_Z, MAX_Z);
          const k = z / v.z;
          const el = viewportRef.current;
          return clampView({ z, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k },
            el?.clientWidth ?? 0, el?.clientHeight ?? 0, layout.w, layout.h);
        });
      }
      pinchDist.current = dist;
      dragged.current = true;
      return;
    }

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    // slop is measured from pointer-down, not per event, so slow smooth drags still pan
    if (!dragged.current && Math.abs(next.x - origin.x) + Math.abs(next.y - origin.y) > DRAG_SLOP) {
      dragged.current = true;
      // Only once a real drag begins: keeps a mouse pan alive outside the viewport.
      try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* already gone */ }
    }
    if (dragged.current) {
      const el = viewportRef.current;
      setView(v => clampView({ ...v, x: v.x + dx, y: v.y + dy },
        el?.clientWidth ?? 0, el?.clientHeight ?? 0, layout.w, layout.h));
    }
  }, [layout]);

  const onPointerUp = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(ev.pointerId);
    origins.current.delete(ev.pointerId);
    if (pointers.current.size < 2) pinchDist.current = 0;
  }, []);

  const pick = useCallback((id: string) => {
    // a drag that ended on a node is a pan, not a tap
    if (dragged.current) return;
    onSelect(id);
  }, [onSelect]);

  return (
    <div className="graph">
      <div
        className="graph-viewport"
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="graph-canvas"
          style={{
            width: layout.w,
            height: layout.h,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
          }}
        >
          {layout.bandList.map(b => (
            <div
              key={b.tier}
              className={b.tier <= tier ? 'tier-band open' : 'tier-band'}
              style={{ top: b.top, height: b.bottom - b.top }}
            >
              <span className="tier-band-label">T{b.tier} · {b.name}</span>
            </div>
          ))}

          <svg className="graph-edges" viewBox={`0 0 ${layout.w} ${layout.h}`} aria-hidden="true">
            {c.tree.flatMap(n => (n.requires ?? []).map(reqId => {
              const req = c.tree.find(x => x.id === reqId);
              if (!req) return null;
              const lit = (s.skills[reqId] ?? 0) > 0;
              return (
                <line
                  key={`${reqId}->${n.id}`}
                  className={lit ? 'edge lit' : 'edge'}
                  x1={cx(req.pos[0])}
                  y1={cy(req.pos[1])}
                  x2={cx(n.pos[0])}
                  y2={cy(n.pos[1])}
                />
              );
            }))}
          </svg>

          {c.tree.map(n => {
            const rank = s.skills[n.id] ?? 0;
            const state = nodeState(s, n);
            const size = n.capstone ? CAPSTONE : NODE;
            const need = n.capstone ? Math.max(0, c.tierThreshold[n.tier - 1] - pointsInTier(s, n.tier)) : 0;
            const cls = ['node', `node-${state}`];
            if (n.capstone) cls.push('node-capstone');
            if (selected === n.id) cls.push('node-sel');
            return (
              <button
                key={n.id}
                type="button"
                className={cls.join(' ')}
                style={{ left: cx(n.pos[0]) - size / 2, top: cy(n.pos[1]) - size / 2, width: size, height: size }}
                onClick={() => pick(n.id)}
                aria-label={`${n.name}, rank ${rank} of ${n.maxRank}, ${state}`}
              >
                <RankRing pct={rank / n.maxRank} />
                <span className="node-face">
                  {n.capstone
                    ? <Sprite kind="classes" id={classSpriteId(c.id, Math.min(3, n.tier + 1))} size={size - 26} className="node-evo" alt="" />
                    : <GlyphIcon glyph={glyphFor(n)} />}
                </span>
                <span className="node-name">{n.name}</span>
                {n.capstone && need > 0 && <span className="node-need">{need} to evolve</span>}
                {rank > 0 && <span className="node-rank">{rank}/{n.maxRank}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="graph-zoom">
        <button type="button" className="icon-btn zoom" onClick={() => zoomBy(1.28)} aria-label="Zoom in">+</button>
        <button type="button" className="icon-btn zoom" onClick={() => zoomBy(1 / 1.28)} aria-label="Zoom out">−</button>
      </div>
    </div>
  );
}
