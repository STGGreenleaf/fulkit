// POST /api/stripe/webhook — handle Stripe subscription events
// Verifies signature, updates seat_type in profiles

import crypto from "crypto";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { recalculateReferralStats, calculateMonthlyFul, calculateSubscriptionOffset } from "../../../../lib/referral-engine";
import { TIERS } from "../../../../lib/ful-config";

const SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_API = "https://api.stripe.com/v1";

// Price ID → seat_type mapping (monthly + annual → same seat)
const PRICE_TO_SEAT = {
  [process.env.STRIPE_PRICE_STANDARD]: "standard",
  [process.env.STRIPE_PRICE_PRO]: "pro",
  [process.env.STRIPE_PRICE_STANDARD_ANNUAL]: "standard",
  [process.env.STRIPE_PRICE_PRO_ANNUAL]: "pro",
};

function verifySignature(payload, signature, secret) {
  if (!secret) return process.env.NODE_ENV !== "production"; // block in prod if secret missing
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

/**
 * Activate the referral for a user who just subscribed.
 * Flips status to 'active', sets credit rate, recalculates referrer stats.
 */
async function activateReferral(admin, userId) {
  const { data: profile } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", userId)
    .single();

  if (!profile?.referred_by) return;

  const { data: ref } = await admin
    .from("referrals")
    .select("id, status")
    .eq("referrer_id", profile.referred_by)
    .eq("referred_id", userId)
    .single();

  if (!ref || ref.status === "active") return;

  const monthlyFul = calculateMonthlyFul(1); // base rate for credit_ful_per_month

  await admin
    .from("referrals")
    .update({
      status: "active",
      credit_ful_per_month: monthlyFul,
      activated_at: new Date().toISOString(),
      deactivated_at: null,
    })
    .eq("id", ref.id);

  await recalculateReferralStats(admin, profile.referred_by);
}

/**
 * Churn the referral for a user whose subscription ended.
 */
async function churnReferral(admin, userId) {
  const { data: profile } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", userId)
    .single();

  if (!profile?.referred_by) return;

  const { data: ref } = await admin
    .from("referrals")
    .select("id, status")
    .eq("referrer_id", profile.referred_by)
    .eq("referred_id", userId)
    .single();

  if (!ref || ref.status === "churned") return;

  await admin
    .from("referrals")
    .update({
      status: "churned",
      credit_ful_per_month: 0,
      deactivated_at: new Date().toISOString(),
    })
    .eq("id", ref.id);

  await recalculateReferralStats(admin, profile.referred_by);
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

            // Activate referral if user was referred
            activateReferral(admin, userId).catch((e) =>
              console.error("[webhook] activateReferral error:", e)
            );
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

          // Re-activate referral if previously churned
          activateReferral(admin, userId).catch((e) =>
            console.error("[webhook] activateReferral error:", e)
          );
        }

        // If subscription went past_due or unpaid, downgrade + churn referral
        if (userId && (sub.status === "past_due" || sub.status === "unpaid")) {
          await admin
            .from("profiles")
            .update({ seat_type: "free" })
            .eq("id", userId);

          churnReferral(admin, userId).catch((e) =>
            console.error("[webhook] churnReferral error:", e)
          );
        }
        break;
      }

      case "invoice.created": {
        // Apply referral credit as a negative line item before invoice finalizes
        const invoice = event.data.object;
        if (invoice.billing_reason !== "subscription_cycle" && invoice.billing_reason !== "subscription_create") break;
        if (!invoice.customer || !invoice.subscription) break;

        // Find the user
        const { data: invoiceUser } = await admin
          .from("profiles")
          .select("id, total_active_referrals, seat_type")
          .eq("stripe_customer_id", invoice.customer)
          .single();

        if (!invoiceUser || !invoiceUser.total_active_referrals) break;

        const planPrice = TIERS[invoiceUser.seat_type]?.price || 0;
        if (planPrice <= 0) break;

        const offsetDollars = calculateSubscriptionOffset(invoiceUser.total_active_referrals, planPrice);
        if (offsetDollars <= 0) break;

        const offsetCents = Math.round(offsetDollars * 100);

        // Add negative invoice item via Stripe API
        try {
          const res = await fetch(`${STRIPE_API}/invoiceitems`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.STRIPE_CLIENT_SECRET}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              customer: invoice.customer,
              invoice: invoice.id,
              amount: String(-offsetCents),
              currency: "usd",
              description: `Referral credit (${invoiceUser.total_active_referrals} active referrals)`,
            }),
          });

          if (res.ok) {
            // Record in ful_ledger
            const fulSpent = offsetDollars * 100; // convert back to Fül
            await admin
              .from("ful_ledger")
              .insert({
                user_id: invoiceUser.id,
                type: "spent",
                amount_ful: -fulSpent,
                description: `Referral credit applied to invoice ${invoice.id}`,
              });
          } else {
            const err = await res.json();
            console.error("[webhook] invoice item error:", err);
          }
        } catch (e) {
          console.error("[webhook] invoice credit error:", e);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        let userId = sub.metadata?.user_id;

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
            userId = profile.id;
            await admin
              .from("profiles")
              .update({
                seat_type: "free",
                stripe_subscription_id: null,
              })
              .eq("id", profile.id);
          }
        }

        // Churn referral
        if (userId) {
          churnReferral(admin, userId).catch((e) =>
            console.error("[webhook] churnReferral error:", e)
          );
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] Error:", err.message);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
