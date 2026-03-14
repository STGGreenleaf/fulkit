import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function GET() {
  try {
    const db = getSupabaseAdmin();

    const { data: crates, error } = await db
      .from("crates")
      .select("id, name, description, source, source_playlist_id, created_at")
      .eq("visibility", "featured")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[fabric/featured] Crates query error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Fetch tracks for each crate
    const crateIds = (crates || []).map(c => c.id);
    let tracks = [];
    if (crateIds.length > 0) {
      const { data: trackData, error: trackErr } = await db
        .from("crate_tracks")
        .select("id, crate_id, source_id, position, title, artist, duration_ms, bpm, key, energy, valence")
        .in("crate_id", crateIds)
        .order("position", { ascending: true });

      if (trackErr) {
        console.error("[fabric/featured] Tracks query error:", trackErr);
      } else {
        tracks = trackData || [];
      }
    }

    // Check which tracks have Fabric analysis
    const spotifyIds = [...new Set(tracks.map(t => t.source_id))];
    let analyzedMap = {};
    if (spotifyIds.length > 0) {
      const { data: analyzed } = await db
        .from("fabric_tracks")
        .select("source_id, status")
        .in("source_id", spotifyIds);

      for (const t of (analyzed || [])) {
        analyzedMap[t.source_id] = t.status;
      }
    }

    // Assemble response
    const result = (crates || []).map(crate => ({
      ...crate,
      tracks: tracks
        .filter(t => t.crate_id === crate.id)
        .map(t => ({
          ...t,
          fabric_status: analyzedMap[t.source_id] || "unknown",
        })),
    }));

    return Response.json({ crates: result });
  } catch (e) {
    console.error("[fabric/featured] Unexpected error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
