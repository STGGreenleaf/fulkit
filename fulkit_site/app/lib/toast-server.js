// Server-side Toast helpers — token management + API wrapper
// Only import from API routes. Never from client.
// Note: Toast API requires partner approval. This is built for when access is granted.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta, encryptToken, encryptMeta } from "./token-crypt";

const TOAST_API = "https://ws-api.toasttab.com";
const TOKEN_URL = "https://ws-api.toasttab.com/authentication/v1/authentication/login";

// Reuse authenticateUser from numbrly (same pattern)
export { authenticateUser } from "./numbrly";

// Get Toast tokens from integrations table
export async function getToastToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "toast")
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
}

// Refresh Toast token (they use client credentials + restaurant GUID)
async function refreshToken(userId, metadata) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: process.env.TOAST_CLIENT_ID,
      clientSecret: process.env.TOAST_CLIENT_SECRET,
      userAccessType: "TOAST_MACHINE_CLIENT",
    }),
  });

  const data = await res.json();
  if (!data.token?.accessToken) {
    console.error("[toast] Token refresh failed:", data);
    return null;
  }

  await getSupabaseAdmin()
    .from("integrations")
    .update({
      access_token: encryptToken(data.token.accessToken),
      metadata: encryptMeta({ ...metadata, expires_at: Date.now() + 3600000 }),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "toast");

  return data.token.accessToken;
}

export async function toastFetch(userId, endpoint, options = {}) {
  const integration = await getToastToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  let token = integration.access_token;
  const metadata = integration.metadata || {};

  // Check expiry with 60s buffer
  const expiresAt = metadata.expires_at || 0;
  if (Date.now() > expiresAt - 60000) {
    token = await refreshToken(userId, metadata);
    if (!token) return { error: "Token refresh failed", status: 401 };
  }

  const restaurantGuid = metadata.restaurant_guid;
  const res = await fetch(`${TOAST_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Toast-Restaurant-External-ID": restaurantGuid || "",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Toast API error: ${res.status}`);
  }

  return res.json();
}
