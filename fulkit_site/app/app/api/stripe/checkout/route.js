// POST /api/stripe/checkout — create Stripe Checkout session
// Returns { url } for redirect to Stripe-hosted checkout

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const STRIPE_API = "https://api.stripe.com/v1";
const SECRET = process.env.STRIPE_CLIENT_SECRET;

const PRICE_MAP = {
  standard: process.env.STRIPE_PRICE_STANDARD,
  pro: process.env.STRIPE_PRICE_PRO,
  credits: process.env.STRIPE_PRICE_CREDITS,
};

async function stripePost(endpoint, params) {
  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  return res.json();
}

// Find or create a Stripe customer by email
async function getOrCreateCustomer(email, userId) {
  // Search existing
  const search = await fetch(
    `${STRIPE_API}/customers/search?query=${encodeURIComponent(`email:"${email}"`)}`,
    { headers: { Authorization: `Bearer ${SECRET}` } }
  ).then((r) => r.json());

  if (search.data?.length > 0) return search.data[0].id;

  // Create new
  const customer = await stripePost("/customers", {
    email,
    metadata: { fulkit_user_id: userId },
  });
  return customer.id;
}

export async function POST(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { plan } = await request.json();
    const priceId = PRICE_MAP[plan];
    if (!priceId) return Response.json({ error: "Invalid plan" }, { status: 400 });

    const customerId = await getOrCreateCustomer(user.email, user.id);

    // Store customer ID in profiles for webhook lookups
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);

    const isSubscription = plan !== "credits";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fulkit.app";

    const params = {
      customer: customerId,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      mode: isSubscription ? "subscription" : "payment",
      success_url: `${siteUrl}/settings?tab=billing&success=true`,
      cancel_url: `${siteUrl}/settings?tab=billing`,
    };

    // For credits, attach metadata so webhook knows to add messages
    if (plan === "credits") {
      params["payment_intent_data[metadata][type]"] = "credits";
      params["payment_intent_data[metadata][user_id]"] = user.id;
      params["payment_intent_data[metadata][amount]"] = "100";
    } else {
      params["subscription_data[metadata][user_id]"] = user.id;
      params["subscription_data[metadata][plan]"] = plan;
    }

    const session = await stripePost("/checkout/sessions", params);

    if (session.error) {
      return Response.json({ error: session.error.message }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
