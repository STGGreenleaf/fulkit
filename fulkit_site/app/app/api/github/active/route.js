import { authenticateUser, getGitHubToken, githubFetch } from "../../../../lib/github";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// GET — return active repos with their full recursive file trees
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

  // Fetch full recursive tree for each active repo
  const results = [];
  for (const repoName of activeRepos) {
    try {
      // Get default branch first
      const repo = await githubFetch(token, `/repos/${repoName}`);
      const branch = repo.default_branch || "main";
      // Use the git trees API with recursive flag for the full tree
      const treeData = await githubFetch(token, `/repos/${repoName}/git/trees/${branch}?recursive=1`);
      const tree = (treeData.tree || [])
        .filter((f) => f.type === "blob" || f.type === "tree")
        .map((f) => ({ path: f.path, type: f.type === "tree" ? "dir" : "file", size: f.size || 0 }));
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
