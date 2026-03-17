/**
 * GET /api/referrals/payout/status — User's payout history.
 */

import { getSupabaseAdmin } from "../../../../../lib/supabase-server";

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

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  const { data: payouts } = await admin
    .from("payouts")
    .select("id, amount_ful, amount_usd, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Check if user has Connect account set up
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_connect_account_id, referral_tier")
    .eq("id", user.id)
    .single();

  const totalPaid = (payouts || [])
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount_usd || 0), 0);

  return Response.json({
    hasConnect: !!profile?.stripe_connect_account_id,
    tier: profile?.referral_tier || 0,
    payouts: payouts || [],
    totalPaid,
  });
}
