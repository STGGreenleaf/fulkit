import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { authenticateUser } from "../../../../lib/fabric-server";

export async function GET(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const spotifyId = searchParams.get("id");
    if (!spotifyId) return Response.json({ error: "id required" }, { status: 400 });

    const db = getSupabaseAdmin();

    // Look up track by source_id
    const { data: track, error: trackErr } = await db
      .from("fabric_tracks")
      .select("id, status, bpm, key, energy, valence, danceability, loudness, acousticness")
      .eq("source_id", spotifyId)
      .maybeSingle();

    if (trackErr) {
      console.error("[fabric/timeline] Track lookup error:", trackErr);
      return Response.json({ status: "error", error: trackErr.message, timeline: null });
    }

    if (!track) {
      return Response.json({ status: "not_found", timeline: null });
    }

    if (track.status !== "complete") {
      return Response.json({ status: track.status, timeline: null });
    }

    // Fetch timeline
    const { data: tl, error: tlErr } = await db
      .from("fabric_timelines")
      .select("timeline, resolution_ms")
      .eq("track_id", track.id)
      .maybeSingle();

    if (tlErr) {
      console.error("[fabric/timeline] Timeline lookup error:", tlErr);
      return Response.json({ status: "error", error: tlErr.message, timeline: null });
    }

    if (!tl) {
      return Response.json({ status: "complete", timeline: null });
    }

    return Response.json({
      status: "complete",
      resolution_ms: tl.resolution_ms,
      timeline: tl.timeline,
    });
  } catch (e) {
    console.error("[fabric/timeline] Unexpected error:", e);
    return Response.json({ status: "error", error: e.message, timeline: null }, { status: 500 });
  }
}
