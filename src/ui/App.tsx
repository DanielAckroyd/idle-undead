import { useCallback, useMemo, useState } from 'react';
import { resetGame, useGame } from '../store';
import { derive } from '../game/stats';
import { CLASSES } from '../game/data/classes';
import { ESSENCE_COLOR } from './theme';
import MainMenu from './MainMenu';
import ClassPicker from './ClassPicker';
import Battle from './Battle';
import BottomPanel from './BottomPanel';
import OfflineModal from './OfflineModal';
import SettingsModal from './SettingsModal';

type Screen = 'menu' | 'class' | 'game';

export default function App() {
  const s = useGame();
  const d = useMemo(() => derive(s), [s]);
  const [screen, setScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState(false);

  const openSettings = useCallback(() => setSettings(true), []);
  const closeSettings = useCallback(() => setSettings(false), []);
  const openMenu = useCallback(() => setScreen('menu'), []);
  const startGame = useCallback(() => setScreen('game'), []);

  const newGame = useCallback(() => {
    resetGame();
    setScreen('class');
  }, []);

  const afterReset = useCallback(() => {
    setSettings(false);
    setScreen('menu');
  }, []);

  const accent = s.classId ? ESSENCE_COLOR[CLASSES[s.classId].essence] : ESSENCE_COLOR.bone;
  // A save is only worth continuing once a class has been chosen.
  const save = s.classId ? { title: d.title, stage: s.stage } : null;
  const inGame = screen === 'game' && s.classId !== null;

  return (
    <div className="app" style={{ '--accent': accent } as React.CSSProperties}>
      {screen === 'menu' ? (
        <MainMenu save={save} onContinue={startGame} onNewGame={newGame} onSettings={openSettings} />
      ) : inGame ? (
        <>
          <Battle s={s} d={d} onSettings={openSettings} onMenu={openMenu} />
          <BottomPanel s={s} d={d} />
        </>
      ) : (
        <ClassPicker onChosen={startGame} onBack={openMenu} />
      )}
      {inGame && s.pendingOffline && <OfflineModal offline={s.pendingOffline} />}
      {settings && <SettingsModal onClose={closeSettings} onReset={afterReset} />}
    </div>
  );
}
