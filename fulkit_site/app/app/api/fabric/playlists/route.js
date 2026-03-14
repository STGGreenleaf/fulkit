import { authenticateUser, getProvider } from "../../../../lib/fabric-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const provider = getProvider(userId, "spotify");
  const playlists = await provider.getPlaylists();
  return Response.json({ playlists });
}
