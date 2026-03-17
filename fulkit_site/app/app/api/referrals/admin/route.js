import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { getTierForCount, calculateMonthlyFul, fulToDollars } from "../../../../lib/referral-engine";
import { TIERS } from "../../../../lib/ful-config";

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

  // Check owner role
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Aggregate referral metrics
  const { data: allReferrals } = await admin
    .from("referrals")
    .select("referrer_id, status, credit_ful_per_month");

  const { data: allProfiles } = await admin
    .from("profiles")
    .select("id, name, seat_type, total_active_referrals, referral_tier, lifetime_ful_earned, stripe_connect_account_id");

  // Subscriber breakdown
  const subscribers = { free: 0, standard: 0, pro: 0 };
  const referrers = {};

  for (const p of (allProfiles || [])) {
    const st = p.seat_type || "free";
    if (subscribers[st] !== undefined) subscribers[st]++;

    if (p.total_active_referrals > 0) {
      const tier = getTierForCount(p.total_active_referrals);
      referrers[p.id] = {
        name: p.name || "User",
        activeRefs: p.total_active_referrals,
        tier: tier ? tier.label : "—",
        monthlyFul: calculateMonthlyFul(p.total_active_referrals),
        lifetimeFul: p.lifetime_ful_earned || 0,
        hasConnect: !!p.stripe_connect_account_id,
      };
    }
  }

  // Totals
  const totalReferrals = (allReferrals || []).length;
  const activeReferrals = (allReferrals || []).filter(r => r.status === "active").length;
  const trialReferrals = (allReferrals || []).filter(r => r.status === "trial").length;

  const totalMonthlyFul = Object.values(referrers).reduce((sum, r) => sum + r.monthlyFul, 0);
  const totalMonthlyDollars = fulToDollars(totalMonthlyFul);

  // MRR
  const mrr = (subscribers.standard * TIERS.standard.price) + (subscribers.pro * TIERS.pro.price);

  // Net = MRR - referral payouts - estimated API cost
  const totalPaying = subscribers.standard + subscribers.pro;
  const estimatedApiCost = totalPaying * 4.5; // ~$4.50/user blended
  const netIncome = mrr - totalMonthlyDollars - estimatedApiCost;

  return Response.json({
    subscribers,
    mrr,
    totalReferrals,
    activeReferrals,
    trialReferrals,
    totalMonthlyFul,
    totalMonthlyDollars,
    estimatedApiCost: Math.round(estimatedApiCost),
    netIncome: Math.round(netIncome),
    referrers: Object.values(referrers).sort((a, b) => b.activeRefs - a.activeRefs),
    totalUsers: (allProfiles || []).length,
    totalPaying,
  });
}
