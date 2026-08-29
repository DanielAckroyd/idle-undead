import { memo, useCallback, useState } from 'react';
import type { Effect, GameState, SkillNode } from '../../game/types';
import type { Derived } from '../../game/stats';
import { CLASSES } from '../../game/data/classes';
import { canLearn, learnSkill, pointsInTier } from '../../game/engine';
import { mutate } from '../../store';
import Sprite from '../Sprite';
import { classSpriteId } from '../sprites';
import { effectText } from '../effects';
import SkillGraph from '../SkillGraph';
import { nodeState } from '../skillNodes';

/** One line per effect, scaled to `ranks` (1 = what a single rank grants). */
function effectLines(node: SkillNode, ranks: number): string[] {
  const out: string[] = [];
  for (const key in node.perRank) {
    const e = key as Effect;
    const v = node.perRank[e];
    if (v) out.push(effectText(e, v * ranks));
  }
  return out;
}

function SkillSheet({ s, nodeId, onClose }: { s: GameState; nodeId: string; onClose: () => void }) {
  const c = CLASSES[s.classId!];
  const node = c.tree.find(n => n.id === nodeId);
  if (!node) return null;
  const rank = s.skills[node.id] ?? 0;
  const check = canLearn(s, node.id);
  const maxed = rank >= node.maxRank;
  const state = nodeState(s, node);
  const need = node.capstone ? Math.max(0, c.tierThreshold[node.tier - 1] - pointsInTier(s, node.tier)) : 0;

  return (
    <div className={`skill-sheet skill-sheet-${state}`}>
      <div className="sheet-head">
        <div className="row-title">
          {node.name}
          {node.capstone && <span className="evo-badge">EVOLVE</span>}
          <span className="tier-badge dimtag">T{node.tier}</span>
        </div>
        <button type="button" className="icon-btn small" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="row-sub dim">{node.desc}</div>

      <div className="sheet-effects">
        <div className="sheet-cap">Per rank</div>
        {effectLines(node, 1).map(line => <div key={line} className="sheet-effect accent">{line}</div>)}
        {rank > 0 && (
          <>
            <div className="sheet-cap">At rank {rank}</div>
            {effectLines(node, rank).map(line => <div key={line} className="sheet-effect">{line}</div>)}
          </>
        )}
        {node.capstone && need > 0 && (
          <div className="row-sub warn">{need} more point{need === 1 ? '' : 's'} in tier {node.tier} to evolve</div>
        )}
      </div>

      <div className="sheet-foot">
        <div className="sheet-rank">
          <span className="dim">Rank</span> <b>{rank}/{node.maxRank}</b>
        </div>
        <button
          type="button"
          className={check.ok ? 'btn small learn' : 'btn small learn disabled'}
          disabled={!check.ok}
          onClick={() => mutate(st => { learnSkill(st, node.id); })}
        >
          <span className="buy-label">{maxed ? 'Maxed' : node.capstone ? 'Evolve' : 'Learn'}</span>
          {!check.ok && check.why && <span className="buy-gain">{check.why}</span>}
          {check.ok && <span className="buy-gain">1 skill point</span>}
        </button>
      </div>
    </div>
  );
}

function SkillsTab({ s, d }: { s: GameState; d: Derived }) {
  const c = CLASSES[s.classId!];
  const [picked, setPicked] = useState<string | null>(null);
  const close = useCallback(() => setPicked(null), []);

  return (
    <div className="skills-pane">
      <div className="skills-head">
        <Sprite kind="classes" id={classSpriteId(c.id, d.tier)} size={44} alt={d.title} className="hero-sprite" />
        <div className="hero-info">
          <div className="row-title">
            {d.title} <span className="tier-badge">T{d.tier}</span>
          </div>
          <div className="row-sub dim">{pointsInTier(s, d.tier)} spent in this tier</div>
        </div>
        <div className={d.skillPointsAvail > 0 ? 'sp-badge ready' : 'sp-badge'}>
          <b>{d.skillPointsAvail}</b>
          <span>point{d.skillPointsAvail === 1 ? '' : 's'}</span>
        </div>
      </div>

      <SkillGraph s={s} c={c} tier={d.tier} selected={picked} onSelect={setPicked} />

      {picked && <SkillSheet s={s} nodeId={picked} onClose={close} />}
    </div>
  );
}

export default memo(SkillsTab);
