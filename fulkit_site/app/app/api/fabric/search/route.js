import { authenticateUser, getProvider } from "../../../../lib/fabric-server";

// GET /api/fabric/search?q=Tool+Lateralus&type=album
// GET /api/fabric/search?album={albumId}
export async function GET(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const provider = getProvider(userId, "spotify");

    // Album tracks mode
    const albumId = searchParams.get("album");
    if (albumId) {
      const result = await provider.getAlbum(albumId);
      if (result.error) return Response.json({ error: result.error }, { status: result.status || 500 });
      return Response.json(result);
    }

    // Search mode
    const q = searchParams.get("q");
    const type = searchParams.get("type") || "album";
    if (!q) return Response.json({ error: "q required" }, { status: 400 });

    // Top tracks by artist ID
    if (type === "top-tracks") {
      const artistId = searchParams.get("artist_id");
      if (!artistId) return Response.json({ error: "artist_id required for top-tracks" }, { status: 400 });
      const result = await provider.getArtistTopTracks(artistId);
      if (result.error) return Response.json({ error: result.error }, { status: result.status || 500 });
      return Response.json(result);
    }

    const result = await provider.search(q, type);
    if (result.error) return Response.json({ error: result.error }, { status: result.status || 400 });
    return Response.json(result);
  } catch (e) {
    console.error("[fabric/search] Error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
