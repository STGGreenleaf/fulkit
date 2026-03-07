import { authenticateUser, getGitHubToken, githubFetch } from "../../../../lib/github";

const MAX_FILE_SIZE = 500 * 1024; // 500KB

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getGitHubToken(userId);
  if (!token) return Response.json({ error: "GitHub not connected" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");
  const path = searchParams.get("path");
  const branch = searchParams.get("branch") || "";

  if (!repo || !path) return Response.json({ error: "repo and path parameters required" }, { status: 400 });

  try {
    const endpoint = `/repos/${repo}/contents/${path}${branch ? `?ref=${branch}` : ""}`;
    const file = await githubFetch(token, endpoint);

    if (file.type !== "file") {
      return Response.json({ error: "Path is not a file" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: `File too large (${Math.round(file.size / 1024)}KB). Max ${MAX_FILE_SIZE / 1024}KB.` }, { status: 413 });
    }

    const content = Buffer.from(file.content, "base64").toString("utf-8");
    return Response.json({
      name: file.name,
      path: file.path,
      content,
      size: file.size,
      sha: file.sha,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
