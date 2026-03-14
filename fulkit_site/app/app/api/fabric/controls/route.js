import { authenticateUser, getProvider } from "../../../../lib/fabric-server";

export async function POST(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { action, value } = await request.json();
  const provider = getProvider(userId, "spotify");
  const result = await provider.control(action, value);

  if (result.error) {
    return Response.json({ error: result.error }, { status: result.status || 400 });
  }

  return Response.json({ ok: true });
}
