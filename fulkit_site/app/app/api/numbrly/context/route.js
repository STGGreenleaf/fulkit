import { authenticateUser, getNumbrlyToken, numbrlyFetch } from "../../../../lib/numbrly";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = await getNumbrlyToken(userId);
  if (!apiKey) return Response.json({ error: "Numbrly not connected" }, { status: 404 });

  try {
    const data = await numbrlyFetch(apiKey, "fulkit_context");
    return Response.json(data);
  } catch (err) {
    console.error("[numbrly/context] Error:", err.message);
    return Response.json({ error: "Failed to fetch context" }, { status: 502 });
  }
}
