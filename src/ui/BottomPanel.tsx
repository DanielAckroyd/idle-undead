import { memo, useState } from 'react';
import type { GameState } from '../game/types';
import type { Derived } from '../game/stats';
import HeroTab from './tabs/HeroTab';
import SkillsTab from './tabs/SkillsTab';
import ArmyTab from './tabs/ArmyTab';
import GearTab from './tabs/GearTab';
import PetsTab from './tabs/PetsTab';
import RebirthTab from './tabs/RebirthTab';

const TABS = ['Hero', 'Skills', 'Army', 'Gear', 'Pets', 'Rebirth'] as const;
type Tab = (typeof TABS)[number];

function BottomPanel({ s, d }: { s: GameState; d: Derived }) {
  const [tab, setTab] = useState<Tab>('Hero');
  return (
    <section className="panel">
      <nav className="tabbar">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            className={t === tab ? 'tab active' : 'tab'}
            onClick={() => setTab(t)}
          >
            {t}
            {t === 'Skills' && d.skillPointsAvail > 0 && <span className="tab-dot" />}
          </button>
        ))}
      </nav>
      <div className="tabbody">
        {tab === 'Hero' && <HeroTab s={s} d={d} />}
        {tab === 'Skills' && <SkillsTab s={s} d={d} />}
        {tab === 'Army' && <ArmyTab s={s} />}
        {tab === 'Gear' && <GearTab s={s} />}
        {tab === 'Pets' && <PetsTab s={s} />}
        {tab === 'Rebirth' && <RebirthTab s={s} />}
      </div>
    </section>
  );
}

export default memo(BottomPanel);
