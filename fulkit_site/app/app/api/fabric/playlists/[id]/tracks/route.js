import { getSupabaseAdmin } from "../../../../../../lib/supabase-server";
import { authenticateUser } from "../../../../../../lib/fabric-server";

// GET /api/fabric/playlists/[id]/tracks — read from Supabase
export async function GET(request, { params }) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return Response.json({ error: "Playlist ID required" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Find the playlist — try source_id first, then fulkit id
  let { data: playlist } = await admin
    .from("user_playlists")
    .select("id")
    .eq("user_id", userId)
    .eq("source_id", id)
    .maybeSingle();

  if (!playlist) {
    ({ data: playlist } = await admin
      .from("user_playlists")
      .select("id")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle());
  }

  if (!playlist) return Response.json({ tracks: [] });

  // Fetch tracks
  const { data: tracks } = await admin
    .from("user_playlist_tracks")
    .select("source_id, title, artist, album, duration_ms, art, isrc, position, provider")
    .eq("playlist_id", playlist.id)
    .order("position", { ascending: true });

  return Response.json({
    tracks: (tracks || []).map(t => ({
      id: t.source_id,
      source_id: t.source_id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      duration_ms: t.duration_ms,
      art: t.art,
      isrc: t.isrc,
      provider: t.provider,
    })),
  });
}
