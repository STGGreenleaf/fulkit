// Server-side QuickBooks helpers — token management + API wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta, encryptToken, encryptMeta } from "./token-crypt";

const QB_API_BASE = "https://quickbooks.api.intuit.com/v3/company";
const QB_SANDBOX_API = "https://sandbox-quickbooks.api.intuit.com/v3/company";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

// Use sandbox in development
const getApiBase = () => process.env.NODE_ENV === "production" ? QB_API_BASE : QB_SANDBOX_API;

// Reuse authenticateUser from numbrly (same pattern)
export { authenticateUser } from "./numbrly";

// Get QuickBooks tokens from integrations table
export async function getQuickBooksToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "quickbooks")
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
}

// QuickBooks uses Basic auth for token refresh
function getBasicAuth() {
  return Buffer.from(`${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`).toString("base64");
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
    console.error("[quickbooks] Token refresh failed:", data);
    return null;
  }

  // Get existing metadata for realm_id
  const existing = await getQuickBooksToken(userId);
  const realmId = existing?.metadata?.realm_id;

  await getSupabaseAdmin()
    .from("integrations")
    .update({
      access_token: encryptToken(data.access_token),
      metadata: encryptMeta({
        refresh_token: data.refresh_token || refreshTokenStr,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
        realm_id: realmId,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "quickbooks");

  return data.access_token;
}

// Fetch from QuickBooks API with auto-refresh
export async function qbFetch(userId, endpoint, options = {}) {
  const integration = await getQuickBooksToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  const realmId = integration.metadata?.realm_id;
  if (!realmId) return { error: "No company ID", status: 400 };

  let token = integration.access_token;

  // Check if token is expired (with 60s buffer)
  const expiresAt = integration.metadata?.expires_at || 0;
  if (Date.now() > expiresAt - 60000) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token refresh failed", status: 401 };
  }

  const url = `${getApiBase()}/${realmId}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // If 401, try one more refresh
  if (res.status === 401) {
    token = await refreshToken(userId, integration.metadata?.refresh_token);
    if (!token) return { error: "Token expired", status: 401 };
    const retry = await fetch(url, {
      ...options,
      signal: options.signal || AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    return retry;
  }

  return res;
}

// Revoke token at QuickBooks
export async function revokeQBToken(accessToken) {
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${getBasicAuth()}`,
      },
      body: JSON.stringify({ token: accessToken }),
    });
  } catch (err) {
    console.error("[quickbooks] Revoke failed:", err.message);
  }
}
