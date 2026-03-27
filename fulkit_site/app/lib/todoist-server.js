// Server-side Todoist helpers — token management + API wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta } from "./token-crypt";

const TODOIST_API = "https://api.todoist.com/rest/v2";

export { authenticateUser } from "./numbrly";

export async function getTodoistToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "todoist")
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
}

// Todoist tokens don't expire
export async function todoistFetch(userId, endpoint, options = {}) {
  const integration = await getTodoistToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  const res = await fetch(`${TODOIST_API}${endpoint}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${integration.access_token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res;
}
