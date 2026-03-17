/**
 * GET /api/cron/payout — Monthly automated payout processor.
 * Runs on 1st of each month via Vercel Cron.
 *
 * Logic:
 * 1. Find all Builder+ users with Stripe Connect accounts
 * 2. Calculate cash payout (monthly Fül → dollars − subscription offset)
 * 3. Enforce $10 minimum (rolls over if under)
 * 4. Double-run protection via payouts table (skip if already paid this month)
 * 5. Create Stripe Transfer for each eligible user
 * 6. Record in payouts + ful_ledger tables
 * 7. Emit signals to Radio for monitoring
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { getTierForCount, calculateMonthlyFul, fulToDollars, calculateSubscriptionOffset } from "../../../../lib/referral-engine";
import { REFERRALS, TIERS } from "../../../../lib/ful-config";
import { emitServerSignal } from "../../../../lib/signal-server";

const STRIPE_API = "https://api.stripe.com/v1";

// Owner user ID for signal attribution
const OWNER_ID = "00000000-0000-0000-0000-000000000000"; // placeholder — signals use first eligible user or skip

export async function GET(request) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  // Find all Builder+ users with Stripe Connect
  const { data: eligibleUsers, error: fetchErr } = await admin
    .from("profiles")
    .select("id, name, email, referral_tier, total_active_referrals, stripe_connect_account_id, seat_type, lifetime_ful_earned")
    .gte("referral_tier", REFERRALS.payoutMinTier)
    .not("stripe_connect_account_id", "is", null);

  if (fetchErr) {
    return Response.json({ error: "Failed to fetch eligible users", detail: fetchErr.message }, { status: 500 });
  }

  if (!eligibleUsers || eligibleUsers.length === 0) {
    return Response.json({ message: "No eligible users for payout", month: monthKey, payouts: [] });
  }

  const results = [];
  let totalPaid = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const u of eligibleUsers) {
    // Double-run protection: check if already paid this month
    const { data: existing } = await admin
      .from("payouts")
      .select("id")
      .eq("user_id", u.id)
      .eq("status", "paid")
      .gte("created_at", `${monthKey}-01T00:00:00Z`)
      .lt("created_at", `${nextMonthKey}-01T00:00:00Z`)
      .limit(1);

    if (existing && existing.length > 0) {
      results.push({ userId: u.id, name: u.name, status: "skipped", reason: "Already paid this month" });
      totalSkipped++;
      continue;
    }

    // Calculate payout
    const totalMonthlyFul = calculateMonthlyFul(u.total_active_referrals);
    const totalDollars = fulToDollars(totalMonthlyFul);
    const planPrice = TIERS[u.seat_type]?.price || 0;
    const subscriptionOffset = calculateSubscriptionOffset(u.total_active_referrals, planPrice);
    const cashPayout = Math.max(0, totalDollars - subscriptionOffset);

    if (cashPayout <= 0) {
      results.push({ userId: u.id, name: u.name, status: "skipped", reason: "No excess after subscription offset" });
      totalSkipped++;
      continue;
    }

    // Check rollover: sum unpaid/rollover amounts from previous months
    const { data: rolloverRows } = await admin
      .from("payouts")
      .select("amount_usd")
      .eq("user_id", u.id)
      .eq("status", "rollover");

    const rolloverBalance = (rolloverRows || []).reduce((sum, r) => sum + (r.amount_usd || 0), 0);
    const totalWithRollover = cashPayout + rolloverBalance;

    // Enforce $10 minimum
    if (totalWithRollover < REFERRALS.payoutMinUsd) {
      // Record as rollover for next month
      await admin.from("payouts").insert({
        user_id: u.id,
        amount_ful: totalMonthlyFul,
        amount_usd: cashPayout,
        stripe_transfer_id: null,
        status: "rollover",
      });
      results.push({
        userId: u.id, name: u.name, status: "rollover",
        amount: cashPayout, accumulated: totalWithRollover,
        reason: `Under $${REFERRALS.payoutMinUsd} minimum ($${totalWithRollover.toFixed(2)} accumulated)`,
      });
      totalSkipped++;
      continue;
    }

    const payoutCents = Math.round(totalWithRollover * 100);

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
          description: `Fulkit referral payout ${monthKey} — ${u.total_active_referrals} active referrals`,
          "metadata[user_id]": u.id,
          "metadata[month]": monthKey,
          "metadata[referrals]": String(u.total_active_referrals),
          "metadata[ful_earned]": String(totalMonthlyFul),
          "metadata[includes_rollover]": String(rolloverBalance > 0),
        }),
      });
      const transfer = await res.json();

      if (transfer.error) {
        await admin.from("payouts").insert({
          user_id: u.id,
          amount_ful: totalMonthlyFul,
          amount_usd: totalWithRollover,
          stripe_transfer_id: null,
          status: "failed",
        });
        emitServerSignal(u.id, "payout_failed", "error", {
          month: monthKey, amount: totalWithRollover, error: transfer.error.message,
        });
        results.push({ userId: u.id, name: u.name, status: "failed", error: transfer.error.message });
        totalFailed++;
        continue;
      }

      // Success — record payout
      await admin.from("payouts").insert({
        user_id: u.id,
        amount_ful: totalMonthlyFul,
        amount_usd: totalWithRollover,
        stripe_transfer_id: transfer.id,
        status: "paid",
      });

      // Record in Fül ledger
      await admin.from("ful_ledger").insert({
        user_id: u.id,
        type: "payout",
        amount_ful: -totalMonthlyFul,
        description: `Auto payout ${monthKey}: $${totalWithRollover.toFixed(2)} (${u.total_active_referrals} referrals${rolloverBalance > 0 ? `, includes $${rolloverBalance.toFixed(2)} rollover` : ""})`,
      });

      // Clear rollover records now that they're paid out
      if (rolloverBalance > 0) {
        await admin.from("payouts").delete().eq("user_id", u.id).eq("status", "rollover");
      }

      // Update lifetime earned
      await admin
        .from("profiles")
        .update({ lifetime_ful_earned: (u.lifetime_ful_earned || 0) + totalMonthlyFul })
        .eq("id", u.id);

      results.push({
        userId: u.id, name: u.name, status: "paid",
        amount: totalWithRollover, transferId: transfer.id,
      });
      totalPaid++;
    } catch (err) {
      emitServerSignal(u.id, "payout_failed", "error", {
        month: monthKey, amount: totalWithRollover, error: err.message,
      });
      results.push({ userId: u.id, name: u.name, status: "error", error: err.message });
      totalFailed++;
    }
  }

  // Emit batch summary signal (use first user's ID for attribution, or skip)
  const signalUserId = eligibleUsers[0]?.id;
  if (signalUserId) {
    emitServerSignal(signalUserId, "payout_batch_complete", totalFailed > 0 ? "warning" : "info", {
      month: monthKey,
      eligible: eligibleUsers.length,
      paid: totalPaid,
      failed: totalFailed,
      skipped: totalSkipped,
      totalUsd: results.filter(r => r.status === "paid").reduce((s, r) => s + r.amount, 0),
    });
  }

  return Response.json({
    message: `Payout batch ${monthKey}: ${totalPaid} paid, ${totalFailed} failed, ${totalSkipped} skipped`,
    month: monthKey,
    payouts: results,
  });
}
