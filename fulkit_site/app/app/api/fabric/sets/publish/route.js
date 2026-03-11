import { getSupabaseAdmin } from "../../../../../lib/supabase-server";
import { authenticateUser } from "../../../../../lib/fabric-server";

// POST — Publish a set as a featured mix
export async function POST(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getSupabaseAdmin();
    const { data: profile } = await db
      .from("profiles")
      .select("role, display_name")
      .eq("id", userId)
      .single();

    if (profile?.role !== "owner") {
      console.error("[sets/publish] 403 — userId:", userId, "profile:", profile);
      return Response.json({ error: "Owner only", debug: { userId, role: profile?.role || null, hasProfile: !!profile } }, { status: 403 });
    }

    const { name, tracks } = await request.json();
    if (!name || !tracks?.length) {
      return Response.json({ error: "name and tracks required" }, { status: 400 });
    }

    // Check all tracks are analyzed
    const spotifyIds = tracks.map(t => t.spotify_id);
    const { data: fabricRows } = await db
      .from("fabric_tracks")
      .select("spotify_id, status")
      .in("spotify_id", spotifyIds);

    const statusMap = {};
    for (const r of (fabricRows || [])) statusMap[r.spotify_id] = r.status;
    const pending = spotifyIds.filter(id => statusMap[id] !== "complete");

    if (pending.length > 0) {
      return Response.json({
        error: "not_ready",
        pending: pending.length,
        total: spotifyIds.length,
      }, { status: 422 });
    }

    // Create crate with source='set'
    const { data: crate, error: crateErr } = await db
      .from("crates")
      .insert({
        user_id: userId,
        name,
        description: `Featured mix by ${profile.display_name || "Collin"}`,
        source: "set",
        status: "active",
        visibility: "featured",
      })
      .select("id")
      .single();

    if (crateErr) {
      return Response.json({ error: crateErr.message }, { status: 500 });
    }

    // Insert tracks with positions
    const crateTracksData = tracks.map((t, i) => ({
      crate_id: crate.id,
      spotify_id: t.spotify_id,
      position: t.position ?? i,
      title: t.title || "Unknown",
      artist: t.artist || "Unknown",
      duration_ms: t.duration_ms || 0,
      added_via: "set",
    }));

    const { error: trackErr } = await db.from("crate_tracks").insert(crateTracksData);
    if (trackErr) {
      // Clean up crate if tracks fail
      await db.from("crates").delete().eq("id", crate.id);
      return Response.json({ error: trackErr.message }, { status: 500 });
    }

    return Response.json({ crateId: crate.id, name, tracks: crateTracksData.length });
  } catch (e) {
    console.error("[sets/publish] Error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — Unpublish a featured set
export async function DELETE(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getSupabaseAdmin();
    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profile?.role !== "owner") {
      return Response.json({ error: "Owner only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const crateId = searchParams.get("id");
    if (!crateId) return Response.json({ error: "id required" }, { status: 400 });

    // Soft-delete: archive the crate so users who already have it keep it
    const { error } = await db
      .from("crates")
      .update({ visibility: "archived" })
      .eq("id", crateId)
      .eq("source", "set");

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("[sets/publish] Delete error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
