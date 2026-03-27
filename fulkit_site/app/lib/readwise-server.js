// Server-side Readwise helpers — API key based (not OAuth)
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken } from "./token-crypt";

const READWISE_API = "https://readwise.io/api/v2";

export { authenticateUser } from "./numbrly";

export async function getReadwiseToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token")
    .eq("user_id", userId)
    .eq("provider", "readwise")
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token) };
}

// Readwise uses API key as Bearer token — no refresh needed
export async function readwiseFetch(userId, endpoint, options = {}) {
  const integration = await getReadwiseToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  const res = await fetch(`${READWISE_API}${endpoint}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
    headers: {
      Authorization: `Token ${integration.access_token}`,
      ...options.headers,
    },
  });
  return res;
}
