import { useEffect, useSyncExternalStore } from 'react';
import type { ClassId, Enemy } from '../game/types';
import { FACTIONS } from '../game/data/enemies';

export type SpriteKind = 'classes' | 'enemies' | 'units' | 'pets';

/** Painted PNG (generated art). May not exist yet — always paired with a fallback. */
export function artUrl(kind: SpriteKind, id: string): string {
  return `/art/${kind}/${id}.png`;
}

/** Public path of the placeholder sprite. Files live in `public/sprites/<kind>/<id>.svg`. */
export function spriteUrl(kind: SpriteKind, id: string): string {
  return `/sprites/${kind}/${id}.svg`;
}

/** Painted portrait backdrop for a faction's zone. */
export function backdropUrl(factionId: string): string {
  return `/art/backgrounds/${factionId}.png`;
}

/** `${factionId}_${index}` for a normal enemy, `${factionId}_boss` for a boss. */
export function enemySpriteId(enemy: Enemy): string {
  if (enemy.isBoss) return `${enemy.factionId}_boss`;
  const faction = FACTIONS.find(f => f.id === enemy.factionId);
  const i = faction ? faction.enemies.indexOf(enemy.name) : -1;
  return `${enemy.factionId}_${i < 0 ? 0 : i}`;
}

/** `${classId}_${tier}` — tier is 1..3. */
export function classSpriteId(classId: ClassId, tier: number): string {
  return `${classId}_${tier}`;
}

// ---------- art availability registry ----------
//
// Painted assets are generated out-of-band and may land at any time. Rather than
// rendering a broken <img> and reacting to onError (which flashes), we probe each
// url once with an off-screen Image and remember the answer. Everything renders
// the fallback until the probe says the painted asset is there.

type ArtStatus = 'pending' | 'ok' | 'missing';

const status = new Map<string, ArtStatus>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribeArt(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function readStatus(url: string): ArtStatus | undefined {
  return status.get(url);
}

/** Start (once) checking whether a painted asset exists. Safe to call every render. */
export function probeArt(url: string): void {
  if (status.has(url)) return;
  if (typeof Image === 'undefined') {
    status.set(url, 'missing');
    return;
  }
  status.set(url, 'pending');
  const img = new Image();
  img.onload = () => {
    status.set(url, 'ok');
    emit();
  };
  img.onerror = () => {
    status.set(url, 'missing');
    emit();
  };
  img.src = url;
}

/** Force a url back to "missing" (an <img> for it failed after all). */
export function markArtMissing(url: string): void {
  if (status.get(url) === 'missing') return;
  status.set(url, 'missing');
  emit();
}

/** Non-reactive resolve, for imperative DOM effects. Never triggers a probe. */
export function resolveArt(preferred: string, fallback: string): string {
  return status.get(preferred) === 'ok' ? preferred : fallback;
}

/** Reactive resolve: returns `fallback` until `preferred` is known to load. */
export function useArt(preferred: string, fallback: string): string {
  const st = useSyncExternalStore(
    subscribeArt,
    () => readStatus(preferred),
    () => undefined,
  );
  useEffect(() => {
    probeArt(preferred);
  }, [preferred]);
  return st === 'ok' ? preferred : fallback;
}

/** Warm the cache for zone backdrops (current + next) without blocking render. */
export function preloadBackdrops(...factionIds: string[]): void {
  for (const id of factionIds) probeArt(backdropUrl(id));
}
