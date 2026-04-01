import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { getTierForCount, calculateMonthlyFul, fulToDollars } from "../../../../lib/referral-engine";
import { PLANS } from "../../../../lib/ful-legend";

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

  // Pull everything in parallel (each query catches independently to prevent one failure from breaking all)
  const [
    { data: allReferrals },
    { data: allProfiles },
    { data: allPayouts },
    { data: recentLedger },
    { data: byokRows },
  ] = await Promise.all([
    admin.from("referrals").select("referrer_id, referred_id, status, credit_ful_per_month, created_at, activated_at, deactivated_at").then(r => r).catch(() => ({ data: [] })),
    admin.from("profiles").select("id, name, email, seat_type, total_active_referrals, referral_tier, lifetime_ful_earned, stripe_connect_account_id, api_spend_this_month, messages_this_month, created_at").then(r => r).catch(() => ({ data: [] })),
    admin.from("payouts").select("id, user_id, amount_ful, amount_usd, status, created_at").order("created_at", { ascending: false }).limit(100).then(r => r).catch(() => ({ data: [] })),
    admin.from("ful_ledger").select("id, user_id, type, amount_ful, description, created_at").order("created_at", { ascending: false }).limit(200).then(r => r).catch(() => ({ data: [] })),
    admin.from("preferences").select("user_id").eq("key", "byok_key").not("value", "is", null).then(r => r).catch(() => ({ data: [] })),
  ]);

  // ── Subscriber breakdown ──
  const byokCount = new Set((byokRows || []).map(r => r.user_id)).size;
  const subscribers = { free: 0, standard: 0, pro: 0, byok: byokCount };
  const referrers = {};
  let totalApiSpend = 0;
  let totalMessages = 0;

  for (const p of (allProfiles || [])) {
    const st = p.seat_type || "trial";
    if (subscribers[st] !== undefined) subscribers[st]++;
    totalApiSpend += parseFloat(p.api_spend_this_month || 0);
    totalMessages += p.messages_this_month || 0;

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

  // ── Referral totals ──
  const refs = allReferrals || [];
  const totalReferrals = refs.length;
  const activeReferrals = refs.filter(r => r.status === "active").length;
  const trialReferrals = refs.filter(r => r.status === "trial").length;
  const churnedReferrals = refs.filter(r => r.status === "churned").length;

  const totalMonthlyFul = Object.values(referrers).reduce((sum, r) => sum + r.monthlyFul, 0);
  const totalMonthlyDollars = fulToDollars(totalMonthlyFul);

  // ── Revenue math ──
  const mrr = (subscribers.standard * PLANS.standard.priceMonthly) + (subscribers.pro * PLANS.pro.priceMonthly);
  const totalPaying = subscribers.standard + subscribers.pro;
  const totalUsers = (allProfiles || []).length;
  const actualApiCost = Math.round(totalApiSpend * 100) / 100;
  const netIncome = mrr - totalMonthlyDollars - actualApiCost;
  const margin = mrr > 0 ? Math.round((netIncome / mrr) * 100) : 0;
  // Exclude owner from conversion denominator (owner is not a conversion target)
  const ownerCount = (allProfiles || []).filter(p => p.id === user.id).length;
  const convertibleUsers = totalUsers - ownerCount;
  const conversionRate = convertibleUsers > 0 ? Math.round((totalPaying / convertibleUsers) * 100) : 0;
  const arpu = totalPaying > 0 ? Math.round((mrr / totalPaying) * 100) / 100 : 0;
  const netArpu = totalPaying > 0 ? Math.round(((mrr - actualApiCost) / totalPaying) * 100) / 100 : 0;
  const ltv = arpu * 12; // Simple 12-month LTV
  const costPerMessage = totalMessages > 0 ? Math.round((totalApiSpend / totalMessages) * 10000) / 10000 : 0;

  // ── Payout totals ──
  const payouts = allPayouts || [];
  const totalPaidOut = payouts.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount_usd || 0), 0);
  const pendingPayouts = payouts.filter(p => p.status === "pending").reduce((s, p) => s + (p.amount_usd || 0), 0);

  // ── Credit revenue (from ful_ledger — type "credit_purchase") ──
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const creditRevenue = (recentLedger || [])
    .filter(l => l.type === "credit_purchase" && l.created_at >= monthStart)
    .reduce((s, l) => s + Math.abs(l.amount_ful || 0) / 100, 0); // Ful → dollars

  // ── Monthly signups (dynamic range) ──
  const url = new URL(request.url);
  const monthsParam = parseInt(url.searchParams.get("months") || "6", 10);

  // Start from earliest user signup (dynamic)
  const firstProfile = (allProfiles || []).reduce((min, p) => (!min || (p.created_at && p.created_at < min) ? p.created_at : min), null);
  const earliest = firstProfile ? new Date(firstProfile) : new Date(now.getFullYear(), now.getMonth(), 1);
  earliest.setDate(1); // start of that month
  const maxMonths = Math.max(1, (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1);
  const monthCount = monthsParam === 0 ? maxMonths : Math.min(monthsParam, maxMonths);

  const monthlySignups = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = d.toISOString().slice(0, 7); // "YYYY-MM"
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 7);
    const signups = (allProfiles || []).filter(p => p.created_at && p.created_at >= monthStart && p.created_at < nextMonth).length;
    const activated = refs.filter(r => r.activated_at && r.activated_at >= monthStart && r.activated_at < nextMonth).length;
    const churned = refs.filter(r => r.deactivated_at && r.deactivated_at >= monthStart && r.deactivated_at < nextMonth).length;
    monthlySignups.push({
      month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      signups,
      activated,
      churned,
      net: activated - churned,
    });
  }

  // ── User table (all users, sorted by most valuable) ──
  const userTable = (allProfiles || []).map(p => {
    const tier = getTierForCount(p.total_active_referrals);
    return {
      name: p.name || p.email?.split("@")[0] || "User",
      seat: p.seat_type || "trial",
      refs: p.total_active_referrals || 0,
      tier: tier ? tier.label : "—",
      ful: calculateMonthlyFul(p.total_active_referrals || 0),
      apiSpend: Math.round(parseFloat(p.api_spend_this_month || 0) * 100) / 100,
      messages: p.messages_this_month || 0,
      joined: p.created_at,
    };
  }).sort((a, b) => b.refs - a.refs || b.messages - a.messages);

  return Response.json({
    // Core KPIs
    subscribers,
    mrr,
    netIncome: Math.round(netIncome * 100) / 100,
    margin,
    arpu,
    netArpu,
    costPerMessage,
    ltv,
    conversionRate,
    totalUsers,
    totalPaying,
    totalMessages,

    // Referral network
    totalReferrals,
    activeReferrals,
    trialReferrals,
    churnedReferrals,
    totalMonthlyFul,
    totalMonthlyDollars,

    // Costs
    actualApiCost,
    creditRevenue: Math.round(creditRevenue * 100) / 100,

    // Payouts
    totalPaidOut: Math.round(totalPaidOut * 100) / 100,
    pendingPayouts: Math.round(pendingPayouts * 100) / 100,
    recentPayouts: payouts.slice(0, 10),

    // Funnel & timeline
    monthlySignups,
    referrers: Object.values(referrers).sort((a, b) => b.activeRefs - a.activeRefs),
    userTable,
  });
}
