// Server-side Fitbit helpers — token management + API wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta, encryptToken, encryptMeta } from "./token-crypt";

const FITBIT_API = "https://api.fitbit.com";
const TOKEN_URL = "https://api.fitbit.com/oauth2/token";
const REVOKE_URL = "https://api.fitbit.com/oauth2/revoke";

// Reuse authenticateUser from numbrly (same pattern)
export { authenticateUser } from "./numbrly";

// Get Fitbit tokens from integrations table
export async function getFitbitToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "fitbit")
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
}

// Fitbit uses Basic auth for token refresh (base64 encoded client_id:client_secret)
function getBasicAuth() {
  return Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString("base64");
}

// Refresh expired access token
async function refreshToken(userId, refreshTokenStr) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${getBasicAuth()}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenStr,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    console.error("[fitbit] Token refresh failed:", data);
    return null;
  }

  // Update DB
  await getSupabaseAdmin()
    .from("integrations")
    .update({
      access_token: encryptToken(data.access_token),
      metadata: encryptMeta({
        refresh_token: data.refresh_token || refreshTokenStr,
        expires_at: Date.now() + (data.expires_in || 28800) * 1000,
        user_id: data.user_id,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "fitbit");

  return data.access_token;
}

// Fetch from Fitbit API with auto-refresh
export async function fitbitFetch(userId, endpoint, options = {}) {
  const integration = await getFitbitToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  let token = integration.access_token;

  // Check if token is expired (with 60s buffer)
  const expiresAt = integration.metadata?.expires_at || 0;
  if (Date.now() > expiresAt - 60000) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token refresh failed", status: 401 };
  }

  const res = await fetch(`${FITBIT_API}${endpoint}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // If 401, try one more refresh
  if (res.status === 401) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token expired", status: 401 };
    const retry = await fetch(`${FITBIT_API}${endpoint}`, {
      ...options,
      signal: options.signal || AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    return retry;
  }

  return res;
}

// Revoke token at Fitbit
export async function revokeFitbitToken(accessToken) {
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${getBasicAuth()}`,
      },
      body: new URLSearchParams({ token: accessToken }),
    });
  } catch (err) {
    console.error("[fitbit] Revoke failed:", err.message);
  }
}
