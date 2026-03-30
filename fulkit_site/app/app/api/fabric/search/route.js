import { authenticateUser, getProvider, getConnectedProviders } from "../../../../lib/fabric-server";

// GET /api/fabric/search?q=midnight+city&type=track
// Searches across all connected providers + YouTube (always available)
// Returns all entity types: artists, albums, playlists, tracks
export async function GET(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const type = url.searchParams.get("type") || "track";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "5", 10), 20);
    const artistId = url.searchParams.get("artist_id");
    const albumId = url.searchParams.get("album");

    // ── Top tracks by artist ID (Spotify-specific, falls back to track search) ──
    if (type === "top-tracks" && artistId) {
      const connected = await getConnectedProviders(userId);
      const spotify = connected.spotify;
      if (spotify && typeof spotify.getArtistTopTracks === "function") {
        try {
          const data = await spotify.getArtistTopTracks(artistId);
          if (data.tracks?.length > 0) return Response.json(data);
        } catch {}
      }
      // Fallback: search for tracks by query (works with any provider)
      if (query) {
        const fallbackUrl = new URL(request.url);
        fallbackUrl.searchParams.set("type", "track");
        fallbackUrl.searchParams.delete("artist_id");
        const fallbackReq = new Request(fallbackUrl, { headers: request.headers });
        return GET(fallbackReq);
      }
      return Response.json({ tracks: [] });
    }

    // ── Album tracks (Spotify-specific) ──
    if (albumId) {
      const connected = await getConnectedProviders(userId);
      const spotify = connected.spotify;
      if (spotify && typeof spotify.getAlbum === "function") {
        try {
          const data = await spotify.getAlbum(albumId);
          return Response.json(data);
        } catch {}
      }
      return Response.json({ tracks: [] });
    }

    if (!query) return Response.json({ error: "q parameter required" }, { status: 400 });

    const connected = await getConnectedProviders(userId);
    const youtube = getProvider(userId, "youtube");

    const searches = [];

    if (youtube) {
      searches.push(
        youtube.search(query, type, limit)
          .then(r => ({ provider: "youtube", ...r }))
          .catch(() => ({ provider: "youtube" }))
      );
    }

    for (const [name, provider] of Object.entries(connected)) {
      if (name === "youtube") continue;
      if (typeof provider.search !== "function") continue;
      searches.push(
        provider.search(query, type, limit)
          .then(r => ({ provider: name, ...r }))
          .catch(() => ({ provider: name }))
      );
    }

    const results = await Promise.all(searches);

    // Merge all entity types from all providers
    const allArtists = [], allAlbums = [], allPlaylists = [];
    const trackSeen = new Set();
    const allTracks = [];

    for (const result of results) {
      if (result.artists) {
        for (const a of result.artists) allArtists.push({ ...a, provider: a.provider || result.provider });
      }
      if (result.albums) {
        for (const a of result.albums) allAlbums.push({ ...a, provider: a.provider || result.provider });
      }
      if (result.playlists) {
        for (const p of result.playlists) allPlaylists.push({ ...p, provider: p.provider || result.provider });
      }
      for (const track of (result.tracks || [])) {
        const key = `${(track.title || "").toLowerCase()}|${(track.artist || "").toLowerCase()}`;
        if (trackSeen.has(key)) continue;
        trackSeen.add(key);
        allTracks.push({ ...track, provider: track.provider || result.provider });
      }
    }

    return Response.json({
      query, type,
      sources: results.map(r => r.provider),
      artists: allArtists.slice(0, limit),
      albums: allAlbums.slice(0, limit),
      playlists: allPlaylists.slice(0, limit),
      tracks: allTracks.slice(0, limit),
      results: allTracks.slice(0, limit),
    });
  } catch (err) {
    console.error("[fabric/search] Error:", err.message);
    return Response.json({ query: "", type: "track", results: [], tracks: [], artists: [], albums: [], playlists: [], sources: [], error: err.message });
  }
}
