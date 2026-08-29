import { fmt, fmtTime } from '../game/numbers';
import { mutate } from '../store';

export default function OfflineModal({ offline }: { offline: { seconds: number; gold: number } }) {
  return (
    <div className="modal-scrim">
      <div className="modal">
        <h2 className="modal-title">While you were away</h2>
        <p className="modal-body">
          You were gone for <b className="accent">{fmtTime(offline.seconds)}</b>.<br />
          Your army earned <b className="accent">{fmt(offline.gold)}</b> gold.
        </p>
        <button
          type="button"
          className="btn wide"
          onClick={() => mutate(s => { s.pendingOffline = null; })}
        >
          Claim
        </button>
      </div>
    </div>
  );
}
