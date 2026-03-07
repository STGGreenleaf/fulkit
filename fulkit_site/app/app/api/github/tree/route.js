import { authenticateUser, getGitHubToken, githubFetch } from "../../../../lib/github";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getGitHubToken(userId);
  if (!token) return Response.json({ error: "GitHub not connected" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");
  const path = searchParams.get("path") || "";
  const branch = searchParams.get("branch") || "";

  if (!repo) return Response.json({ error: "repo parameter required" }, { status: 400 });

  try {
    const endpoint = `/repos/${repo}/contents/${path}${branch ? `?ref=${branch}` : ""}`;
    const contents = await githubFetch(token, endpoint);

    // GitHub returns an object for single files, array for directories
    const items = Array.isArray(contents) ? contents : [contents];
    return Response.json(
      items.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type === "dir" ? "dir" : "file",
        size: item.size || 0,
      }))
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
