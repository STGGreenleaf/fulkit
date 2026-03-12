// Server-side Shopify helpers — token management + API wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";

// Reuse authenticateUser from numbrly (same pattern)
export { authenticateUser } from "./numbrly";

// Get Shopify tokens from integrations table
export async function getShopifyToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "shopify")
    .single();
  return data || null;
}

// Shopify access tokens don't expire (no refresh needed), but we check for validity
export async function shopifyFetch(userId, endpoint, options = {}) {
  const integration = await getShopifyToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  const shop = integration.metadata?.shop;
  if (!shop) return { error: "No shop configured", status: 400 };

  const apiVersion = "2024-10";
  const res = await fetch(`https://${shop}/admin/api/${apiVersion}${endpoint}`, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": integration.access_token,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.errors || `Shopify API error: ${res.status}`);
  }

  return res.json();
}
