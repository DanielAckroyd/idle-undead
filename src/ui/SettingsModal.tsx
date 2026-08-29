import { useState } from 'react';
import { resetGame } from '../store';

export default function SettingsModal({ onClose, onReset }: { onClose: () => void; onReset?: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Settings</h2>
        <p className="modal-body dim">
          Progress saves to this device automatically. Animations follow your system
          &ldquo;reduce motion&rdquo; setting.
        </p>
        <button
          type="button"
          className={confirm ? 'btn danger wide' : 'btn wide'}
          onClick={() => {
            if (!confirm) { setConfirm(true); return; }
            resetGame();
            if (onReset) onReset(); else onClose();
          }}
        >
          {confirm ? 'Erase everything — are you sure?' : 'Reset game'}
        </button>
        <button type="button" className="btn ghost wide" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
