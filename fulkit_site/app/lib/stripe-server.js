// Server-side Stripe helpers — token management + API wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta } from "./token-crypt";

const STRIPE_API = "https://api.stripe.com/v1";

// Reuse authenticateUser from numbrly (same pattern)
export { authenticateUser } from "./numbrly";

// Get Stripe tokens — check integrations table first, fall back to env var
export async function getStripeToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "stripe")
    .single();
  if (data) return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
  // Fall back to env var (owner's own Stripe account)
  if (process.env.STRIPE_CLIENT_SECRET) {
    return { access_token: process.env.STRIPE_CLIENT_SECRET, metadata: {} };
  }
  return null;
}

// Stripe API calls — uses stored token or env var secret key
export async function stripeFetch(userId, endpoint, options = {}) {
  const integration = await getStripeToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  const method = options.method || "GET";
  const fetchOpts = {
    method,
    headers: {
      Authorization: `Bearer ${integration.access_token}`,
      ...options.headers,
    },
  };

  // Stripe uses form-encoded for POST, not JSON
  if (method === "POST" && options.body) {
    fetchOpts.headers["Content-Type"] = "application/x-www-form-urlencoded";
    fetchOpts.body = options.body;
  }

  const res = await fetch(`${STRIPE_API}${endpoint}`, fetchOpts);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Stripe API error: ${res.status}`);
  }

  return res.json();
}
