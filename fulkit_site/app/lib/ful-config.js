/**
 * ful-config.js — Re-exports from ful-legend.js for backward compatibility.
 *
 * All values originate in ful-legend.js (the single source of truth).
 * New code should import directly from ful-legend.js.
 * Existing imports from this file continue to work unchanged.
 */

import {
  PLANS, CREDITS as LEGEND_CREDITS, REFERRALS as LEGEND_REFERRALS,
  COST_BASIS as LEGEND_COST_BASIS, CIRCUIT_BREAKER, HOT_SEATS,
  getSpendCap,
} from "./ful-legend";

// ── Tier definitions (derived from legend PLANS) ─────────────────────
export const TIERS = {
  free:     { label: PLANS.trial.label,    price: PLANS.trial.price,    priceLabel: PLANS.trial.priceLabel,    messages: PLANS.trial.fulTotal,     model: PLANS.trial.model,    maxTokens: PLANS.trial.maxTokens },
  standard: { label: PLANS.standard.label, price: PLANS.standard.price, priceLabel: PLANS.standard.priceLabel, messages: PLANS.standard.fulPerMonth, model: PLANS.standard.model, maxTokens: PLANS.standard.maxTokens },
  pro:      { label: PLANS.pro.label,      price: PLANS.pro.price,      priceLabel: PLANS.pro.priceLabel,      messages: PLANS.pro.fulPerMonth,     model: PLANS.pro.model,     maxTokens: PLANS.pro.maxTokens },
};

// ── Shorthand maps ───────────────────────────────────────────────────
export const SEAT_LIMITS = {
  free: TIERS.free.messages,
  standard: TIERS.standard.messages,
  pro: TIERS.pro.messages,
};

export const PLAN_LABELS = {
  free: TIERS.free.label,
  standard: TIERS.standard.label,
  pro: TIERS.pro.label,
};

export const PLAN_PRICES = {
  free: TIERS.free.priceLabel,
  standard: TIERS.standard.priceLabel,
  pro: TIERS.pro.priceLabel,
};

// ── Credits ──────────────────────────────────────────────────────────
export const CREDITS = {
  price: LEGEND_CREDITS.price,
  amount: LEGEND_CREDITS.fulAmount,
  priceLabel: LEGEND_CREDITS.priceLabel,
  description: LEGEND_CREDITS.description,
};

// ── Referrals ────────────────────────────────────────────────────────
export const REFERRALS = {
  fulPerRef: LEGEND_REFERRALS.fulPerRefPerMonth,
  fulPerDollar: LEGEND_REFERRALS.fulPerDollar,
  creditPerRef: LEGEND_REFERRALS.creditPerRef,
  freeAtStandard: LEGEND_REFERRALS.freeStandardThreshold,
  freeAtPro: LEGEND_REFERRALS.freeProThreshold,
  payoutMinTier: LEGEND_REFERRALS.payoutTierMin,
  payoutMinUsd: LEGEND_REFERRALS.payoutMinimum,
  tiers: LEGEND_REFERRALS.tiers,
};

// ── Hot seats ────────────────────────────────────────────────────────
export { HOT_SEATS };

// ── BYOK ─────────────────────────────────────────────────────────────
export const BYOK = {
  platformFee: PLANS.byok.platformFee,
  model: PLANS.byok.model,
  maxTokens: PLANS.byok.maxTokens,
};

// ── Owner ────────────────────────────────────────────────────────────
export const OWNER = {
  model: PLANS.owner.model,
  maxTokens: PLANS.owner.maxTokens,
  compressAt: PLANS.owner.compressAt,
};

// ── Cost basis ───────────────────────────────────────────────────────
export const COST_BASIS = {
  currentCostPerMsg: LEGEND_COST_BASIS.currentCostPerFul,
  targetCostPerMsg: LEGEND_COST_BASIS.targetCostPerFul,
  lastUpdated: LEGEND_COST_BASIS.lastUpdated,
};

// ── Cost ceilings (derived from legend — auto-tightens as costs drop) ─
export const COST_CEILINGS = {
  free: getSpendCap("trial"),
  standard: getSpendCap("standard"),
  pro: getSpendCap("pro"),
};

// ── Circuit breaker ──────────────────────────────────────────────────
export { CIRCUIT_BREAKER };

// ── Low fuel (deprecated — billing state machine handles this now) ───
export const LOW_FUEL_THRESHOLD = 0.8;
