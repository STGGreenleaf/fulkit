// Server-side Square helpers — token management + API wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";

const IS_SANDBOX = (process.env.SQUARE_APP_ID || "").startsWith("sandbox-");
const SQUARE_BASE = IS_SANDBOX
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";
const SQUARE_API = `${SQUARE_BASE}/v2`;
const TOKEN_URL = `${SQUARE_BASE}/oauth2/token`;

// Reuse authenticateUser from numbrly (same pattern)
export { authenticateUser } from "./numbrly";

// Get Square tokens from integrations table
export async function getSquareToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "square")
    .single();
  return data || null;
}

// Refresh expired access token
async function refreshToken(userId, refreshTokenStr) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APP_ID,
      client_secret: process.env.SQUARE_APP_SECRET,
      refresh_token: refreshTokenStr,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    console.error("[square] Token refresh failed:", data);
    return null;
  }

  // Update DB
  await getSupabaseAdmin()
    .from("integrations")
    .update({
      access_token: data.access_token,
      metadata: {
        refresh_token: data.refresh_token || refreshTokenStr,
        expires_at: new Date(data.expires_at).getTime(),
        merchant_id: data.merchant_id,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "square");

  return data.access_token;
}

// Fetch from Square API with auto-refresh
export async function squareFetch(userId, endpoint, options = {}) {
  const integration = await getSquareToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  let token = integration.access_token;

  // Check if token is expired (with 60s buffer)
  const expiresAt = integration.metadata?.expires_at || 0;
  if (Date.now() > expiresAt - 60000) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token refresh failed", status: 401 };
  }

  const res = await fetch(`${SQUARE_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-11-20",
      ...options.headers,
    },
  });

  // If 401, try one more refresh
  if (res.status === 401) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token expired", status: 401 };
    const retry = await fetch(`${SQUARE_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-11-20",
        ...options.headers,
      },
    });
    return retry;
  }

  return res;
}
