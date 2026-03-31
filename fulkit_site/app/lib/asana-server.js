// Server-side Asana helpers — token management + API wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta, encryptToken, encryptMeta } from "./token-crypt";

const ASANA_API = "https://app.asana.com/api/1.0";
const TOKEN_URL = "https://app.asana.com/-/oauth_token";

export { authenticateUser } from "./numbrly";

export async function getAsanaToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "asana")
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
}

async function refreshToken(userId, refreshTokenStr) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ASANA_CLIENT_ID,
      client_secret: process.env.ASANA_CLIENT_SECRET,
      refresh_token: refreshTokenStr,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    console.error("[asana] Token refresh failed:", data);
    return null;
  }

  await getSupabaseAdmin()
    .from("integrations")
    .update({
      access_token: encryptToken(data.access_token),
      metadata: encryptMeta({
        refresh_token: data.refresh_token || refreshTokenStr,
        expires_at: Date.now() + data.expires_in * 1000,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "asana");

  return data.access_token;
}

export async function asanaFetch(userId, endpoint, options = {}) {
  const integration = await getAsanaToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  let token = integration.access_token;
  const expiresAt = integration.metadata?.expires_at || 0;

  // Refresh if within 60s of expiry
  if (expiresAt && Date.now() > expiresAt - 60000) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token refresh failed", status: 401 };
  }

  const res = await fetch(`${ASANA_API}${endpoint}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token expired", status: 401 };
    return fetch(`${ASANA_API}${endpoint}`, {
      ...options,
      signal: options.signal || AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  return res;
}
