import { useCallback, useMemo, useState } from 'react';
import { useGame } from '../store';
import { derive } from '../game/stats';
import { CLASSES } from '../game/data/classes';
import { ESSENCE_COLOR } from './theme';
import ClassPicker from './ClassPicker';
import Battle from './Battle';
import BottomPanel from './BottomPanel';
import OfflineModal from './OfflineModal';
import SettingsModal from './SettingsModal';

export default function App() {
  const s = useGame();
  const d = useMemo(() => derive(s), [s]);
  const [settings, setSettings] = useState(false);
  const openSettings = useCallback(() => setSettings(true), []);
  const closeSettings = useCallback(() => setSettings(false), []);
  const accent = s.classId ? ESSENCE_COLOR[CLASSES[s.classId].essence] : ESSENCE_COLOR.bone;

  return (
    <div className="app" style={{ '--accent': accent } as React.CSSProperties}>
      {s.classId === null ? (
        <ClassPicker />
      ) : (
        <>
          <Battle s={s} d={d} onSettings={openSettings} />
          <BottomPanel s={s} d={d} />
        </>
      )}
      {s.pendingOffline && <OfflineModal offline={s.pendingOffline} />}
      {settings && <SettingsModal onClose={closeSettings} />}
    </div>
  );
}
