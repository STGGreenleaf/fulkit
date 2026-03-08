import { authenticateUser, getNumbrlyToken } from "../../../../lib/numbrly";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNumbrlyToken(userId);
  return Response.json({ connected: !!token });
}
