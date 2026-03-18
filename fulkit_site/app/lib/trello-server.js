// Server-side Trello helpers — token management + API wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta } from "./token-crypt";

const TRELLO_API = "https://api.trello.com/1";

// Reuse authenticateUser from numbrly (same pattern)
export { authenticateUser } from "./numbrly";

// Get Trello token from integrations table
export async function getTrelloToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "trello")
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
}

// Trello API Key + Token auth: ?key={API_KEY}&token={USER_TOKEN} on every request
// Tokens never expire (authorized with expiration=never)
export async function trelloFetch(userId, endpoint, options = {}) {
  const integration = await getTrelloToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  const separator = endpoint.includes("?") ? "&" : "?";
  const authParams = `key=${process.env.TRELLO_API_KEY}&token=${integration.access_token}`;
  const url = `${TRELLO_API}${endpoint}${separator}${authParams}`;

  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `Trello API error: ${res.status}`);
  }

  return res.json();
}
