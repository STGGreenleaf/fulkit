import { authenticateUser, getGitHubToken } from "../../../../lib/github";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getGitHubToken(userId);
  return Response.json({ connected: !!token });
}
