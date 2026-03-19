/**
 * cost-guard.js — Per-user spend ceiling + global circuit breaker.
 *
 * Called from the chat route to check budgets before processing
 * and to track API spend after each response.
 */

import { PLANS, CIRCUIT_BREAKER, getSpendCap } from "./ful-legend";
import { COST_CEILINGS } from "./ful-config";

// ── Per-token cost estimates (Anthropic pricing) ──────────────────────
const TOKEN_COSTS = {
  "claude-opus-4-6":   { input: 15.0 / 1_000_000, output: 75.0 / 1_000_000 },
  "claude-sonnet-4-6": { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
};

/**
 * Estimate the API cost for a request based on token usage.
 */
export function estimateCost(model, inputTokens, outputTokens) {
  const rates = TOKEN_COSTS[model] || TOKEN_COSTS["claude-sonnet-4-6"];
  return (inputTokens * rates.input) + (outputTokens * rates.output);
}

/**
 * Check if a user has exceeded their per-user spend ceiling.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export function checkUserBudget(seatType, apiSpendThisMonth) {
  const ceiling = COST_CEILINGS[seatType] || COST_CEILINGS.free;
  if (apiSpendThisMonth >= ceiling) {
    return {
      allowed: false,
      reason: `You've reached your usage limit for this month. Your plan resets on the 1st. Upgrade your plan or purchase credits to keep going.`,
    };
  }
  return { allowed: true };
}

/**
 * Check the global circuit breaker state.
 * Returns { status: "green" | "yellow" | "red", throttledMaxTokens?: number }.
 *
 * @param {number} totalApiSpend - sum of all users' api_spend_this_month
 * @param {number} mrr - monthly recurring revenue
 */
export function checkCircuitBreaker(totalApiSpend, mrr) {
  if (mrr <= 0) return { status: "green" };
  const pct = totalApiSpend / mrr;

  if (pct >= CIRCUIT_BREAKER.redPct) {
    return {
      status: "red",
      throttledMaxTokens: CIRCUIT_BREAKER.throttledMaxTokens,
    };
  }
  if (pct >= CIRCUIT_BREAKER.yellowPct) {
    return { status: "yellow" };
  }
  return { status: "green" };
}

/**
 * Increment a user's api_spend_this_month after a response.
 * Fire-and-forget — errors are logged but don't block the response.
 */
export async function trackApiSpend(adminClient, userId, cost) {
  if (!userId || !cost || cost <= 0) return;
  try {
    // Use RPC for atomic increment, or fallback to read-update
    const { data: profile } = await adminClient
      .from("profiles")
      .select("api_spend_this_month")
      .eq("id", userId)
      .single();

    const current = parseFloat(profile?.api_spend_this_month || 0);
    await adminClient
      .from("profiles")
      .update({ api_spend_this_month: current + cost })
      .eq("id", userId);
  } catch (err) {
    console.error("[cost-guard] trackApiSpend error:", err.message);
  }
}
