/**
 * Store / ads abstraction. The game only talks to this interface.
 * Dev + web: FakeStore (instant success, logs). Native: swap in RevenueCat + AdMob
 * implementations (Capacitor plugins) behind the same interface. Consent must be
 * collected before `init()` on native.
 */
export interface MonetizationService {
  init(): Promise<void>;
  /** Real-money purchase; resolves with true only after the store verified the transaction. */
  purchase(productId: string): Promise<boolean>;
  restore(): Promise<string[]>;
  /** Show a rewarded ad; resolves true when the reward was earned. */
  showRewardedAd(placement: string): Promise<boolean>;
  adsAvailable(): boolean;
}

export class FakeStore implements MonetizationService {
  purchased = new Set<string>();
  async init() { /* nothing */ }
  async purchase(productId: string) {
    if (typeof window !== 'undefined' && !window.confirm(`[DEV STORE] Buy ${productId}?`)) return false;
    this.purchased.add(productId);
    return true;
  }
  async restore() { return [...this.purchased]; }
  async showRewardedAd(placement: string) {
    if (typeof window === 'undefined') return true;
    return window.confirm(`[DEV AD] Watch a rewarded ad for "${placement}"?`);
  }
  adsAvailable() { return true; }
}

let service: MonetizationService = new FakeStore();
export function setMonetization(s: MonetizationService) { service = s; }
export function monetization() { return service; }
