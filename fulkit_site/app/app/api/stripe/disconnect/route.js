import { authenticateUser, getStripeToken } from "../../../../lib/stripe-server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function DELETE(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Deauthorize via Stripe
  const integration = await getStripeToken(userId);
  if (integration?.metadata?.stripe_user_id) {
    try {
      await fetch("https://connect.stripe.com/oauth/deauthorize", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.STRIPE_CLIENT_ID,
          stripe_user_id: integration.metadata.stripe_user_id,
        }),
      });
    } catch (err) {
      console.error("[stripe/disconnect] Deauthorize failed:", err.message);
    }
  }

  const { error } = await getSupabaseAdmin()
    .from("integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "stripe");

  if (error) {
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
