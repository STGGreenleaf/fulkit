import { authenticateUser, getFabricToken, fabricFetch } from "../../../../lib/fabric-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getFabricToken(userId);
  if (!token) return Response.json({ connected: false });

  // Validate token by hitting Spotify — triggers auto-refresh if expired
  const res = await fabricFetch(userId, "/me");
  if (res.error || res.status === 401) {
    return Response.json({ connected: false });
  }

  return Response.json({ connected: true });
}
