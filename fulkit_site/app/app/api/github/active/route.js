import { authenticateUser, getGitHubToken, githubFetch } from "../../../../lib/github";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// GET — return active repos with their top-level file trees
export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getGitHubToken(userId);
  if (!token) return Response.json({ error: "GitHub not connected" }, { status: 404 });

  // Get active repo list from metadata
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("metadata")
    .eq("user_id", userId)
    .eq("provider", "github")
    .single();

  const activeRepos = data?.metadata?.activeRepos || [];
  if (activeRepos.length === 0) return Response.json([]);

  // Fetch top-level tree for each active repo
  const results = [];
  for (const repoName of activeRepos) {
    try {
      const contents = await githubFetch(token, `/repos/${repoName}/contents/`);
      const tree = Array.isArray(contents)
        ? contents.map((f) => ({ name: f.name, type: f.type === "dir" ? "dir" : "file", size: f.size || 0 }))
        : [];
      results.push({ repo: repoName, tree });
    } catch {
      results.push({ repo: repoName, tree: [], error: true });
    }
  }

  return Response.json(results);
}

// PUT — update active repos list
export async function PUT(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { activeRepos } = await request.json();
  if (!Array.isArray(activeRepos)) {
    return Response.json({ error: "activeRepos must be an array" }, { status: 400 });
  }

  // Update metadata on the integration row
  const { data: existing } = await getSupabaseAdmin()
    .from("integrations")
    .select("metadata")
    .eq("user_id", userId)
    .eq("provider", "github")
    .single();

  const metadata = { ...(existing?.metadata || {}), activeRepos };

  const { error } = await getSupabaseAdmin()
    .from("integrations")
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", "github");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
