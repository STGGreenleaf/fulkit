import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { authenticateUser } from "../../../../lib/fabric-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const spotifyId = searchParams.get("id");
  if (!spotifyId) return Response.json({ error: "id required" }, { status: 400 });

  const db = getSupabaseAdmin();

  // Look up track by spotify_id
  const { data: track } = await db
    .from("fabric_tracks")
    .select("id, status, bpm, key, energy, valence, danceability, loudness, acousticness")
    .eq("spotify_id", spotifyId)
    .single();

  if (!track) {
    return Response.json({ status: "not_found", timeline: null });
  }

  if (track.status !== "complete") {
    return Response.json({ status: track.status, timeline: null });
  }

  // Fetch timeline
  const { data: tl } = await db
    .from("fabric_timelines")
    .select("timeline, resolution_ms")
    .eq("track_id", track.id)
    .single();

  if (!tl) {
    return Response.json({ status: "complete", timeline: null });
  }

  // Increment play count
  db.rpc("increment_play_count", { track_spotify_id: spotifyId }).catch(() => {});

  return Response.json({
    status: "complete",
    resolution_ms: tl.resolution_ms,
    timeline: tl.timeline,
    features: {
      bpm: track.bpm,
      key: track.key,
      energy: track.energy,
      valence: track.valence,
      danceability: track.danceability,
      loudness: track.loudness,
      acousticness: track.acousticness,
    },
  });
}
