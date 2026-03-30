import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// DELETE /api/integrations/purge?source=square
// Purges all data associated with a specific integration source.
// Called when user chooses "Disconnect + purge data".
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const source = url.searchParams.get("source");
    if (!source) return Response.json({ error: "source parameter required" }, { status: 400 });

    const userId = user.id;
    let purged = [];

    // Purge notes that came from this integration
    const { count: notesCount } = await admin.from("notes")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("source", source);
    if (notesCount > 0) purged.push(`${notesCount} notes`);

    // Purge conversations that reference this integration
    // (conversations don't have a source field, so skip — they're generic)

    // Purge playlists from this provider (Fabric sources)
    const { count: playlistCount } = await admin.from("user_playlists")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("source_provider", source);
    if (playlistCount > 0) purged.push(`${playlistCount} playlists`);

    // Purge preferences scoped to this integration
    const { count: prefCount } = await admin.from("preferences")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .like("key", `${source}_%`);
    if (prefCount > 0) purged.push(`${prefCount} preferences`);

    // Purge crate tracks from this provider
    const { count: crateCount } = await admin.from("crate_tracks")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("provider", source);
    if (crateCount > 0) purged.push(`${crateCount} crate tracks`);

    return Response.json({ purged, source });
  } catch (err) {
    console.error("[integrations/purge] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
