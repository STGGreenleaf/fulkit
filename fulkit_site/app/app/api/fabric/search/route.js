import { authenticateUser, getProvider, getConnectedProviders } from "../../../../lib/fabric-server";

// GET /api/fabric/search?q=midnight+city&type=track
// Searches across all connected providers + YouTube (always available)
export async function GET(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const type = url.searchParams.get("type") || "track";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "5", 10), 20);

    if (!query) return Response.json({ error: "q parameter required" }, { status: 400 });

    const connected = await getConnectedProviders(userId);
    const youtube = getProvider(userId, "youtube");

    const searches = [];

    if (youtube) {
      searches.push(
        youtube.search(query, type, limit)
          .then(r => ({ provider: "youtube", ...r }))
          .catch(() => ({ provider: "youtube", tracks: [] }))
      );
    }

    for (const [name, provider] of Object.entries(connected)) {
      if (name === "youtube") continue;
      searches.push(
        provider.search(query, type, limit)
          .then(r => ({ provider: name, ...r }))
          .catch(() => ({ provider: name, tracks: [] }))
      );
    }

    const results = await Promise.all(searches);

    const seen = new Set();
    const merged = [];
    for (const result of results) {
      const tracks = result.tracks || [];
      for (const track of tracks) {
        const key = `${(track.title || "").toLowerCase()}|${(track.artist || "").toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push({ ...track, provider: track.provider || result.provider });
      }
    }

    return Response.json({ query, type, results: merged.slice(0, limit), sources: results.map(r => r.provider) });
  } catch (err) {
    // Never 500 on bad queries — return empty results so precacher/playTrack degrade gracefully
    console.error("[fabric/search] Error:", err.message);
    return Response.json({ query: "", type: "track", results: [], sources: [], error: err.message });
  }
}
