import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { authenticateUser, getProvider, getConnectedProviders } from "../../../../lib/fabric-server";

// GET /api/fabric/playlists — read from Supabase (auto-imports from source if empty)
export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  // Read playlists from Supabase
  const { data: stored } = await admin
    .from("user_playlists")
    .select("id, name, description, image, source_provider, source_id, track_count, imported_at")
    .eq("user_id", userId)
    .order("imported_at", { ascending: true });

  if (stored && stored.length > 0) {
    return Response.json({
      playlists: stored.map(p => ({
        id: p.source_id || p.id,
        _fulkitId: p.id,
        name: p.name,
        description: p.description,
        image: p.image,
        trackCount: p.track_count,
        source: p.source_provider,
      })),
    });
  }

  // No stored playlists — try to import from connected sources
  const connected = await getConnectedProviders(userId);
  let imported = [];

  for (const [providerName, provider] of Object.entries(connected)) {
    try {
      const playlists = await provider.getPlaylists(50);
      if (!playlists || playlists.length === 0) continue;

      for (const pl of playlists) {
        // Insert playlist
        const { data: created } = await admin
          .from("user_playlists")
          .insert({
            user_id: userId,
            name: pl.name,
            description: pl.description || null,
            image: pl.image || null,
            source_provider: providerName,
            source_id: pl.id,
            track_count: pl.trackCount || 0,
          })
          .select("id")
          .single();

        if (!created) continue;

        // Fetch and store tracks
        try {
          const tracks = await provider.getPlaylistTracks(pl.id, 100);
          if (tracks && tracks.length > 0) {
            await admin.from("user_playlist_tracks").insert(
              tracks.map((t, i) => ({
                playlist_id: created.id,
                source_id: t.source_id || t.id,
                title: t.title,
                artist: t.artist,
                album: t.album || null,
                duration_ms: t.duration_ms || 0,
                art: t.art || null,
                isrc: t.isrc || null,
                position: i,
                provider: providerName,
              }))
            );

            // Update track count
            await admin.from("user_playlists")
              .update({ track_count: tracks.length })
              .eq("id", created.id);
          }
        } catch {}

        imported.push({
          id: pl.id,
          _fulkitId: created.id,
          name: pl.name,
          description: pl.description,
          image: pl.image,
          trackCount: pl.trackCount || 0,
          source: providerName,
        });
      }
    } catch {}
  }

  return Response.json({ playlists: imported });
}
