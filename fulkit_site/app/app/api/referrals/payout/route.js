/**
 * POST /api/referrals/payout — Trigger payout batch for eligible referrers.
 * Owner-only (or cron). Calculates cash-eligible Fül for Builder+ users,
 * converts to USD, and creates Stripe Transfers.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { getTierForCount, calculateMonthlyFul, fulToDollars, calculateSubscriptionOffset } from "../../../../lib/referral-engine";
import { REFERRALS, TIERS } from "../../../../lib/ful-config";

const STRIPE_API = "https://api.stripe.com/v1";

async function getUser(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (!error && user) return user;
  } catch {}
  return null;
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  // Owner-only
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find all users at Builder tier (4) or above with a Connect account
  const { data: eligibleUsers } = await admin
    .from("profiles")
    .select("id, name, referral_tier, total_active_referrals, stripe_connect_account_id, seat_type, lifetime_ful_earned")
    .gte("referral_tier", REFERRALS.payoutMinTier)
    .not("stripe_connect_account_id", "is", null);

  if (!eligibleUsers || eligibleUsers.length === 0) {
    return Response.json({ message: "No eligible users for payout", payouts: [] });
  }

  const results = [];

  for (const u of eligibleUsers) {
    const totalMonthlyFul = calculateMonthlyFul(u.total_active_referrals);
    const totalDollars = fulToDollars(totalMonthlyFul);

    // Subtract what's already applied as subscription offset
    const planPrice = TIERS[u.seat_type]?.price || 0;
    const subscriptionOffset = calculateSubscriptionOffset(u.total_active_referrals, planPrice);
    const cashPayout = Math.max(0, totalDollars - subscriptionOffset);

    if (cashPayout <= 0) {
      results.push({ userId: u.id, name: u.name, status: "skipped", reason: "No excess after subscription offset" });
      continue;
    }

    const payoutCents = Math.round(cashPayout * 100);

    // Create Stripe Transfer
    try {
      const res = await fetch(`${STRIPE_API}/transfers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_CLIENT_SECRET}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          amount: String(payoutCents),
          currency: "usd",
          destination: u.stripe_connect_account_id,
          description: `Fulkit referral payout — ${u.total_active_referrals} active referrals`,
          "metadata[user_id]": u.id,
          "metadata[referrals]": String(u.total_active_referrals),
          "metadata[ful_earned]": String(totalMonthlyFul),
        }),
      });
      const transfer = await res.json();

      if (transfer.error) {
        results.push({ userId: u.id, name: u.name, status: "failed", error: transfer.error.message });
        // Record failed payout
        await admin.from("payouts").insert({
          user_id: u.id,
          amount_ful: totalMonthlyFul,
          amount_usd: cashPayout,
          stripe_transfer_id: null,
          status: "failed",
        });
        continue;
      }

      // Record successful payout
      await admin.from("payouts").insert({
        user_id: u.id,
        amount_ful: totalMonthlyFul,
        amount_usd: cashPayout,
        stripe_transfer_id: transfer.id,
        status: "paid",
      });

      // Record in ful_ledger
      await admin.from("ful_ledger").insert({
        user_id: u.id,
        type: "payout",
        amount_ful: -totalMonthlyFul,
        description: `Cash payout: $${cashPayout.toFixed(2)} (${u.total_active_referrals} referrals)`,
      });

      // Update lifetime earned
      await admin
        .from("profiles")
        .update({ lifetime_ful_earned: (u.lifetime_ful_earned || 0) + totalMonthlyFul })
        .eq("id", u.id);

      results.push({
        userId: u.id,
        name: u.name,
        status: "paid",
        amount: cashPayout,
        transferId: transfer.id,
      });
    } catch (err) {
      results.push({ userId: u.id, name: u.name, status: "error", error: err.message });
    }
  }

  return Response.json({
    message: `Processed ${results.length} payouts`,
    payouts: results,
  });
}
