#!/usr/bin/env node
// One-time script: create Stripe Products + Prices for Fülkit subscriptions
// Run: node scripts/stripe-setup.mjs
// Outputs env vars to add to .env.local + Vercel

import { config } from "dotenv";
config({ path: ".env.local" });

const STRIPE_API = "https://api.stripe.com/v1";
const SECRET = process.env.STRIPE_CLIENT_SECRET;

if (!SECRET) {
  console.error("Missing STRIPE_CLIENT_SECRET in .env.local");
  process.exit(1);
}

async function stripePost(endpoint, body) {
  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  if (data.error) {
    console.error(`Stripe error on ${endpoint}:`, data.error.message);
    process.exit(1);
  }
  return data;
}

async function main() {
  console.log("Creating Stripe products and prices...\n");

  // 1. Standard subscription — $7/mo, 450 messages
  const standardProduct = await stripePost("/products",
    "name=F%C3%BClkit+Standard&description=450+messages+per+month.+Sonnet+model.");
  const standardPrice = await stripePost("/prices",
    `product=${standardProduct.id}&unit_amount=700&currency=usd&recurring[interval]=month&lookup_key=fulkit_standard_monthly`);

  // 2. Pro subscription — $15/mo, 800 messages
  const proProduct = await stripePost("/products",
    "name=F%C3%BClkit+Pro&description=800+messages+per+month.+Sonnet+model.+Priority+support.");
  const proPrice = await stripePost("/prices",
    `product=${proProduct.id}&unit_amount=1500&currency=usd&recurring[interval]=month&lookup_key=fulkit_pro_monthly`);

  // 3. Credits — $2 one-time, 100 messages
  const creditsProduct = await stripePost("/products",
    "name=F%C3%BCl+Credits&description=100+additional+messages.+Use+anytime.");
  const creditsPrice = await stripePost("/prices",
    `product=${creditsProduct.id}&unit_amount=200&currency=usd&lookup_key=fulkit_credits_100`);

  console.log("Done! Add these to .env.local and Vercel:\n");
  console.log(`STRIPE_PRICE_STANDARD=${standardPrice.id}`);
  console.log(`STRIPE_PRICE_PRO=${proPrice.id}`);
  console.log(`STRIPE_PRICE_CREDITS=${creditsPrice.id}`);
  console.log(`\nProducts created:`);
  console.log(`  Standard: ${standardProduct.id} → ${standardPrice.id}`);
  console.log(`  Pro:      ${proProduct.id} → ${proPrice.id}`);
  console.log(`  Credits:  ${creditsProduct.id} → ${creditsPrice.id}`);
  console.log(`\nNext: set up webhook at https://dashboard.stripe.com/webhooks`);
  console.log(`  URL: https://fulkit.app/api/stripe/webhook`);
  console.log(`  Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted`);
  console.log(`  Then add STRIPE_WEBHOOK_SECRET=whsec_... to .env.local + Vercel`);
}

main();
