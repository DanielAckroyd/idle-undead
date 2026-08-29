import { memo } from 'react';
import type { GameState, SkillNode } from '../../game/types';
import type { Derived } from '../../game/stats';
import { CLASSES } from '../../game/data/classes';
import { canLearn, learnSkill, pointsInTier, tierUnlocked } from '../../game/engine';
import { mutate } from '../../store';
import Sprite from '../Sprite';
import { classSpriteId } from '../sprites';

const TIERS: (1 | 2 | 3)[] = [1, 2, 3];

function SkillRow({ s, node }: { s: GameState; node: SkillNode }) {
  const rank = s.skills[node.id] ?? 0;
  const check = canLearn(s, node.id);
  const maxed = rank >= node.maxRank;
  const cls = ['card', 'skill-row'];
  if (node.capstone) cls.push('capstone');
  if (rank > 0) cls.push('learned');
  return (
    <div className={cls.join(' ')}>
      <div className="skill-main">
        <div className="row-title">
          {node.name}
          {node.capstone && <span className="evo-badge">EVOLVE</span>}
        </div>
        <div className="row-sub dim">{node.desc}</div>
        {!check.ok && !maxed && check.why && <div className="row-sub warn">{check.why}</div>}
      </div>
      <div className="skill-side">
        <div className="rank">{rank}/{node.maxRank}</div>
        <button
          type="button"
          className={check.ok ? 'btn small' : 'btn small disabled'}
          disabled={!check.ok}
          title={check.why ?? 'Learn'}
          onClick={() => mutate(st => { learnSkill(st, node.id); })}
        >
          {maxed ? 'Max' : 'Learn'}
        </button>
      </div>
    </div>
  );
}

function SkillsTab({ s, d }: { s: GameState; d: Derived }) {
  const c = CLASSES[s.classId!];
  return (
    <div className="tabpane">
      <div className="card skills-head">
        <Sprite kind="classes" id={classSpriteId(c.id, d.tier)} size={56} alt={d.title} className="hero-sprite" />
        <div className="hero-info">
          <div className="row-title">
            {d.title} <span className="tier-badge">T{d.tier}</span>
          </div>
          <div className="row-sub accent">{d.skillPointsAvail} skill point{d.skillPointsAvail === 1 ? '' : 's'} available</div>
          <div className="row-sub dim">{d.skillPointsTotal} earned &middot; 1 per 10 hero levels &amp; per boss stage</div>
        </div>
      </div>

      {TIERS.map(tier => {
        const unlocked = tierUnlocked(s, tier);
        const spent = pointsInTier(s, tier);
        const need = tier < 3 ? c.tierThreshold[tier - 1] : null;
        return (
          <div key={tier} className={unlocked ? 'tier-group' : 'tier-group locked'}>
            <div className="tier-head">
              <span>Tier {tier}</span>
              <span className="dim">
                {unlocked
                  ? (need !== null ? `${spent} spent — ${need} unlocks tier ${tier + 1}` : `${spent} spent`)
                  : 'Locked'}
              </span>
            </div>
            {c.tree.filter(n => n.tier === tier).map(n => <SkillRow key={n.id} s={s} node={n} />)}
          </div>
        );
      })}
    </div>
  );
}

export default memo(SkillsTab);
