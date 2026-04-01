// Server-side Vagaro helpers — credential-based auth + API wrapper
// Vagaro uses client credentials (not OAuth redirect). Users enter
// their clientId + clientSecretKey + region from Vagaro dashboard.
// Tokens expire every 1 hour — auto-refresh on each call.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta, encryptToken, encryptMeta } from "./token-crypt";

export async function getVagaroToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "vagaro")
    .single();
  if (!data?.access_token) return null;

  const meta = decryptMeta(data.metadata);
  if (!meta?.clientId || !meta?.clientSecretKey || !meta?.region) return null;

  let token = decryptToken(data.access_token);
  const expiresAt = meta.expires_at || 0;

  // Refresh if within 5 minutes of expiry (tokens last 1 hour)
  if (!token || Date.now() > expiresAt - 300000) {
    token = await refreshVagaroToken(userId, meta);
    if (!token) return null;
  }

  return { token, region: meta.region };
}

async function refreshVagaroToken(userId, meta) {
  try {
    const res = await fetch(`https://api.vagaro.com/${meta.region}/api/v2/merchants/generate-access-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: meta.clientId,
        clientSecretKey: meta.clientSecretKey,
        scope: "merchants.read,customers.read,appointments.read,services.read",
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.data?.access_token) return null;

    const newToken = data.data.access_token;
    const expiresIn = data.data.expires_in || 3600;

    // Update stored token
    await getSupabaseAdmin()
      .from("integrations")
      .update({
        access_token: encryptToken(newToken),
        metadata: encryptMeta({
          ...meta,
          expires_at: Date.now() + expiresIn * 1000,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", "vagaro");

    return newToken;
  } catch (err) {
    console.error("[vagaro] Token refresh failed:", err.message);
    return null;
  }
}

export async function vagaroFetch(userId, endpoint, options = {}) {
  const integration = await getVagaroToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  const { token, region } = integration;
  const url = `https://api.vagaro.com/${region}/api/v2${endpoint}`;

  const res = await fetch(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
    headers: {
      accessToken: token,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.message || `Vagaro API error: ${res.status}`, status: res.status };
  }

  return res.json();
}
