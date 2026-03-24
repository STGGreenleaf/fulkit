import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET: return the best Electro Static backup as a JSON payload
// the client will merge it into localStorage
export async function GET() {
  // Best pre-corruption crowned backup: 10 tracks from March 24 04:10
  const crateId = "7dfc3b5f-93df-4e43-8a61-768a973ce66e";
  const { data: tracks } = await supabase
    .from("crate_tracks")
    .select("source_id, title, artist, duration_ms, position")
    .eq("crate_id", crateId)
    .order("position");

  const restored = (tracks || []).map((t) => ({
    id: t.source_id,
    title: t.title,
    artist: t.artist,
    duration: t.duration_ms ? Math.round(t.duration_ms / 1000) : 0,
  }));

  return Response.json({ name: "Electro Static", tracks: restored });
}
