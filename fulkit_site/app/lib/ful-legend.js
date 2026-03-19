/**
 * ful-legend.js — Single source of truth for all Fulkit economics.
 * If it's not here, it's not official.
 *
 * Works on both client and server (pure data, no "use client" needed).
 *
 * FIXED = user-facing contract (changes require announcement).
 * VARIABLE = internal ops (adjustable as costs change).
 */

// === FIXED (user-facing contract) ========================================

export const FUL_EXCHANGE = {
  fulPerDollar: 100,        // 100 Ful = $1. Always.
  dollarPerFul: 0.01,
};

export const PLANS = {
  trial: {
    label: "Trial",
    price: 0,
    priceLabel: "Free",
    durationDays: 14,
    fulTotal: 150,           // total, not per month
    fulPerMonth: 150,        // compat alias (trial is one-shot)
    maxTokens: 2048,
    model: "claude-sonnet-4-6",
    compressAt: 80000,
    integrations: 1,
    vaultNotes: 10,
    spendCap: 2.50,
  },
  standard: {
    label: "Standard",
    priceMonthly: 9,
    priceAnnual: 90,
    price: 9,                // compat alias (monthly)
    priceLabel: "$9/mo",
    fulPerMonth: 450,
    maxTokens: 2048,
    model: "claude-sonnet-4-6",
    compressAt: 80000,
    integrations: Infinity,
    vaultNotes: Infinity,
    spendCap: null,          // derived from getSpendCap()
  },
  pro: {
    label: "Pro",
    priceMonthly: 15,
    priceAnnual: 150,
    price: 15,
    priceLabel: "$15/mo",
    fulPerMonth: 800,
    maxTokens: 4096,
    model: "claude-sonnet-4-6",
    compressAt: 80000,
    integrations: Infinity,
    vaultNotes: Infinity,
    spendCap: null,
  },
  byok: {
    label: "BYOK",
    price: 0,
    priceLabel: "Free",
    fulPerMonth: Infinity,
    maxTokens: 128000,
    model: "claude-opus-4-6",
    compressAt: 180000,
    support: "self-service",
    platformFee: 0,
  },
  owner: {
    label: "Owner",
    price: 0,
    priceLabel: "Owner",
    fulPerMonth: Infinity,
    maxTokens: 128000,
    model: "claude-opus-4-6",
    compressAt: 180000,
  },
};

export const CREDITS = {
  price: 2,
  fulAmount: 100,
  priceLabel: "$2",
  description: "$2 per 100 messages",
  stripeLookup: "fulkit_credits_100",
};

export const REFERRALS = {
  fulPerRefPerMonth: 100,
  dollarPerRefPerMonth: 1,
  fulPerDollar: FUL_EXCHANGE.fulPerDollar,   // alias for referral math
  creditPerRef: 1,                            // compat
  tiers: [
    { id: 1, min: 1,   max: 6,        fulPerRef: 100, label: "Piece" },
    { id: 2, min: 7,   max: 14,       fulPerRef: 100, label: "Component" },
    { id: 3, min: 15,  max: 24,       fulPerRef: 100, label: "Tool" },
    { id: 4, min: 25,  max: 99,       fulPerRef: 110, label: "Builder" },
    { id: 5, min: 100, max: 249,      fulPerRef: 120, label: "Architect" },
    { id: 6, min: 250, max: Infinity, fulPerRef: 130, label: "Ambassador" },
  ],
  freeStandardThreshold: 9,
  freeProThreshold: 15,
  freeAtStandard: 9,   // compat alias
  freeAtPro: 15,        // compat alias
  payoutMinimum: 10,
  payoutTierMin: 4,
  payoutMinTier: 4,     // compat alias
  payoutMinUsd: 10,     // compat alias
};

// === VARIABLE (internal ops) =============================================

export const COST_BASIS = {
  targetCostPerFul: 0.012,    // target after optimization
  currentCostPerFul: 0.09,    // actual today (pre-optimization)
  // Compat aliases
  targetCostPerMsg: 0.012,
  currentCostPerMsg: 0.09,
  lastUpdated: "2026-03-19",
};

export function getSpendCap(plan) {
  if (!PLANS[plan]) return null;
  if (PLANS[plan].spendCap !== undefined && PLANS[plan].spendCap !== null)
    return PLANS[plan].spendCap;
  const fulLimit = PLANS[plan].fulPerMonth;
  if (!isFinite(fulLimit)) return null;
  // Use MAX of current and target cost so cap never fires before Ful limit
  const costPerFul = Math.max(COST_BASIS.currentCostPerFul, COST_BASIS.targetCostPerFul);
  // 1.5x buffer above expected cost
  return Math.ceil(fulLimit * costPerFul * 1.5 * 100) / 100;
  // At current costs: Standard = 450 x 0.09 x 1.5 = $60.75, Pro = 800 x 0.09 x 1.5 = $108.00
  // Post-optimization: Standard = $8.10, Pro = $14.40 (once currentCostPerFul drops)
}

export const CIRCUIT_BREAKER = {
  yellowPct: 0.50,            // 50% of MRR -> alert owner
  redPct: 0.60,               // 60% of MRR -> throttle responses
  throttledMaxTokens: 1024,
};

export const HOT_SEATS = {
  total: 5,
  minWeekly: 1,
  minMonthly: 4,
  graceDays: 30,
};

// === BILLING STATE MACHINE ===============================================

export const BILLING_STATES = {
  NORMAL: { maxPercent: 89 },
  SOFT_WARNING: { percent: 90, showOnce: true },
  HEADS_UP: { percent: 98, showOnce: true },
  WRAP_UP: { percent: 99, reserveLastFul: true },
  LIMIT: { percent: 100, disableInput: true, keepHistoryAccessible: true },
};

// === PROJECTION DEFAULTS =================================================

export const PROJECTIONS = {
  standardProSplit: 0.70,        // 70% Standard, 30% Pro assumption
  freeSeatsDefault: 6,           // referral-earned free plans assumption
  avgMsgsPerUserPerMonth: 300,   // blended average for API cost projection
  hostingBase: 25,               // base monthly hosting (Vercel + Supabase + Redis)
  hostingPerHundredUsers: 10,    // incremental hosting per 100 users
  blendedRefCreditPerUser: 1,    // ~$1/mo blended referral credit per paying user
};

// === TELEMETRY ===========================================================

export const TELEMETRY = {
  trackCostPerMessage: true,
  trackOutputTokensPerTier: true,
  trackToolCallsPerMessage: true,
  trackHabitEngineAccuracy: true,
};
