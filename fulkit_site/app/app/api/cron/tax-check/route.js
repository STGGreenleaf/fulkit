/**
 * GET /api/cron/tax-check — Annual 1099-NEC threshold check.
 * Runs January 15 via Vercel Cron.
 *
 * Checks each user's total payouts for the previous calendar year.
 * If >= $600, emits a signal so Collin knows to issue a 1099-NEC.
 * Also emits a signal for users approaching the threshold ($400+).
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { emitServerSignal } from "../../../../lib/signal-server";

const TAX_THRESHOLD = 600;    // $600 IRS 1099-NEC threshold
const WARNING_THRESHOLD = 400; // $400 early warning

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const now = new Date();
  const taxYear = now.getFullYear() - 1; // check PREVIOUS year (runs in January)
  const yearStart = `${taxYear}-01-01T00:00:00Z`;
  const yearEnd = `${taxYear + 1}-01-01T00:00:00Z`;

  // Get all paid payouts for the tax year
  const { data: payouts, error: fetchErr } = await admin
    .from("payouts")
    .select("user_id, amount_usd")
    .eq("status", "paid")
    .gte("created_at", yearStart)
    .lt("created_at", yearEnd);

  if (fetchErr) {
    return Response.json({ error: "Failed to fetch payouts", detail: fetchErr.message }, { status: 500 });
  }

  if (!payouts || payouts.length === 0) {
    return Response.json({ message: `No payouts found for tax year ${taxYear}`, results: [] });
  }

  // Aggregate by user
  const byUser = {};
  for (const p of payouts) {
    byUser[p.user_id] = (byUser[p.user_id] || 0) + (p.amount_usd || 0);
  }

  // Fetch profiles for users with meaningful totals
  const userIds = Object.keys(byUser).filter(id => byUser[id] >= WARNING_THRESHOLD);
  if (userIds.length === 0) {
    return Response.json({ message: `No users above $${WARNING_THRESHOLD} for tax year ${taxYear}`, results: [] });
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, name, email")
    .in("id", userIds);

  const profileMap = {};
  for (const p of (profiles || [])) profileMap[p.id] = p;

  const results = [];

  for (const [userId, totalUsd] of Object.entries(byUser)) {
    if (totalUsd < WARNING_THRESHOLD) continue;

    const profile = profileMap[userId] || {};
    const requires1099 = totalUsd >= TAX_THRESHOLD;

    if (requires1099) {
      // 1099 required — emit urgent signal
      emitServerSignal(userId, "tax_1099_required", "error", {
        taxYear,
        totalPaid: totalUsd,
        name: profile.name,
        email: profile.email,
        action: `Issue 1099-NEC to ${profile.name || userId} — $${totalUsd.toFixed(2)} paid in ${taxYear}`,
      });
      results.push({
        userId, name: profile.name, email: profile.email,
        totalPaid: totalUsd, status: "1099_required",
      });
    } else {
      // Approaching threshold — warning signal
      emitServerSignal(userId, "tax_1099_warning", "warning", {
        taxYear,
        totalPaid: totalUsd,
        name: profile.name,
        email: profile.email,
        remaining: TAX_THRESHOLD - totalUsd,
        note: `${profile.name || userId} at $${totalUsd.toFixed(2)} — $${(TAX_THRESHOLD - totalUsd).toFixed(2)} from 1099 threshold`,
      });
      results.push({
        userId, name: profile.name, email: profile.email,
        totalPaid: totalUsd, status: "approaching_threshold",
        remaining: TAX_THRESHOLD - totalUsd,
      });
    }
  }

  return Response.json({
    message: `Tax check for ${taxYear}: ${results.filter(r => r.status === "1099_required").length} require 1099, ${results.filter(r => r.status === "approaching_threshold").length} approaching`,
    taxYear,
    results,
  });
}
