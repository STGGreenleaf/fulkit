import { authenticateUser, fabricFetch } from "../../../../lib/fabric-server";

// GET /api/fabric/search?q=Tool+Lateralus&type=album
// GET /api/fabric/search?album={spotifyAlbumId}
export async function GET(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);

    // Album tracks mode
    const albumId = searchParams.get("album");
    if (albumId) {
      // Get album metadata + tracks
      const [albumRes, tracksRes] = await Promise.all([
        fabricFetch(userId, `/albums/${albumId}`),
        fabricFetch(userId, `/albums/${albumId}/tracks?limit=50`),
      ]);

      if (albumRes.error || tracksRes.error) {
        return Response.json({ error: albumRes.error || tracksRes.error }, { status: albumRes.status || 500 });
      }

      const album = await albumRes.json();
      const tracksData = await tracksRes.json();

      return Response.json({
        album: {
          id: album.id,
          name: album.name,
          artist: album.artists?.[0]?.name || "Unknown",
          image: album.images?.[1]?.url || album.images?.[0]?.url || null,
          year: album.release_date?.slice(0, 4) || null,
          trackCount: album.total_tracks,
        },
        tracks: (tracksData.items || []).map((t, i) => ({
          spotify_id: t.id,
          title: t.name,
          artist: t.artists?.[0]?.name || album.artists?.[0]?.name || "Unknown",
          duration_ms: t.duration_ms,
          track_number: t.track_number || i + 1,
        })),
      });
    }

    // Search mode
    const q = searchParams.get("q");
    const type = searchParams.get("type") || "album";
    if (!q) return Response.json({ error: "q required" }, { status: 400 });

    // Top tracks by artist ID (not a search — direct endpoint)
    if (type === "top-tracks") {
      const artistId = searchParams.get("artist_id");
      if (!artistId) return Response.json({ error: "artist_id required for top-tracks" }, { status: 400 });
      const ttRes = await fabricFetch(userId, `/artists/${artistId}/top-tracks?market=US`);
      if (ttRes.error) return Response.json({ error: ttRes.error }, { status: ttRes.status || 500 });
      const ttData = await ttRes.json();
      return Response.json({
        tracks: (ttData.tracks || []).map((t, i) => ({
          spotify_id: t.id,
          title: t.name,
          artist: t.artists?.[0]?.name || "Unknown",
          album: t.album?.name || null,
          duration_ms: t.duration_ms,
          uri: t.uri,
          track_number: i + 1,
        })),
      });
    }

    const limit = type === "album" ? 20 : 5;
    const res = await fabricFetch(userId, `/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`);
    if (res.error) return Response.json({ error: res.error }, { status: res.status || 500 });

    const data = await res.json();

    if (type === "album") {
      return Response.json({
        albums: (data.albums?.items || []).map(a => ({
          id: a.id,
          name: a.name,
          artist: a.artists?.[0]?.name || "Unknown",
          image: a.images?.[1]?.url || a.images?.[0]?.url || null,
          year: a.release_date?.slice(0, 4) || null,
          trackCount: a.total_tracks,
        })),
      });
    }

    if (type === "artist") {
      return Response.json({
        artists: (data.artists?.items || []).map(a => ({
          id: a.id,
          name: a.name,
          image: a.images?.[1]?.url || a.images?.[0]?.url || null,
          genres: a.genres?.slice(0, 3) || [],
        })),
      });
    }

    if (type === "track") {
      return Response.json({
        tracks: (data.tracks?.items || []).map(t => ({
          spotify_id: t.id,
          title: t.name,
          artist: t.artists?.[0]?.name || "Unknown",
          album: t.album?.name || null,
          duration_ms: t.duration_ms,
          uri: t.uri,
          image: t.album?.images?.[0]?.url || null,
        })),
      });
    }

    if (type === "playlist") {
      return Response.json({
        playlists: (data.playlists?.items || []).filter(Boolean).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || null,
          trackCount: p.tracks?.total || 0,
          owner: p.owner?.display_name || null,
          uri: p.uri,
        })),
      });
    }

    return Response.json({ error: "unsupported type" }, { status: 400 });
  } catch (e) {
    console.error("[fabric/search] Error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
