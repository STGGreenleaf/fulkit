import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { getTierForCount, calculateMonthlyFul, fulToDollars } from "../../../../lib/referral-engine";
import { REFERRALS } from "../../../../lib/ful-config";

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

  // Get user's referral stats from profile
  const { data: profile } = await admin
    .from("profiles")
    .select("referral_code, total_active_referrals, referral_tier, lifetime_ful_earned, seat_type")
    .eq("id", user.id)
    .single();

  // Get referral list
  const { data: referrals } = await admin
    .from("referrals")
    .select("id, referred_id, status, credit_ful_per_month, activated_at, deactivated_at, created_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch names for referred users
  const referredIds = (referrals || []).map(r => r.referred_id);
  let referredProfiles = {};
  if (referredIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, name")
      .in("id", referredIds);
    if (profiles) {
      for (const p of profiles) referredProfiles[p.id] = p.name;
    }
  }

  const activeCount = profile?.total_active_referrals || 0;
  const tier = getTierForCount(activeCount);
  const monthlyFul = calculateMonthlyFul(activeCount);
  const monthlyDollars = fulToDollars(monthlyFul);

  // "To free" calculation
  const toFreeStandard = Math.max(0, REFERRALS.freeAtStandard - activeCount);
  const toFreePro = Math.max(0, REFERRALS.freeAtPro - activeCount);

  return Response.json({
    code: profile?.referral_code || null,
    activeReferrals: activeCount,
    tier: tier ? { id: tier.id, label: tier.label, fulPerRef: tier.fulPerRef } : null,
    tierNumber: profile?.referral_tier || 0,
    monthlyFul,
    monthlyDollars,
    lifetimeFulEarned: profile?.lifetime_ful_earned || 0,
    toFreeStandard,
    toFreePro,
    seatType: profile?.seat_type || "trial",
    referrals: (referrals || []).map(r => ({
      id: r.id,
      name: referredProfiles[r.referred_id] || "User",
      status: r.status,
      fulPerMonth: r.credit_ful_per_month,
      activatedAt: r.activated_at,
      createdAt: r.created_at,
    })),
    tiers: REFERRALS.tiers,
    freeAtStandard: REFERRALS.freeAtStandard,
    freeAtPro: REFERRALS.freeAtPro,
  });
}
