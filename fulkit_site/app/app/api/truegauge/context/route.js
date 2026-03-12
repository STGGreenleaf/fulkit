import { authenticateUser, getTrueGaugeToken, truegaugeFetch } from "../../../../lib/truegauge";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = await getTrueGaugeToken(userId);
  if (!apiKey) return Response.json({ error: "TrueGauge not connected" }, { status: 404 });

  try {
    const data = await truegaugeFetch(apiKey, "fulkit_context");
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
