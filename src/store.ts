import { useSyncExternalStore } from 'react';
import type { GameState } from './game/types';
import { applyOffline, newGame, tick } from './game/engine';
import { loadSave, writeSave } from './game/save';

let state: GameState = (() => {
  const s = loadSave() ?? newGame();
  applyOffline(s, Date.now());
  return s;
})();
const listeners = new Set<() => void>();

export function getState() { return state; }
export function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

/** Run a mutation against a shallow clone so React sees a new reference. */
export function mutate(fn: (s: GameState) => void) {
  const next: GameState = { ...state, enemy: { ...state.enemy }, stats: { ...state.stats },
    skills: { ...state.skills }, army: { ...state.army }, pets: { ...state.pets }, relics: { ...state.relics },
    inventory: state.inventory.map(i => ({ ...i, affixes: i.affixes.map(a => ({ ...a })) })), equipped: { ...state.equipped } };
  fn(next);
  state = next;
  for (const l of listeners) l();
}

export function useGame(): GameState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function resetGame() {
  state = newGame();
  writeSave(state);
  for (const l of listeners) l();
}

let running = false;
export function startLoop() {
  if (running) return;
  running = true;
  let last = performance.now();
  let saveAcc = 0;
  const step = () => {
    const now = performance.now();
    const dt = Math.min(1, (now - last) / 1000);
    last = now;
    // while hidden the sim pauses; visibilitychange applies the gap as offline time
    if (!document.hidden) {
      mutate(s => { tick(s, dt); s.lastTick = Date.now(); });
      saveAcc += dt;
      if (saveAcc > 5) { saveAcc = 0; writeSave(state); }
    }
    setTimeout(step, 100);
  };
  step();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { writeSave(state); }
    else { last = performance.now(); mutate(s => applyOffline(s, Date.now())); }
  });
  window.addEventListener('beforeunload', () => writeSave(state));
}
