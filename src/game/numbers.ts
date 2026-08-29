const SUFFIXES = ['', 'K', 'M', 'B', 'T'];

/** Format a number the idle-game way: 1.23K, 45.6M, 7.89aa … */
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return n < 10 ? n.toFixed(n % 1 === 0 ? 0 : 1) : Math.floor(n).toString();
  const exp = Math.floor(Math.log10(n) / 3);
  const mant = n / Math.pow(1000, exp);
  const mantStr = mant >= 100 ? mant.toFixed(0) : mant >= 10 ? mant.toFixed(1) : mant.toFixed(2);
  if (exp < SUFFIXES.length) return mantStr + SUFFIXES[exp];
  // aa, ab, ... az, ba ...
  const i = exp - SUFFIXES.length;
  const a = String.fromCharCode(97 + Math.floor(i / 26));
  const b = String.fromCharCode(97 + (i % 26));
  return mantStr + a + b;
}

export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Geometric cost: sum of base*r^i for i in [level, level+count). */
export function geomCost(base: number, r: number, level: number, count = 1): number {
  return base * Math.pow(r, level) * (Math.pow(r, count) - 1) / (r - 1);
}

/** Max count affordable starting at `level` with `money`. */
export function maxAffordable(base: number, r: number, level: number, money: number): number {
  const first = base * Math.pow(r, level);
  if (money < first) return 0;
  const n = Math.floor(Math.log(1 + (money * (r - 1)) / first) / Math.log(r));
  return Math.max(0, n);
}

/** Small deterministic PRNG (mulberry32) so the engine stays testable. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
