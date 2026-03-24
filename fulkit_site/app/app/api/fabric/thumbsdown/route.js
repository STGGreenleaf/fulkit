import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { authenticateUser } from "../../../../lib/fabric-server";

function trackKey(artist, title) {
  return `${(artist || "").trim().toLowerCase()}|${(title || "").trim().toLowerCase()}`;
}

// POST — thumbs down a track (never suggest again)
export async function POST(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { trackId, artist, title } = await request.json();
    if (!artist && !title) return Response.json({ error: "artist or title required" }, { status: 400 });

    const key = trackKey(artist, title);
    const db = getSupabaseAdmin();

    const { error } = await db.from("user_thumbsdown").upsert({
      user_id: userId,
      track_key: key,
      track_id: trackId || null,
      artist: (artist || "").trim(),
      title: (title || "").trim(),
    }, { onConflict: "user_id,track_key", ignoreDuplicates: true });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, track_key: key });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// GET — list all thumbed-down track keys for this user
export async function GET(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("user_thumbsdown")
      .select("track_key, artist, title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data || []);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — un-thumbsdown a track
export async function DELETE(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    if (!key) return Response.json({ error: "key required" }, { status: 400 });

    const db = getSupabaseAdmin();
    await db.from("user_thumbsdown").delete().eq("user_id", userId).eq("track_key", key);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
