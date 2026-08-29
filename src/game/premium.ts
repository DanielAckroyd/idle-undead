import type { GameState } from './types';
import { AD_BOOSTS, AD_BOOSTS_PER_DAY, DAILY_SOULFIRE, IAP, SHOP, type Product } from './data/products';
import { derive } from './stats';
import { enemyGold, enemyMaxHp } from './data/enemies';
import { addItem, rollItem } from './items';
import { INVENTORY_CAP } from './data/items';

export const dayIndex = (ms: number) => Math.floor(ms / 86_400_000);

export function inventoryCap(s: GameState) { return INVENTORY_CAP + s.inventoryBonus; }

export function boostMults(s: GameState, now: number) {
  return { gold: s.boosts.goldUntil > now ? 2 : 1, damage: s.boosts.damageUntil > now ? 2 : 1 };
}

/** Gold from `hours` of idle play at the current stage (same formula as offline). */
export function timeSkipGold(s: GameState, hours: number): number {
  const d = derive(s);
  if (d.idleDps <= 0) return 0;
  const kills = (d.idleDps * hours * 3600) / enemyMaxHp(s.stage, false);
  return kills * enemyGold(s.stage, false) * d.goldMult;
}

export function claimDaily(s: GameState, now: number): number {
  const today = dayIndex(now);
  if (s.claimedDaily === today) return 0;
  const streak = s.claimedDaily === today - 1 ? (s.stats.dailyStreak ?? 0) + 1 : 0;
  s.stats.dailyStreak = streak;
  s.claimedDaily = today;
  const amt = DAILY_SOULFIRE[streak % DAILY_SOULFIRE.length];
  s.soulfire += amt;
  return amt;
}

export function canUseAdBoost(s: GameState, now: number): boolean {
  if (s.adsRemoved) return true;
  if (s.boosts.adBoostDay !== dayIndex(now)) return true;
  return s.boosts.adBoostsToday < AD_BOOSTS_PER_DAY;
}

/** Called after the ad completed (or immediately when ads are removed). */
export function applyAdBoost(s: GameState, id: (typeof AD_BOOSTS)[number]['id'], now: number): boolean {
  if (!canUseAdBoost(s, now)) return false;
  if (s.boosts.adBoostDay !== dayIndex(now)) { s.boosts.adBoostDay = dayIndex(now); s.boosts.adBoostsToday = 0; }
  if (!s.adsRemoved) s.boosts.adBoostsToday++;
  switch (id) {
    case 'ad_gold': s.boosts.goldUntil = Math.max(s.boosts.goldUntil, now) + 4 * 3600_000; break;
    case 'ad_damage': s.boosts.damageUntil = Math.max(s.boosts.damageUntil, now) + 3600_000; break;
    case 'ad_offline': s.boosts.offlineDoubleNext = true; break;
    case 'ad_boss': if (s.enemy.isBoss && s.enemy.timer !== undefined) s.enemy.timer = derive(s).bossTime; break;
  }
  return true;
}

/** Grant the entitlement for a completed real-money purchase (store already verified it). */
export function grantPurchase(s: GameState, productId: string, now: number): boolean {
  const p = IAP.find(p => p.id === productId);
  if (!p) return false;
  switch (p.kind) {
    case 'soulfire': s.soulfire += p.amount!; return true;
    case 'remove_ads': s.adsRemoved = true; return true;
    case 'starter':
      if (s.stats.starterBought) return false;
      s.stats.starterBought = 1;
      s.soulfire += p.amount!;
      addItem(s, rollItem(now, Math.max(s.stage, 5), undefined, 'epic'));
      s.gold += timeSkipGold(s, 12);
      return true;
    default: return false;
  }
}

export function buyShop(s: GameState, productId: string, now: number): { ok: boolean; why?: string } {
  const p: Product | undefined = SHOP.find(p => p.id === productId);
  if (!p || p.soulfire === undefined) return { ok: false, why: 'Unknown product' };
  if (p.kind === 'skin' && s.ownedSkins.includes(p.skinId!)) return { ok: false, why: 'Owned' };
  if (p.kind === 'timeskip' && timeSkipGold(s, p.amount!) <= 0) return { ok: false, why: 'You need idle damage first' };
  if (s.soulfire < p.soulfire) return { ok: false, why: 'Not enough Soulfire' };
  s.soulfire -= p.soulfire;
  switch (p.kind) {
    case 'timeskip': s.gold += timeSkipGold(s, p.amount!); s.stats.goldEarned += timeSkipGold(s, p.amount!); break;
    case 'inventory': s.inventoryBonus += p.amount!; break;
    case 'skin': s.ownedSkins.push(p.skinId!); break;
    case 'grave_chest': {
      s.stats.chestsOpened = (s.stats.chestsOpened ?? 0) + 1;
      const pity = s.stats.chestsOpened % 5 === 0;
      const rarity = pity ? 'legendary' : (['rare', 'rare', 'epic'] as const)[Math.floor(((now / 7) % 1) * 3)];
      addItem(s, rollItem(now ^ s.stats.chestsOpened, s.stage, undefined, rarity));
      break;
    }
  }
  return { ok: true };
}
