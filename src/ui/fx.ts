/**
 * Imperative, self-removing visual effects.
 *
 * Nothing here touches React state: every effect creates a DOM node (or animates
 * an existing one) with the Web Animations API and cleans itself up on finish, so
 * a burst of taps costs no re-renders.
 */

export function reducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supported(el: Element): boolean {
  return typeof (el as HTMLElement).animate === 'function';
}

/** Append a node, animate it, remove it when the animation ends. */
function ephemeral(host: HTMLElement, node: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions) {
  host.appendChild(node);
  if (!supported(node)) {
    setTimeout(() => node.remove(), 400);
    return;
  }
  const anim = node.animate(frames, opts);
  const drop = () => node.remove();
  anim.onfinish = drop;
  anim.oncancel = drop;
}

// One live animation per element for the retriggerable effects, so a fast tapper
// restarts rather than stacks (stacking is what makes this look janky).
const running = new WeakMap<Element, Animation>();

function retrigger(el: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions) {
  if (!supported(el)) return;
  running.get(el)?.cancel();
  const anim = el.animate(frames, opts);
  running.set(el, anim);
}

/** Enemy flinch: squash + white flash. Retriggers cleanly on every tap. */
export function hitReact(el: HTMLElement | null) {
  if (!el) return;
  if (reducedMotion()) {
    retrigger(el, [
      { filter: 'brightness(2.6) saturate(0.2)' },
      { filter: 'brightness(1) saturate(1)' },
    ], { duration: 150, easing: 'ease-out' });
    return;
  }
  retrigger(el, [
    { transform: 'scale(1, 1)', filter: 'brightness(1) saturate(1)' },
    { transform: 'scale(1.14, 0.86)', filter: 'brightness(3.2) saturate(0.1)', offset: 0.16 },
    { transform: 'scale(0.93, 1.07)', filter: 'brightness(1.5) saturate(0.7)', offset: 0.46 },
    { transform: 'scale(1, 1)', filter: 'brightness(1) saturate(1)' },
  ], { duration: 200, easing: 'ease-out' });
}

/** Hero lunges toward the enemy and snaps back. */
export function lunge(el: HTMLElement | null, dx: number, dy: number) {
  if (!el || reducedMotion()) return;
  retrigger(el, [
    { transform: 'translate(0, 0) rotate(0deg)' },
    { transform: `translate(${dx}px, ${dy}px) rotate(-7deg)`, offset: 0.3 },
    { transform: `translate(${dx * 0.35}px, ${dy * 0.3}px) rotate(-3deg)`, offset: 0.55 },
    { transform: 'translate(0, 0) rotate(0deg)' },
  ], { duration: 320, easing: 'cubic-bezier(.2,.9,.3,1)' });
}

/** Short screen shake — used on crits. */
export function shake(el: HTMLElement | null) {
  if (!el || reducedMotion()) return;
  retrigger(el, [
    { transform: 'translate(0, 0)' },
    { transform: 'translate(-6px, 3px)' },
    { transform: 'translate(5px, -3px)' },
    { transform: 'translate(-3px, 2px)' },
    { transform: 'translate(0, 0)' },
  ], { duration: 120, easing: 'linear' });
}

