import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { authenticateUser } from "../../../../lib/fabric-server";

// POST /api/fabric/analyzed — batch check which tracks have fabric timelines
// Body: { tracks: [{ id, title, artist }] }
// Returns: { analyzed: { "btc-artist-title": true, "spotify-id": true, ... } }
export async function POST(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { tracks } = await request.json();
    if (!tracks?.length) return Response.json({ analyzed: {} });

    const db = getSupabaseAdmin();

    // Get all complete tracks with timelines in one query
    const { data: dbTracks } = await db
      .from("fabric_tracks")
      .select("id, source_id, title")
      .eq("status", "complete");

    const { data: timelines } = await db
      .from("fabric_timelines")
      .select("track_id");

    if (!dbTracks || !timelines) return Response.json({ analyzed: {} });

    const tlSet = new Set(timelines.map(t => t.track_id));
    // Only tracks with actual timelines count as "analyzed"
    const analyzed = dbTracks.filter(t => tlSet.has(t.id));

    // Build lookup maps
    const bySourceId = new Map(analyzed.map(t => [t.source_id, true]));
    const byTitle = new Map(analyzed.map(t => [t.title?.toLowerCase().trim(), true]));

    // Match input tracks
    const result = {};
    for (const t of tracks) {
      if (bySourceId.has(t.id)) {
        result[t.id] = true;
      } else if (t.title && byTitle.has(t.title.toLowerCase().trim())) {
        result[t.id] = true;
      }
    }

    return Response.json({ analyzed: result });
  } catch (e) {
    return Response.json({ analyzed: {} });
  }
}
