// GET /api/stripe/billing — fetch user's subscription, payment method, invoices
// Returns everything a self-service billing page needs

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const STRIPE_API = "https://api.stripe.com/v1";
const SECRET = process.env.STRIPE_CLIENT_SECRET;

async function stripeGet(endpoint) {
  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  });
  return res.json();
}

export async function GET(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Get stripe_customer_id from profile
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return Response.json({ hasStripe: false });
    }

    const customerId = profile.stripe_customer_id;

    // Fetch subscription, payment methods, and invoices in parallel
    const [subsRes, pmRes, invRes] = await Promise.all([
      stripeGet(`/subscriptions?customer=${customerId}&status=all&limit=1`),
      stripeGet(`/customers/${customerId}/payment_methods?type=card&limit=1`),
      stripeGet(`/invoices?customer=${customerId}&limit=10`),
    ]);

    // Parse subscription
    const sub = subsRes.data?.[0] || null;
    const subscription = sub ? {
      status: sub.status, // active, past_due, canceled, trialing, unpaid
      plan: sub.items?.data?.[0]?.price?.metadata?.plan || sub.metadata?.plan || null,
      amount: sub.items?.data?.[0]?.price?.unit_amount ? (sub.items.data[0].price.unit_amount / 100) : null,
      interval: sub.items?.data?.[0]?.price?.recurring?.interval || "month",
      currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
      created: sub.created ? new Date(sub.created * 1000).toISOString() : null,
    } : null;

    // Parse payment method
    const pm = pmRes.data?.[0] || null;
    const paymentMethod = pm ? {
      brand: pm.card?.brand || "card", // visa, mastercard, amex, etc.
      last4: pm.card?.last4 || "••••",
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    } : null;

    // Parse invoices
    const invoices = (invRes.data || []).map(inv => ({
      id: inv.id,
      number: inv.number,
      amount: inv.amount_paid != null ? (inv.amount_paid / 100) : (inv.total / 100),
      status: inv.status, // paid, open, void, uncollectible
      date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      pdf: inv.invoice_pdf || null,
      hostedUrl: inv.hosted_invoice_url || null,
    }));

    return Response.json({
      hasStripe: true,
      subscription,
      paymentMethod,
      invoices,
      billingEmail: user.email,
    });
  } catch (err) {
    return Response.json({ error: "Failed to load billing info" }, { status: 500 });
  }
}