/** Expanding ring at the touch point. */
export function ripple(host: HTMLElement | null, x: number, y: number) {
  if (!host || reducedMotion()) return;
  const el = document.createElement('span');
  el.className = 'fx-ripple';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  ephemeral(host, el, [
    { transform: 'translate(-50%, -50%) scale(0.25)', opacity: 0.6 },
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
  ], { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)' });
}

/** Who dealt the hit — each source gets its own weight so the arena stays readable. */
export type HitSource = 'tap' | 'auto' | 'pet';

/**
 * Floating damage number: eases up and fades with a little horizontal jitter.
 * Player taps read loudest; auto-taps are small and dim and pet hits are violet,
 * so a busy idle screen never drowns out the damage the player caused.
 */
export function floatDamage(
  host: HTMLElement | null,
  x: number,
  y: number,
  text: string,
  crit: boolean,
  source: HitSource = 'tap',
) {
  if (!host) return;
  const el = document.createElement('span');
  el.className = `fx-dmg fx-dmg-${source}${crit ? ' fx-dmg-crit' : ''}`;
  el.textContent = crit ? `${text}!` : text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  if (reducedMotion()) {
    ephemeral(host, el, [
      { transform: 'translate(-50%, -50%)', opacity: 1 },
      { transform: 'translate(-50%, -50%)', opacity: 0 },
    ], { duration: 500, easing: 'linear' });
    return;
  }
  const quiet = source !== 'tap';
  const jitter = (Math.random() * 2 - 1) * (quiet ? 16 : 26);
  const rise = crit ? -104 : quiet ? -52 : -78;
  const pop = crit ? 1.3 : quiet ? 1 : 1.1;
  ephemeral(host, el, [
    { transform: 'translate(-50%, -50%) scale(0.7)', opacity: 0 },
    {
      transform: `translate(calc(-50% + ${jitter * 0.3}px), calc(-50% - ${quiet ? 10 : 16}px)) scale(${pop})`,
      opacity: 1,
      offset: 0.18,
    },
    {
      transform: `translate(calc(-50% + ${jitter}px), calc(-50% + ${rise}px)) scale(${crit ? 1.05 : 0.9})`,
      opacity: 0,
    },
  ], { duration: crit ? 900 : quiet ? 620 : 800, easing: 'cubic-bezier(.16,.9,.3,1)' });
}

/** One-shot centred announcement (boss escaped, …). */
export function announce(host: HTMLElement | null, text: string, tone: 'bad' | 'good' = 'bad') {
  if (!host) return;
  const el = document.createElement('div');
  el.className = `fx-announce fx-announce-${tone}`;
  el.textContent = text;
  ephemeral(host, el, reducedMotion()
    ? [{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
    : [
      { transform: 'translate(-50%, -50%) scale(0.86)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.16 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.74 },
      { transform: 'translate(-50%, -60%) scale(1)', opacity: 0 },
    ], { duration: 1700, easing: 'ease-out' });
}

export interface DeathOpts {
  src: string;
  x: number;
  y: number;
  size: number;
  color: string;
  boss?: boolean;
}

/**
 * Death dissolve: the corpse scales up and burns out while a burst of embers in
 * the faction colour flies outward. Rendered as a detached overlay because the
 * store has already swapped in the next enemy.
 */
export function deathBurst(host: HTMLElement | null, o: DeathOpts) {
  if (!host) return;
  const corpse = document.createElement('img');
  corpse.className = 'fx-corpse';
  corpse.src = o.src;
  corpse.width = o.size;
  corpse.height = o.size;
  corpse.alt = '';
  corpse.style.left = `${o.x}px`;
  corpse.style.top = `${o.y}px`;
  ephemeral(host, corpse, reducedMotion()
    ? [{ opacity: 0.8 }, { opacity: 0 }]
    : [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, filter: 'brightness(1) saturate(1)' },
      { transform: 'translate(-50%, -50%) scale(1.16)', opacity: 0.85, filter: 'brightness(2.8) saturate(0.3)', offset: 0.22 },
      { transform: 'translate(-50%, -50%) scale(1.45)', opacity: 0, filter: 'brightness(1.6) saturate(0.2)' },
    ], { duration: reducedMotion() ? 220 : 460, easing: 'ease-out' });

  if (reducedMotion()) return;

  const count = o.boss ? 12 : 9;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'fx-ember';
    p.style.left = `${o.x}px`;
    p.style.top = `${o.y}px`;
    p.style.background = o.color;
    const size = 4 + Math.random() * (o.boss ? 7 : 5);
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = (o.boss ? 82 : 58) * (0.55 + Math.random() * 0.75);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 18;
    ephemeral(host, p, [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% + ${dy * 0.55}px)) scale(0.9)`, opacity: 0.9, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 26}px)) scale(0.2)`, opacity: 0 },
    ], { duration: 520 + Math.random() * 260, easing: 'cubic-bezier(.2,.7,.4,1)' });
  }
}
