// Server-side Google helpers — token management + API wrapper
// Shared by Google Calendar, Gmail, Google Drive.
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta, encryptToken, encryptMeta } from "./token-crypt";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

// Reuse authenticateUser from numbrly (same pattern)
export { authenticateUser } from "./numbrly";

// Get Google tokens from integrations table
export async function getGoogleToken(userId, provider) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
}

// Refresh expired access token
async function refreshToken(userId, provider, refreshTokenStr) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: refreshTokenStr,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    console.error(`[google/${provider}] Token refresh failed:`, data);
    return null;
  }

  // Update DB
  await getSupabaseAdmin()
    .from("integrations")
    .update({
      access_token: encryptToken(data.access_token),
      metadata: encryptMeta({
        refresh_token: refreshTokenStr, // Google doesn't always return a new refresh token
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", provider);

  return data.access_token;
}

// Fetch from Google API with auto-refresh
export async function googleFetch(userId, provider, url, options = {}) {
  const integration = await getGoogleToken(userId, provider);
  if (!integration) return { error: "Not connected", status: 401 };

  let token = integration.access_token;

  // Check if token is expired (with 60s buffer)
  const expiresAt = integration.metadata?.expires_at || 0;
  if (Date.now() > expiresAt - 60000) {
    token = await refreshToken(userId, provider, integration.metadata?.refresh_token);
    if (!token) return { error: "Token refresh failed", status: 401 };
  }

  const res = await fetch(url, {
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
    token = await refreshToken(userId, provider, integration.metadata?.refresh_token);
    if (!token) return { error: "Token expired", status: 401 };
    const retry = await fetch(url, {
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

// Revoke token at Google
export async function revokeGoogleToken(accessToken) {
  try {
    await fetch(`${REVOKE_URL}?token=${accessToken}`, { method: "POST" });
  } catch (err) {
    console.error("[google] Revoke failed:", err.message);
  }
}
