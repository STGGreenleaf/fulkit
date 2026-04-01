// Server-side Linear helpers — token management + GraphQL wrapper
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken, encryptToken } from "./token-crypt";

const GRAPHQL_URL = "https://api.linear.app/graphql";

export { authenticateUser } from "./numbrly";

export async function getLinearToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token")
    .eq("user_id", userId)
    .eq("provider", "linear")
    .single();
  if (!data) return null;
  return decryptToken(data.access_token);
}

export async function linearQuery(userId, query, variables = {}) {
  const token = await getLinearToken(userId);
  if (!token) return { error: "Not connected", status: 401 };

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) return { error: `Linear API ${res.status}`, status: res.status };
  const data = await res.json();
  if (data.errors) return { error: data.errors[0]?.message || "GraphQL error" };
  return data.data;
}
