/**
 * POST /api/referrals/connect — Initiate Stripe Connect Express onboarding.
 * Creates a Connect account and returns the onboarding URL.
 * Only available to Builder tier (25+ referrals) and above.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { REFERRALS } from "../../../../lib/ful-config";

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

  const { data: profile } = await admin
    .from("profiles")
    .select("referral_tier, stripe_connect_account_id, name, total_active_referrals")
    .eq("id", user.id)
    .single();

  // Must be at Builder tier or above
  if (!profile || profile.referral_tier < REFERRALS.payoutMinTier) {
    return Response.json({
      error: `You need ${REFERRALS.tiers[REFERRALS.payoutMinTier - 1]?.min || 25}+ active referrals to unlock payouts.`,
    }, { status: 403 });
  }

  // If already connected, return a dashboard link instead
  if (profile.stripe_connect_account_id) {
    try {
      const res = await fetch(`${STRIPE_API}/accounts/${profile.stripe_connect_account_id}/login_links`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_CLIENT_SECRET}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      const link = await res.json();
      if (link.url) {
        return Response.json({ url: link.url, connected: true });
      }
    } catch {}
    return Response.json({ connected: true });
  }

  // Create a Stripe Connect Express account
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fulkit.app";

  try {
    const res = await fetch(`${STRIPE_API}/accounts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_CLIENT_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        type: "express",
        country: "US",
        "capabilities[transfers][requested]": "true",
        "metadata[user_id]": user.id,
        "business_profile[product_description]": "Fulkit referral payouts",
      }),
    });
    const account = await res.json();
    if (account.error) {
      console.error("[connect] account creation error:", account.error);
      return Response.json({ error: "Failed to create payout account" }, { status: 500 });
    }

    // Store the account ID
    await admin
      .from("profiles")
      .update({ stripe_connect_account_id: account.id })
      .eq("id", user.id);

    // Create an account link for onboarding
    const linkRes = await fetch(`${STRIPE_API}/account_links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_CLIENT_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        account: account.id,
        refresh_url: `${siteUrl}/settings/referrals`,
        return_url: `${siteUrl}/api/referrals/connect/callback?account=${account.id}`,
        type: "account_onboarding",
      }),
    });
    const link = await linkRes.json();
    if (link.error) {
      console.error("[connect] account link error:", link.error);
      return Response.json({ error: "Failed to create onboarding link" }, { status: 500 });
    }

    return Response.json({ url: link.url, connected: false });
  } catch (err) {
    console.error("[connect] error:", err);
    return Response.json({ error: "Failed to set up payouts" }, { status: 500 });
  }
}
