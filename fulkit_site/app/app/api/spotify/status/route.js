import { authenticateUser, getSpotifyToken } from "../../../../lib/spotify-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getSpotifyToken(userId);
  return Response.json({ connected: !!token });
}
