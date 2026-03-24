import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST: queue a track for server-side audio analysis
// Body: { trackId, artist, title, duration }
// Deduplicates via unique index on track_id — safe to call repeatedly
export async function POST(request) {
  try {
    const { trackId, artist, title, duration } = await request.json();
    if (!trackId || !artist || !title) {
      return Response.json({ error: "missing fields" }, { status: 400 });
    }

    const youtubeQuery = `${artist} - ${title}`;

    const { error } = await supabase.from("fabric_jobs").upsert(
      {
        track_id: trackId,
        youtube_query: youtubeQuery,
        duration_hint: duration || null,
        status: "pending",
      },
      { onConflict: "track_id", ignoreDuplicates: true }
    );

    if (error) {
      // Unique constraint = already queued, that's fine
      if (error.code === "23505") return Response.json({ queued: false, reason: "already_queued" });
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ queued: true });
  } catch {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }
}
