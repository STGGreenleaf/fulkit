// Server-side Notion helpers — token management + API wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta } from "./token-crypt";

const NOTION_API = "https://api.notion.com/v1";

// Reuse authenticateUser from numbrly (same pattern)
export { authenticateUser } from "./numbrly";

// Get Notion token from integrations table
export async function getNotionToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "notion")
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
}

// Notion tokens don't expire — no refresh needed
export async function notionFetch(userId, endpoint, options = {}) {
  const integration = await getNotionToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  const res = await fetch(`${NOTION_API}${endpoint}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${integration.access_token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
      ...options.headers,
    },
  });

  return res;
}
