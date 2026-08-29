import type { GameState } from './types';
import { newGame, SAVE_VERSION } from './engine';

const KEY = 'idle-undead-save';

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export function deserialize(json: string): GameState | null {
  try {
    const raw = JSON.parse(json) as Partial<GameState>;
    if (!raw || typeof raw !== 'object' || raw.version !== SAVE_VERSION) return null;
    // fill any newly-added fields with defaults
    return { ...newGame(raw.seed ?? Date.now()), ...raw };
  } catch {
    return null;
  }
}

export function loadSave(): GameState | null {
  try {
    const json = globalThis.localStorage?.getItem(KEY);
    return json ? deserialize(json) : null;
  } catch { return null; }
}

export function writeSave(s: GameState) {
  try { globalThis.localStorage?.setItem(KEY, serialize(s)); } catch { /* ignore */ }
}

export function clearSave() {
  try { globalThis.localStorage?.removeItem(KEY); } catch { /* ignore */ }
}
