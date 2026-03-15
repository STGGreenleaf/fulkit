// POST /api/stripe/webhook — handle Stripe subscription events
// Verifies signature, updates seat_type in profiles

import crypto from "crypto";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_API = "https://api.stripe.com/v1";

// Price ID → seat_type mapping
const PRICE_TO_SEAT = {
  [process.env.STRIPE_PRICE_STANDARD]: "standard",
  [process.env.STRIPE_PRICE_PRO]: "pro",
};

function verifySignature(payload, signature, secret) {
  if (!secret) return true; // Skip in dev if no secret set
  const elements = signature.split(",");
  const timestamp = elements.find((e) => e.startsWith("t="))?.split("=")[1];
  const sigs = elements.filter((e) => e.startsWith("v1=")).map((e) => e.split("=")[1]);
  if (!timestamp || sigs.length === 0) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return sigs.some((sig) => crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

async function getSubscription(subscriptionId) {
  const res = await fetch(`${STRIPE_API}/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_CLIENT_SECRET}` },
  });
  return res.json();
}

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (SECRET && !verifySignature(body, signature, SECRET)) {
      return Response.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const admin = getSupabaseAdmin();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        // Credits purchase (one-time payment)
        if (session.mode === "payment") {
          const userId = session.metadata?.user_id;
          const amount = parseInt(session.metadata?.amount || "0", 10);
          if (userId && amount > 0) {
            // Add credits to message allowance by decrementing messages_this_month
            const { data: profile } = await admin
              .from("profiles")
              .select("messages_this_month")
              .eq("id", userId)
              .single();
            if (profile) {
              await admin
                .from("profiles")
                .update({
                  messages_this_month: Math.max(0, (profile.messages_this_month || 0) - amount),
                })
                .eq("id", userId);
            }
          }
          break;
        }

        // Subscription checkout — get the subscription to find the price
        if (session.subscription) {
          const sub = await getSubscription(session.subscription);
          const priceId = sub.items?.data?.[0]?.price?.id;
          const seatType = PRICE_TO_SEAT[priceId] || "standard";
          const userId = sub.metadata?.user_id || session.metadata?.user_id;

          if (userId) {
            await admin
              .from("profiles")
              .update({
                seat_type: seatType,
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
              })
              .eq("id", userId);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const seatType = PRICE_TO_SEAT[priceId] || "standard";
        const userId = sub.metadata?.user_id;

        // If subscription is active or trialing, set the seat type
        if (userId && (sub.status === "active" || sub.status === "trialing")) {
          await admin
            .from("profiles")
            .update({ seat_type: seatType })
            .eq("id", userId);
        }

        // If subscription went past_due or unpaid, downgrade
        if (userId && (sub.status === "past_due" || sub.status === "unpaid")) {
          await admin
            .from("profiles")
            .update({ seat_type: "free" })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id;

        if (userId) {
          await admin
            .from("profiles")
            .update({
              seat_type: "free",
              stripe_subscription_id: null,
            })
            .eq("id", userId);
        } else {
          // Fallback: look up by customer ID
          const { data: profile } = await admin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", sub.customer)
            .single();
          if (profile) {
            await admin
              .from("profiles")
              .update({
                seat_type: "free",
                stripe_subscription_id: null,
              })
              .eq("id", profile.id);
          }
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
