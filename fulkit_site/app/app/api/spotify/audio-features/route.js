import { authenticateUser } from "../../../../lib/spotify-server";

const KEY_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const RECCOBEATS = "https://api.reccobeats.com/v1";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids");
  if (!ids) return Response.json({ error: "ids required" }, { status: 400 });

  const spotifyIds = ids.split(",").filter(Boolean);
  if (spotifyIds.length === 0) return Response.json({ features: {} });

  try {
    // Step 1: Resolve Spotify track IDs → ReccoBeats UUIDs
    const lookupRes = await fetch(`${RECCOBEATS}/track?ids=${spotifyIds.join(",")}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!lookupRes.ok) return Response.json({ features: {} });

    const lookupData = await lookupRes.json();
    const tracks = lookupData.content || [];
    if (tracks.length === 0) return Response.json({ features: {} });

    // Build spotify ID → reccobeats UUID map
    const idMap = {};
    for (const t of tracks) {
      // ReccoBeats href format: https://open.spotify.com/track/<spotify_id>
      const spotifyId = t.href?.split("/").pop() || spotifyIds.find((sid) => t.id);
      if (spotifyId && t.id) idMap[spotifyId] = t.id;
    }

    // Step 2: Fetch audio features for each resolved UUID
    const featurePromises = Object.entries(idMap).map(async ([spotifyId, uuid]) => {
      try {
        const res = await fetch(`${RECCOBEATS}/track/${uuid}/audio-features`, {
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return null;
        const f = await res.json();
        return {
          spotifyId,
          features: {
            bpm: Math.round(f.tempo || 0),
            key: KEY_NAMES[f.key] + (f.mode === 0 ? "m" : ""),
            energy: Math.round((f.energy || 0) * 100),
            danceability: Math.round((f.danceability || 0) * 100),
            valence: Math.round((f.valence || 0) * 100),
            loudness: f.loudness || -20,
            acousticness: Math.round((f.acousticness || 0) * 100),
          },
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.allSettled(featurePromises);
    const features = {};
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        features[r.value.spotifyId] = r.value.features;
      }
    }

    return Response.json({ features });
  } catch {
    return Response.json({ features: {} });
  }
}
