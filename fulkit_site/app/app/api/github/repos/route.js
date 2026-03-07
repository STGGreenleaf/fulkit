import { authenticateUser, getGitHubToken, githubFetch } from "../../../../lib/github";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getGitHubToken(userId);
  if (!token) return Response.json({ error: "GitHub not connected" }, { status: 404 });

  try {
    const repos = await githubFetch(token, "/user/repos?sort=pushed&per_page=50&type=all");
    return Response.json(
      repos.map((r) => ({
        name: r.name,
        full_name: r.full_name,
        private: r.private,
        default_branch: r.default_branch,
        pushed_at: r.pushed_at,
      }))
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
