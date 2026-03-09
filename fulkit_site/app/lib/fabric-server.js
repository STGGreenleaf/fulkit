// Server-side Fabric helpers — token management + API wrapper (Spotify backend)
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";

const SPOTIFY_API = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

// Authenticate user from Bearer token
export async function authenticateUser(request) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

// Get Spotify tokens from integrations table
export async function getFabricToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "spotify")
    .single();
  return data || null;
}

// Refresh expired access token
async function refreshToken(userId, refreshTokenStr) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenStr,
    }),
  });

  const data = await res.json();
  if (data.error || !data.access_token) {
    console.error("[spotify] Token refresh failed:", data.error);
    return null;
  }

  // Update DB
  await getSupabaseAdmin()
    .from("integrations")
    .update({
      access_token: data.access_token,
      metadata: { refresh_token: data.refresh_token || refreshTokenStr, expires_at: Date.now() + data.expires_in * 1000 },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "spotify");

  return data.access_token;
}

// Fetch from Spotify API with auto-refresh
export async function fabricFetch(userId, endpoint, options = {}) {
  const integration = await getFabricToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  let token = integration.access_token;

  // Check if token is expired (with 60s buffer)
  const expiresAt = integration.metadata?.expires_at || 0;
  if (Date.now() > expiresAt - 60000) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token refresh failed", status: 401 };
  }

  const res = await fetch(`${SPOTIFY_API}${endpoint}`, {
    ...options,
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
    const retry = await fetch(`${SPOTIFY_API}${endpoint}`, {
      ...options,
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
