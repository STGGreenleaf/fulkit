import { authenticateUser, getFabricToken } from "../../../../lib/fabric-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getFabricToken(userId);
  return Response.json({ connected: !!token });
}
