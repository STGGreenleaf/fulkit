import { getSupabaseAdmin } from "../../../../../lib/supabase-server";
import { authenticateUser, getProvider } from "../../../../../lib/fabric-server";

// POST — Create a featured crate from a Spotify playlist
export async function POST(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Check owner
    const db = getSupabaseAdmin();
    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profile?.role !== "owner") {
      return Response.json({ error: "Owner only" }, { status: 403 });
    }

    const body = await request.json();
    const { playlistId, name, description, provider: providerName } = body;
    const sourceName = providerName || "spotify";

    if (!playlistId) {
      return Response.json({ error: "playlistId required" }, { status: 400 });
    }

    // Fetch playlist via provider
    const provider = getProvider(userId, sourceName);
    const playlist = await provider.getPlaylistRaw(playlistId);
    if (!playlist) {
      return Response.json({ error: "Failed to fetch playlist" }, { status: 400 });
    }

    // Create crate
    const { data: crate, error: crateErr } = await db
      .from("crates")
      .insert({
        user_id: userId,
        name: name || playlist.name || "Featured",
        description: description || playlist.description || null,
        source: sourceName,
        source_playlist_id: playlistId,
        status: "active",
        visibility: "featured",
      })
      .select("id")
      .single();

    if (crateErr) {
      console.error("[featured/manage] Crate insert error:", crateErr);
      return Response.json({ error: crateErr.message }, { status: 500 });
    }

    // Insert tracks
    const items = playlist.items?.items || [];
    const crateTracks = items
      .map((entry, i) => {
        const t = entry.item;
        if (!t || !t.id) return null;
        return {
          crate_id: crate.id,
          source_id: t.id,
          position: i,
          title: t.name || "Unknown",
          artist: t.artists?.map(a => a.name).join(", ") || "Unknown",
          duration_ms: t.duration_ms || 0,
          isrc: t.external_ids?.isrc || null,
          added_via: "import",
        };
      })
      .filter(Boolean);

    if (crateTracks.length > 0) {
      const { error: trackErr } = await db.from("crate_tracks").insert(crateTracks);
      if (trackErr) {
        console.error("[featured/manage] Tracks insert error:", trackErr);
      }

      // Also queue tracks for Fabric analysis
      const fabricInserts = crateTracks.map(t => ({
        source_id: t.source_id,
        title: t.title,
        artist: t.artist,
        duration_ms: t.duration_ms,
        isrc: t.isrc,
        composite_key: `${t.artist.toLowerCase().trim()}|${t.title.toLowerCase().trim()}|${Math.round(t.duration_ms / 5000) * 5}`,
        status: "pending",
      }));

      // Upsert — don't overwrite existing tracks
      for (const row of fabricInserts) {
        await db
          .from("fabric_tracks")
          .upsert({ ...row, provider: sourceName }, { onConflict: "source_id,provider", ignoreDuplicates: true });
      }
    }

    return Response.json({
      id: crate.id,
      name: name || playlist.name,
      tracks: crateTracks.length,
    });

  } catch (e) {
    console.error("[featured/manage] Error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — Remove a featured crate (set visibility back to private)
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

    const { error } = await db
      .from("crates")
      .update({ visibility: "private", updated_at: new Date().toISOString() })
      .eq("id", crateId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("[featured/manage] Delete error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
