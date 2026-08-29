/**
 * The shop.
 *
 * Every real-money and rewarded-ad action goes through `services/monetization`
 * first and only touches game state once the store (or the ad) reported success —
 * the UI never grants an entitlement on its own. With `adsRemoved` the ad boosts
 * become plain free buttons and the ad SDK is not called at all.
 */
import { memo, useCallback, useState } from 'react';
import type { GameState } from '../../game/types';
import type { Derived } from '../../game/stats';
import {
  AD_BOOSTS,
  AD_BOOSTS_PER_DAY,
  DAILY_SOULFIRE,
  IAP,
  SHOP,
  type Product,
} from '../../game/data/products';
import {
  applyAdBoost,
  buyShop,
  canUseAdBoost,
  claimDaily,
  dayIndex,
  grantPurchase,
  canRetryBoss,
  inventoryCap,
  timeSkipGold,
} from '../../game/premium';
import { fmt, fmtTime } from '../../game/numbers';
import { mutate } from '../../store';
import { monetization } from '../../services/monetization';
import { SoulfireIcon, GoldIcon } from '../Icons';

/** Transient "why that didn't work" / "here's what you got" line under a card. */
type Toast = { id: string; text: string; bad?: boolean } | null;

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="shop-section">
      <div className="shop-section-head">
        <h3>{title}</h3>
        {note && <span className="dim">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Price({ soulfire }: { soulfire: number }) {
  return <span className="price sf"><SoulfireIcon size={12} />{fmt(soulfire)}</span>;
}

// ---------- daily ----------

function Daily({ s, onToast }: { s: GameState; onToast: (t: Toast) => void }) {
  // s.lastTick is the store's wall clock, restamped on every 100 ms tick.
  const today = dayIndex(s.lastTick);
  const claimed = s.claimedDaily === today;
  const streak = s.stats.dailyStreak ?? 0;
  // The day you are about to claim, as an index into the 7-day cycle.
  const nextIdx = claimed ? (streak + 1) % DAILY_SOULFIRE.length
    : (s.claimedDaily === today - 1 ? (streak + 1) : 0) % DAILY_SOULFIRE.length;

  const claim = useCallback(() => {
    let got = 0;
    mutate(st => { got = claimDaily(st, Date.now()); });
    onToast(got > 0 ? { id: 'daily', text: `+${got} Soulfire` } : { id: 'daily', text: 'Already claimed today', bad: true });
  }, [onToast]);

  return (
    <div className="card shop-daily">
      <div className="shop-daily-top">
        <div>
          <div className="row-title">Daily Offering</div>
          <div className="row-sub dim">
            {claimed ? 'Come back tomorrow to keep the streak.' : 'Claim your Soulfire for today.'}
          </div>
        </div>
        <button type="button" className={claimed ? 'btn small disabled' : 'btn small primary'} disabled={claimed} onClick={claim}>
          <span className="buy-label">{claimed ? 'Claimed' : 'Claim'}</span>
          <span className="buy-cost sf">+{DAILY_SOULFIRE[nextIdx]} ✧</span>
        </button>
      </div>
      <div className="streak">
        {DAILY_SOULFIRE.map((amt, i) => {
          const done = claimed ? i <= streak % DAILY_SOULFIRE.length : i < streak % DAILY_SOULFIRE.length;
          const next = !claimed && i === nextIdx;
          return (
            <div key={i} className={`streak-day${done ? ' done' : ''}${next ? ' next' : ''}`}>
              <span className="streak-num">{amt}</span>
              <span className="streak-label">D{i + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- ad boosts ----------

function Boosts({ s, onToast }: { s: GameState; onToast: (t: Toast) => void }) {
  const now = s.lastTick;
  const used = s.boosts.adBoostDay === dayIndex(now) ? s.boosts.adBoostsToday : 0;
  const left = Math.max(0, AD_BOOSTS_PER_DAY - used);
  const canUse = canUseAdBoost(s, now);

  const watch = useCallback(async (id: (typeof AD_BOOSTS)[number]['id']) => {
    // Remove Ads turns these into free buttons — never call the ad SDK for them.
    if (!s.adsRemoved) {
      const rewarded = await monetization().showRewardedAd(id);
      if (!rewarded) { onToast({ id, text: 'No reward — ad not finished', bad: true }); return; }
    }
    let ok = false;
    mutate(st => { ok = applyAdBoost(st, id, Date.now()); });
    onToast(ok ? { id, text: 'Boost active' } : { id, text: 'Daily boost limit reached', bad: true });
  }, [s.adsRemoved, onToast]);

  return (
    <Section
      title="Boosts"
      note={s.adsRemoved ? 'Free — ads removed' : `${left} of ${AD_BOOSTS_PER_DAY} left today`}
    >
      <div className="shop-grid">
        {AD_BOOSTS.map(b => {
          const active = (b.id === 'ad_gold' && s.boosts.goldUntil > now)
            ? s.boosts.goldUntil - now
            : (b.id === 'ad_damage' && s.boosts.damageUntil > now) ? s.boosts.damageUntil - now : 0;
          const queued = b.id === 'ad_offline' && s.boosts.offlineDoubleNext;
          const dead = b.id === 'ad_boss' && !(s.enemy.isBoss && s.enemy.timer !== undefined) && !canRetryBoss(s);
          const ok = canUse && !dead;
          return (
            <button
              key={b.id}
              type="button"
              className={`shop-card boost-card${ok ? '' : ' disabled'}${active || queued ? ' live' : ''}`}
              disabled={!ok}
              onClick={() => watch(b.id)}
            >
              <span className="shop-card-name">{b.name}</span>
              <span className="shop-card-desc dim">{b.desc}</span>
              <span className="shop-card-cta">
                {active > 0 ? `Active ${fmtTime(active / 1000)}`
                  : queued ? 'Ready for next offline'
                    : dead ? 'No boss to retry'
                      : s.adsRemoved ? 'Activate' : '▶ Watch ad'}
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

// ---------- soulfire shop ----------

function ShopCard({ s, p, onToast }: { s: GameState; p: Product; onToast: (t: Toast) => void }) {
  const owned = p.kind === 'skin' && s.ownedSkins.includes(p.skinId!);
  const buy = useCallback(() => {
    let res: { ok: boolean; why?: string } = { ok: false };
    mutate(st => { res = buyShop(st, p.id, Date.now()); });
    onToast(res.ok ? { id: p.id, text: 'Purchased' } : { id: p.id, text: res.why ?? 'Not available', bad: true });
  }, [p.id, onToast]);

  // What the player actually receives, spelled out where we can compute it —
  // including the chest's pity counter, so no box is ever blind.
  const toPity = 5 - ((s.stats.chestsOpened ?? 0) % 5);
  const yields = p.kind === 'timeskip' ? `≈ ${fmt(timeSkipGold(s, p.amount!))} gold now`
    : p.kind === 'inventory' ? `${inventoryCap(s)} → ${inventoryCap(s) + p.amount!} slots`
      : p.kind === 'grave_chest' ? `${toPity} more to a guaranteed Legendary`
        : null;

  return (
    <div className={`shop-card wide${p.kind === 'grave_chest' ? ' chest' : ''}${owned ? ' owned' : ''}`}>
      <div className="shop-card-body">
        <span className="shop-card-name">{p.name}</span>
        <span className="shop-card-desc dim">{p.desc}</span>
        {yields && <span className="shop-card-yield accent">{yields}</span>}
      </div>
      <button
        type="button"
        className={owned ? 'btn small disabled' : 'btn small buy'}
        disabled={owned}
        onClick={buy}
      >
        <span className="buy-label">{owned ? 'Owned' : 'Buy'}</span>
        {!owned && <Price soulfire={p.soulfire!} />}
      </button>
    </div>
  );
}

// ---------- real money ----------

function Packs({ s, onToast }: { s: GameState; onToast: (t: Toast) => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  const purchase = useCallback(async (id: string) => {
    setBusy(id);
    try {
      const ok = await monetization().purchase(id);
      if (!ok) { onToast({ id, text: 'Purchase cancelled', bad: true }); return; }
      let granted = false;
      mutate(st => { granted = grantPurchase(st, id, Date.now()); });
      onToast(granted ? { id, text: 'Thank you!' } : { id, text: 'Already owned', bad: true });
    } finally {
      setBusy(null);
    }
  }, [onToast]);

  const restore = useCallback(async () => {
    setBusy('restore');
    try {
      const ids = await monetization().restore();
      mutate(st => { for (const id of ids) grantPurchase(st, id, Date.now(), true); });
      onToast({ id: 'restore', text: ids.length ? `Restored ${ids.length} purchase${ids.length === 1 ? '' : 's'}` : 'Nothing to restore' });
    } finally {
      setBusy(null);
    }
  }, [onToast]);

  return (
    <Section title="Packs" note="Real money">
      {IAP.map(p => {
        const owned = (p.kind === 'remove_ads' && s.adsRemoved) || (p.kind === 'starter' && !!s.stats.starterBought);
        return (
          <div key={p.id} className={`shop-card wide iap${p.kind === 'starter' ? ' featured' : ''}${owned ? ' owned' : ''}`}>
            <div className="shop-card-body">
              <span className="shop-card-name">{p.name}</span>
              <span className="shop-card-desc dim">{p.desc}</span>
            </div>
            <button
              type="button"
              className={owned || busy === p.id ? 'btn small disabled' : 'btn small primary'}
              disabled={owned || busy === p.id}
              onClick={() => purchase(p.id)}
            >
              <span className="buy-label">{owned ? 'Owned' : busy === p.id ? '…' : p.priceLabel}</span>
            </button>
          </div>
        );
      })}
      <button type="button" className="btn ghost wide" disabled={busy === 'restore'} onClick={restore}>
        Restore purchases
      </button>
    </Section>
  );
}

// ---------- tab ----------

function ShopTab({ s }: { s: GameState; d: Derived }) {
  const [toast, setToast] = useState<Toast>(null);
  const onToast = useCallback((t: Toast) => setToast(t), []);

  return (
    <div className="tabpane shop">
      <div className="shop-wallet">
        <span className="wallet-amt sf"><SoulfireIcon size={18} />{fmt(s.soulfire)}</span>
        <span className="wallet-amt gold"><GoldIcon size={16} />{fmt(s.gold)}</span>
      </div>

      {toast && (
        <div className={toast.bad ? 'shop-toast bad' : 'shop-toast'} key={`${toast.id}-${toast.text}`}>
          {toast.text}
        </div>
      )}

      <Daily s={s} onToast={onToast} />
      <Boosts s={s} onToast={onToast} />

      <Section title="Soulfire Shop" note="Spend ✧">
        {SHOP.map(p => <ShopCard key={p.id} s={s} p={p} onToast={onToast} />)}
      </Section>

      <Packs s={s} onToast={onToast} />

      <p className="shop-fineprint dim">
        Stages, souls and skill points are never for sale. Every chest shows its pity counter.
      </p>
    </div>
  );
}

export default memo(ShopTab);
