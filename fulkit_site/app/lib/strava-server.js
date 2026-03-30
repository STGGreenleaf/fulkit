// Server-side Strava helpers — token management + API wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta, encryptToken, encryptMeta } from "./token-crypt";

const STRAVA_API = "https://www.strava.com/api/v3";
const TOKEN_URL = "https://www.strava.com/oauth/token";

export { authenticateUser } from "./numbrly";

export async function getStravaToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "strava")
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
}

async function refreshToken(userId, refreshTokenStr) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshTokenStr,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    console.error("[strava] Token refresh failed:", data);
    return null;
  }

  await getSupabaseAdmin()
    .from("integrations")
    .update({
      access_token: encryptToken(data.access_token),
      metadata: encryptMeta({
        refresh_token: data.refresh_token || refreshTokenStr,
        expires_at: data.expires_at * 1000, // Strava returns unix timestamp
        athlete_id: data.athlete?.id,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "strava");

  return data.access_token;
}

export async function stravaFetch(userId, endpoint, options = {}) {
  const integration = await getStravaToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  let token = integration.access_token;

  const expiresAt = integration.metadata?.expires_at || 0;
  if (Date.now() > expiresAt - 60000) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token refresh failed", status: 401 };
  }

  const res = await fetch(`${STRAVA_API}${endpoint}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token expired", status: 401 };
    return fetch(`${STRAVA_API}${endpoint}`, {
      ...options,
      signal: options.signal || AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  }

  return res;
}

export async function revokeStravaToken(accessToken) {
  try {
    await fetch("https://www.strava.com/oauth/deauthorize", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: accessToken }),
    });
  } catch (err) {
    console.error("[strava] Revoke failed:", err.message);
  }
}
