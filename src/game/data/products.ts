export type ProductKind = 'soulfire' | 'remove_ads' | 'starter' | 'skin' | 'timeskip' | 'inventory' | 'grave_chest';

export interface Product {
  id: string;
  kind: ProductKind;
  name: string;
  desc: string;
  /** real-money SKU price label (store decides real price) */
  priceLabel?: string;
  /** soulfire price if bought with premium currency */
  soulfire?: number;
  amount?: number;      // soulfire granted / hours skipped / slots
  skinId?: string;
}

/** IAP (real money) — SKU ids map 1:1 to store products. */
export const IAP: Product[] = [
  { id: 'sf_small', kind: 'soulfire', name: 'Handful of Soulfire', desc: '120 Soulfire', priceLabel: '$1.99', amount: 120 },
  { id: 'sf_medium', kind: 'soulfire', name: 'Urn of Soulfire', desc: '700 Soulfire (+17%)', priceLabel: '$9.99', amount: 700 },
  { id: 'sf_large', kind: 'soulfire', name: 'Crypt of Soulfire', desc: '1,600 Soulfire (+33%)', priceLabel: '$19.99', amount: 1600 },
  { id: 'remove_ads', kind: 'remove_ads', name: 'Banish the Living Ads', desc: 'No ads, ever. Ad boosts become free buttons.', priceLabel: '$4.99' },
  { id: 'starter', kind: 'starter', name: 'Gravedigger\'s Pack', desc: '300 Soulfire + a guaranteed Epic drop + 12h time skip. One per account.', priceLabel: '$2.99', amount: 300 },
];

/** Soulfire shop (premium currency sinks). */
export const SHOP: Product[] = [
  { id: 'skip_4h', kind: 'timeskip', name: '4h Time Skip', desc: 'Instantly earn 4 hours of idle gold.', soulfire: 40, amount: 4 },
  { id: 'skip_12h', kind: 'timeskip', name: '12h Time Skip', desc: 'Instantly earn 12 hours of idle gold.', soulfire: 100, amount: 12 },
  { id: 'inv_10', kind: 'inventory', name: '+10 Inventory Slots', desc: 'Permanent.', soulfire: 80, amount: 10 },
  { id: 'chest', kind: 'grave_chest', name: 'Grave Chest', desc: 'One Rare-or-better item at your current stage. Every 5th chest is Legendary.', soulfire: 60 },
  { id: 'skin_skeleton_gilded', kind: 'skin', name: 'Gilded Bones', desc: 'Skeleton skin: gold-plated across all three tiers.', soulfire: 250, skinId: 'skeleton_gilded' },
  { id: 'skin_ghost_ember', kind: 'skin', name: 'Ember Wraith', desc: 'Ghost skin: burning orange spirit.', soulfire: 250, skinId: 'ghost_ember' },
  { id: 'skin_vampire_pale', kind: 'skin', name: 'Pale Court', desc: 'Vampire skin: white-and-silver nobility.', soulfire: 250, skinId: 'vampire_pale' },
  { id: 'skin_ghoul_plague', kind: 'skin', name: 'Plague Doctor', desc: 'Ghoul skin: beaked mask and black coat.', soulfire: 250, skinId: 'ghoul_plague' },
];

/** Rewarded-ad boosts (free with Remove Ads). */
export const AD_BOOSTS = [
  { id: 'ad_gold', name: '2× Gold', desc: 'Double gold for 4 hours.', hours: 4 },
  { id: 'ad_damage', name: '2× Damage', desc: 'Double all damage for 1 hour.', hours: 1 },
  { id: 'ad_offline', name: '2× Offline', desc: 'Double your next offline reward.' },
  { id: 'ad_boss', name: 'Boss Retry', desc: 'Reset the boss timer right now.' },
] as const;
export const AD_BOOSTS_PER_DAY = 6;

export const DAILY_SOULFIRE = [10, 10, 15, 15, 20, 25, 50]; // 7-day cycle
export const SOULFIRE_FIRST_ZONE_CLEAR = 15;
