// POST /api/stripe/portal — create Stripe Customer Portal session
// Returns { url } for redirect to manage subscription

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const STRIPE_API = "https://api.stripe.com/v1";
const SECRET = process.env.STRIPE_CLIENT_SECRET;

export async function POST(request) {
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
      return Response.json({ error: "No billing account found" }, { status: 404 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fulkit.app";

    const res = await fetch(`${STRIPE_API}/billing_portal/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: profile.stripe_customer_id,
        return_url: `${siteUrl}/settings?tab=billing`,
      }).toString(),
    });

    const session = await res.json();

    if (session.error) {
      return Response.json({ error: session.error.message }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
