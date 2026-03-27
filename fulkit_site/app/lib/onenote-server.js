// Server-side OneNote helpers — Microsoft Graph API
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta, encryptToken, encryptMeta } from "./token-crypt";

const GRAPH_API = "https://graph.microsoft.com/v1.0";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

export { authenticateUser } from "./numbrly";

export async function getOneNoteToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "onenote")
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
}

async function refreshToken(userId, refreshTokenStr) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      refresh_token: refreshTokenStr,
      grant_type: "refresh_token",
      scope: "Notes.Read User.Read offline_access",
    }),
  });
  const data = await res.json();
  if (!data.access_token) return null;

  await getSupabaseAdmin()
    .from("integrations")
    .update({
      access_token: encryptToken(data.access_token),
      metadata: encryptMeta({
        refresh_token: data.refresh_token || refreshTokenStr,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "onenote");

  return data.access_token;
}

export async function onenoteFetch(userId, endpoint, options = {}) {
  const integration = await getOneNoteToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  let token = integration.access_token;
  const expiresAt = integration.metadata?.expires_at || 0;
  if (Date.now() > expiresAt - 60000) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token refresh failed", status: 401 };
  }

  const res = await fetch(`${GRAPH_API}${endpoint}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers },
  });

  if (res.status === 401) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token expired", status: 401 };
    return fetch(`${GRAPH_API}${endpoint}`, {
      ...options,
      signal: options.signal || AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers },
    });
  }
  return res;
}
