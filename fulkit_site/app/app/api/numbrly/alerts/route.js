import { authenticateUser, numbrlyFetch, getNumbrlyToken } from "../../../../lib/numbrly";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = await getNumbrlyToken(userId);
  if (!apiKey) return Response.json({ alerts: [] });

  try {
    const data = await numbrlyFetch(apiKey, "list_alerts");
    return Response.json(data);
  } catch {
    return Response.json({ alerts: [] });
  }
}
