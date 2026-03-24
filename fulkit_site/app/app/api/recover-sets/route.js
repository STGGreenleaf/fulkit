import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET: return all recoverable sets merged from Supabase backups
export async function GET() {
  // ── Electro Static: merge best two backups (12 unique tracks) ──
  const esIds = [
    "7dfc3b5f-93df-4e43-8a61-768a973ce66e", // 10 tracks, Mar 24 04:10
    "2e42acfb-6d51-4514-915e-1814e24268e9", // 8 tracks, Mar 11 21:55
  ];
  const seen = new Set();
  const esTracks = [];
  for (const crateId of esIds) {
    const { data } = await supabase
      .from("crate_tracks")
      .select("source_id, title, artist, duration_ms, position")
      .eq("crate_id", crateId)
      .order("position");
    for (const t of data || []) {
      if (!seen.has(t.source_id)) {
        seen.add(t.source_id);
        esTracks.push({
          id: t.source_id,
          title: t.title,
          artist: t.artist,
          duration: t.duration_ms ? Math.round(t.duration_ms / 1000) : 0,
        });
      }
    }
  }

  // ── Work Tech: seed from Spotify crate tracks that fit the vibe ──
  // Pull from the full Electro Static Spotify playlist (44 tracks) for variety
  const spotifyCrateId = "f50eb060-b1c9-484f-ad77-111dff9fed17";
  const { data: spotifyTracks } = await supabase
    .from("crate_tracks")
    .select("source_id, title, artist, duration_ms, position")
    .eq("crate_id", spotifyCrateId)
    .order("position");

  // Pick tracks not already in Electro Static for Work Tech
  const workTechTracks = [];
  for (const t of spotifyTracks || []) {
    if (!seen.has(t.source_id) && workTechTracks.length < 8) {
      workTechTracks.push({
        id: t.source_id,
        title: t.title,
        artist: t.artist,
        duration: t.duration_ms ? Math.round(t.duration_ms / 1000) : 0,
      });
    }
  }

  return Response.json({
    sets: [
      { name: "Electro Static", tracks: esTracks },
      { name: "Work Tech", tracks: workTechTracks },
    ],
  });
}
