// Server-side monday.com helpers — token management + API wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta } from "./token-crypt";

const MONDAY_API = "https://api.monday.com/v2";

export { authenticateUser } from "./numbrly";

export async function getMondayToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "monday")
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
}

// monday.com tokens don't expire — no refresh needed
export async function mondayFetch(userId, query, variables = {}) {
  const integration = await getMondayToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  const res = await fetch(MONDAY_API, {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: integration.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  return res;
}
