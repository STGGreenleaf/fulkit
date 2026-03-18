// Server-side GitHub helpers — only import from API routes
import { getSupabaseAdmin } from "./supabase-server";
import { decryptToken } from "./token-crypt";

export async function getGitHubToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token")
    .eq("user_id", userId)
    .eq("provider", "github")
    .single();
  return data?.access_token ? decryptToken(data.access_token) : null;
}

export async function githubFetch(token, endpoint) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Fulkit",
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }
  return res.json();
}

// Authenticate user from Bearer token, returns userId or null
export async function authenticateUser(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (!error && user) return user.id;
  } catch {}
  return null;
}
