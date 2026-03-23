import { getSupabaseAdmin } from "../../../../../lib/supabase-server";
import { authenticateUser } from "../../../../../lib/fabric-server";

// POST — Trophy a set (save permanently to Supabase)
export async function POST(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { setId, name, tracks } = await request.json();
    if (!setId || !name) return Response.json({ error: "setId and name required" }, { status: 400 });

    const db = getSupabaseAdmin();

    // Check if already exists
    const { data: existing } = await db
      .from("user_playlists")
      .select("id")
      .eq("user_id", userId)
      .eq("source_id", setId)
      .eq("source_provider", "set")
      .maybeSingle();

    let playlistId;
    if (existing) {
      // Update
      await db.from("user_playlists").update({
        name,
        track_count: (tracks || []).length,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
      playlistId = existing.id;
    } else {
      // Insert
      const { data: created, error: plError } = await db
        .from("user_playlists")
        .insert({
          user_id: userId,
          source_id: setId,
          source_provider: "set",
          name,
          track_count: (tracks || []).length,
        })
        .select("id")
        .single();
      if (plError) return Response.json({ error: plError.message }, { status: 500 });
      playlistId = created.id;
    }

    // Replace tracks
    if (tracks?.length) {
      await db.from("user_playlist_tracks").delete().eq("playlist_id", playlistId);
      const rows = tracks.map((t, i) => ({
        playlist_id: playlistId,
        source_id: t.id || t.source_id || `track-${i}`,
        title: t.title,
        artist: t.artist || "",
        album: t.album || null,
        duration_ms: (t.duration || 0) * 1000,
        position: i,
        provider: t.provider || "youtube",
      }));
      const { error: trError } = await db.from("user_playlist_tracks").insert(rows);
      if (trError) return Response.json({ error: trError.message }, { status: 500 });
    }

    return Response.json({ ok: true, playlistId });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — Un-trophy a set
export async function DELETE(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const setId = url.searchParams.get("setId");
    if (!setId) return Response.json({ error: "setId required" }, { status: 400 });

    const db = getSupabaseAdmin();

    const { data: playlist } = await db
      .from("user_playlists")
      .select("id")
      .eq("user_id", userId)
      .eq("source_id", setId)
      .eq("source_provider", "set")
      .maybeSingle();

    if (playlist) {
      await db.from("user_playlist_tracks").delete().eq("playlist_id", playlist.id);
      await db.from("user_playlists").delete().eq("id", playlist.id);
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
