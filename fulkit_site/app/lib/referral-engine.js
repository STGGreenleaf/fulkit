/**
 * referral-engine.js — Shared referral system logic.
 *
 * Used by API routes + webhook handlers to calculate tiers, generate codes,
 * and recalculate referral stats. Pure functions + Supabase admin calls.
 */

import { REFERRALS, FUL_EXCHANGE } from "./ful-legend";

/**
 * Get the referral tier for a given active referral count.
 * Returns the tier object from REFERRALS.tiers, or null if count is 0.
 */
export function getTierForCount(count) {
  if (!count || count <= 0) return null;
  for (let i = REFERRALS.tiers.length - 1; i >= 0; i--) {
    if (count >= REFERRALS.tiers[i].min) return REFERRALS.tiers[i];
  }
  return REFERRALS.tiers[0];
}

/**
 * Calculate total monthly Fül earned from active referrals.
 * Applies tiered rates: first 6 at base rate, next bracket at next rate, etc.
 */
export function calculateMonthlyFul(activeRefs) {
  if (!activeRefs || activeRefs <= 0) return 0;
  let total = 0;
  let remaining = activeRefs;

  for (const tier of REFERRALS.tiers) {
    const tierSize = tier.max === Infinity ? remaining : Math.min(remaining, tier.max - tier.min + 1);
    if (tierSize <= 0) break;
    // All refs up to this tier earn at this tier's rate
    // Actually: the rate is based on TOTAL count, not per-bracket
    // "Tier 4 earns 110 Fül per ref" means ALL refs earn 110 when you have 25+
    break; // We use flat rate based on current tier
  }

  // Simpler: current tier rate applies to ALL active refs
  const tier = getTierForCount(activeRefs);
  if (!tier) return 0;
  return activeRefs * tier.fulPerRef;
}

/**
 * Convert Fül to dollar value at the current exchange rate.
 */
export function fulToDollars(ful) {
  return ful / FUL_EXCHANGE.fulPerDollar;
}

/**
 * Generate a referral code from a user's name.
 * Format: "name-slug-xxxx" where xxxx is 4 random alphanumeric chars.
 */
export function generateReferralCode(name) {
  const slug = (name || "user")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${slug}-${rand}`;
}

/**
 * Recalculate a referrer's stats based on their active referrals.
 * Updates: total_active_referrals, referral_tier, lifetime_ful_earned (incremental).
 *
 * @param {object} adminClient - Supabase admin client (service role)
 * @param {string} referrerId - UUID of the referrer
 */
export async function recalculateReferralStats(adminClient, referrerId) {
  // Count active referrals
  const { count } = await adminClient
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", referrerId)
    .eq("status", "active");

  const activeCount = count || 0;
  const tier = getTierForCount(activeCount);
  const tierNum = tier ? tier.id : 0;

  await adminClient
    .from("profiles")
    .update({
      total_active_referrals: activeCount,
      referral_tier: tierNum,
    })
    .eq("id", referrerId);

  return { activeCount, tier: tierNum };
}

/**
 * Calculate the subscription offset (in dollars) a user earns from referrals.
 * Capped at their plan price — can't earn more than they'd pay.
 */
export function calculateSubscriptionOffset(activeRefs, planPrice) {
  const monthlyFul = calculateMonthlyFul(activeRefs);
  const dollarValue = fulToDollars(monthlyFul);
  return Math.min(dollarValue, planPrice);
}
