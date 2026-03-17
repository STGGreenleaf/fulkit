/**
 * ful-config.js — Single source of truth for all Fül pricing, tiers, and limits.
 *
 * Every file that needs pricing data imports from here.
 * Change the number once, it updates everywhere.
 *
 * Works on both client and server (no "use client" directive needed — pure data).
 */

// ── Tier definitions ──────────────────────────────────────────────────
export const TIERS = {
  free:     { label: "Free",     price: 0,  priceLabel: "Free",    messages: 100, model: "claude-sonnet-4-6", maxTokens: 2048 },
  standard: { label: "Standard", price: 9,  priceLabel: "$9/mo",   messages: 450, model: "claude-sonnet-4-6", maxTokens: 2048 },
  pro:      { label: "Pro",      price: 15, priceLabel: "$15/mo",  messages: 800, model: "claude-sonnet-4-6", maxTokens: 4096 },
};

// ── Shorthand maps (for backward compat with existing code) ───────────
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

// ── Credits ───────────────────────────────────────────────────────────
export const CREDITS = {
  price: 2,           // dollars per bundle
  amount: 100,        // messages per bundle
  priceLabel: "$2",
  description: "$2 per 100 messages",
};

// ── Referrals ─────────────────────────────────────────────────────────
export const REFERRALS = {
  fulPerRef: 100,             // base Fül earned per active referral per month
  fulPerDollar: 100,          // exchange rate: 100 Fül = $1
  creditPerRef: 1,            // dollars/mo credit per active referral (base)
  freeAtStandard: 9,          // 9 refs × $1 = $9 → Standard covered
  freeAtPro: 15,              // 15 refs × $1 = $15 → Pro covered
  payoutMinTier: 4,           // Builder tier (25+ refs) unlocks cash payouts
  tiers: [
    { id: 1, min: 1,   max: 6,          fulPerRef: 100, label: "Piece" },
    { id: 2, min: 7,   max: 14,         fulPerRef: 100, label: "Component" },
    { id: 3, min: 15,  max: 24,         fulPerRef: 100, label: "Tool" },
    { id: 4, min: 25,  max: 99,         fulPerRef: 110, label: "Builder" },
    { id: 5, min: 100, max: Infinity,   fulPerRef: 120, label: "Architect" },
  ],
};

// ── Hot seats (founder seats) ─────────────────────────────────────────
export const HOT_SEATS = {
  total: 5,                 // founder seats available
  minWeekly: 1,             // messages per week to stay active
  minMonthly: 4,            // messages per month to stay active
  graceDays: 30,            // inactive days before auto-revoke
};

// ── BYOK ──────────────────────────────────────────────────────────────
export const BYOK = {
  platformFee: null,        // TBD — $5/mo? null = not yet decided
  model: "claude-opus-4-6",
  maxTokens: 128000,
};

// ── Owner / model config ──────────────────────────────────────────────
export const OWNER = {
  model: "claude-opus-4-6",
  maxTokens: 128000,
  compressAt: 180000,
};

// ── Low fuel nudge ────────────────────────────────────────────────────
export const LOW_FUEL_THRESHOLD = 0.8;  // 80% usage triggers system prompt nudge

// ── Cost basis (internal — for margin calculations) ───────────────────
export const COST_BASIS = {
  avgCostPerMsg: 0.015,     // $0.015 (~1.5 cents) blended API cost
};

// ── Cost ceilings (per-user API spend caps per month) ─────────────────
// Safeguard: max API cost the platform absorbs per user per month.
// If a user's api_spend_this_month exceeds this, they get a "tank empty" response.
export const COST_CEILINGS = {
  free: 1.50,               // 100 msgs × ~$0.015
  standard: 13.50,          // headroom above expected cost
  pro: 12.00,               // 800 msgs × ~$0.015
};

// ── Global circuit breaker ────────────────────────────────────────────
export const CIRCUIT_BREAKER = {
  yellowPct: 0.50,          // 50% of MRR → alert owner
  redPct: 0.60,             // 60% of MRR → throttle responses
  throttledMaxTokens: 1024, // reduced max_tokens when red
};
