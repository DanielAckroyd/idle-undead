import type { ClassDef } from '../game/types';
import { CLASS_LIST } from '../game/data/classes';
import { chooseClass } from '../game/engine';
import { mutate } from '../store';
import Sprite from './Sprite';
import { classSpriteId } from './sprites';
import { ESSENCE_COLOR, ESSENCE_NAME } from './theme';

function ClassCard({ c }: { c: ClassDef }) {
  const accent = ESSENCE_COLOR[c.essence];
  return (
    <button
      type="button"
      className="class-card"
      style={{ '--accent': accent } as React.CSSProperties}
      onClick={() => mutate(s => chooseClass(s, c.id))}
    >
      <div className="class-card-top">
        <Sprite kind="classes" id={classSpriteId(c.id, 1)} size={64} className="class-card-sprite" alt={c.tierNames[0]} />
        <div className="class-card-head">
          <span className="class-card-name">{c.tierNames[0]}</span>
          <span className="class-card-essence">{ESSENCE_NAME[c.essence]}</span>
        </div>
      </div>
      <p className="class-card-blurb">{c.blurb}</p>
      <div className="class-card-path">
        {c.tierNames.map((n, i) => (
          <span key={n} className="path-step">
            {i > 0 && <span className="path-arrow">&#8250;</span>}
            <span className={i === 0 ? 'path-name path-now' : 'path-name'}>{n}</span>
          </span>
        ))}
      </div>
    </button>
  );
}

export default function ClassPicker() {
  return (
    <div className="picker">
      <h1 className="picker-title">Idle Undead</h1>
      <p className="picker-sub">Choose the death you will wear.</p>
      <div className="picker-list">
        {CLASS_LIST.map(c => <ClassCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}
