import { useMemo, useState } from 'react';
import { backdropUrl, useArt } from './sprites';
import { Sigil } from './Icons';

interface MainMenuProps {
  /** Set when a save with a chosen class exists. */
  save: { title: string; stage: number } | null;
  onContinue: () => void;
  onNewGame: () => void;
  onSettings: () => void;
}

const MENU_FACTION = 'demons';
const MENU_COLOR = '#b03a48';

export default function MainMenu({ save, onContinue, onNewGame, onSettings }: MainMenuProps) {
  const [confirm, setConfirm] = useState(false);
  const [credits, setCredits] = useState(false);
  const bg = useArt(backdropUrl(MENU_FACTION), '');

  const backdrop = useMemo<React.CSSProperties>(() => ({
    backgroundColor: '#0a0a10',
    backgroundImage: bg
      ? `url(${bg})`
      : `radial-gradient(110% 62% at 50% 12%, color-mix(in srgb, ${MENU_COLOR} 46%, #14141d) 0%, #08080b 62%),`
        + ` linear-gradient(180deg, transparent 44%, color-mix(in srgb, ${MENU_COLOR} 24%, #06060a) 100%)`,
  }), [bg]);

  const newGame = () => {
    if (save && !confirm) { setConfirm(true); return; }
    setConfirm(false);
    onNewGame();
  };

  return (
    <div className="menu">
      <div className="menu-bg" style={backdrop} aria-hidden="true" />
      {/* Until the painted menu art lands, an emblem keeps the screen from reading empty. */}
      {!bg && <Sigil className="menu-sigil" />}
      <div className="menu-vignette" aria-hidden="true" />

      <div className="menu-inner">
        <div className="menu-head">
          <h1 className="menu-title">Idle Undead</h1>
          <p className="menu-sub">Rise. Raise an army. Ruin the living.</p>
        </div>

        <div className="menu-actions">
          {save && (
            <button type="button" className="btn menu-btn primary" onClick={onContinue}>
              <span className="menu-btn-label">Continue</span>
              <span className="menu-btn-note">{save.title} &middot; Stage {save.stage}</span>
            </button>
          )}
          <button type="button" className={confirm ? 'btn menu-btn danger' : 'btn menu-btn'} onClick={newGame}>
            <span className="menu-btn-label">{confirm ? 'Erase your run?' : 'New Game'}</span>
            {confirm && <span className="menu-btn-note">Your save is overwritten. Tap again to confirm.</span>}
          </button>
          {confirm && (
            <button type="button" className="btn menu-btn ghost" onClick={() => setConfirm(false)}>
              <span className="menu-btn-label">Cancel</span>
            </button>
          )}
          <button type="button" className="btn menu-btn" onClick={onSettings}>
            <span className="menu-btn-label">Settings</span>
          </button>
          <button type="button" className="btn menu-btn" onClick={() => setCredits(true)}>
            <span className="menu-btn-label">Credits</span>
          </button>
        </div>

        <p className="menu-foot dim">v0.1 &middot; a grave-robbed idle RPG</p>
      </div>

      {credits && (
        <div className="modal-scrim" onClick={() => setCredits(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Credits</h2>
            <p className="modal-body">
              <b className="accent">Idle Undead</b><br />
              Design, code and art direction: the crypt crew.<br />
              Painted art generated in-house; everything else is hand-rolled —
              no engines, no UI libraries, no network fonts.
            </p>
            <button type="button" className="btn ghost wide" onClick={() => setCredits(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
