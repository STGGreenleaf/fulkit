import { authenticateUser, getTrueGaugeToken } from "../../../../lib/truegauge";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getTrueGaugeToken(userId);
  return Response.json({ connected: !!token });
}
