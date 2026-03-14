import { authenticateUser, getProvider } from "../../../../../../lib/fabric-server";

export async function GET(request, { params }) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return Response.json({ error: "Playlist ID required" }, { status: 400 });

  try {
    const provider = getProvider(userId, "spotify");
    const tracks = await provider.getPlaylistTracks(id);
    return Response.json({ tracks });
  } catch {
    return Response.json({ tracks: [] });
  }
}
