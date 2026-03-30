import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { authenticateUser } from "../../../../lib/fabric-server";

// POST /api/fabric/timeline — upload client-side thumbprint
export async function POST(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { trackId, provider: trackProvider, timeline, resolution_ms, snapshot_count, duration_s } = await request.json();
    if (!trackId || !timeline || !timeline.length) {
      return Response.json({ error: "trackId and timeline required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Find or create the fabric_tracks row
    let { data: track } = await db
      .from("fabric_tracks")
      .select("id")
      .eq("source_id", trackId)
      .maybeSingle();

    if (!track) {
      // Create a minimal track entry — client-side thumbprint for an unknown track
      const { data: created } = await db
        .from("fabric_tracks")
        .insert({ source_id: trackId, provider: trackProvider || "youtube", status: "complete", analyzed_at: new Date().toISOString(), analysis_version: 2 })
        .select("id")
        .single();
      track = created;
    }

    if (!track) return Response.json({ error: "Could not create track" }, { status: 500 });

    // Upsert timeline
    const { error } = await db
      .from("fabric_timelines")
      .upsert({
        track_id: track.id,
        resolution_ms: resolution_ms || 500,
        timeline,
        size_bytes: JSON.stringify(timeline).length,
      }, { onConflict: "track_id,resolution_ms" });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Mark track as complete if not already
    await db.from("fabric_tracks").update({ status: "complete", analyzed_at: new Date().toISOString(), analysis_version: 2 }).eq("id", track.id);

    return Response.json({ ok: true, trackId, snapshots: snapshot_count });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/fabric/timeline — fetch thumbprint for a track
export async function GET(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const spotifyId = searchParams.get("id");
    const title = searchParams.get("title");
    const artist = searchParams.get("artist");
    if (!spotifyId && !title) return Response.json({ error: "id or title required" }, { status: 400 });

    const db = getSupabaseAdmin();

    // Look up track by source_id first, then fall back to title+artist cross-reference
    let { data: track, error: trackErr } = spotifyId
      ? await db.from("fabric_tracks")
          .select("id, status, bpm, key, energy, valence, danceability, loudness, acousticness")
          .eq("source_id", spotifyId).maybeSingle()
      : { data: null, error: null };

    // Cross-reference: if not found by ID, try title+artist (any provider)
    if (!track && title) {
      const { data: xref } = await db.from("fabric_tracks")
        .select("id, status, bpm, key, energy, valence, danceability, loudness, acousticness")
        .ilike("title", title)
        .eq("status", "complete")
        .limit(1)
        .maybeSingle();
      if (xref) track = xref;
    }

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
