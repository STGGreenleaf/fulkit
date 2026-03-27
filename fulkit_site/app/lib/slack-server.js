// Server-side Slack helpers — token management + API wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, decryptMeta } from "./token-crypt";

const SLACK_API = "https://slack.com/api";

export { authenticateUser } from "./numbrly";

export async function getSlackToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("provider", "slack")
    .single();
  if (!data) return null;
  return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
}

// Slack tokens don't expire (bot tokens are permanent)
export async function slackFetch(userId, method, params = {}) {
  const integration = await getSlackToken(userId);
  if (!integration) return { error: "Not connected", status: 401 };

  const res = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${integration.access_token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(params),
  });

  return res.json();
}
