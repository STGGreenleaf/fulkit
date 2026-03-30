import { getSupabaseAdmin } from "../../../../../lib/supabase-server";
import { decryptMeta } from "../../../../../lib/token-crypt";

// GET — Strava subscription validation (echoes hub.challenge)
export async function GET(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return Response.json({ "hub.challenge": challenge });
  }

  return Response.json({ error: "Forbidden" }, { status: 403 });
}

// POST — Strava event notifications (activity CRUD, athlete deauthorize)
export async function POST(request) {
  try {
    const event = await request.json();
    const { object_type, aspect_type, owner_id } = event;

    // Athlete deauthorized — find and delete their integration
    if (object_type === "athlete" && aspect_type === "update" && event.updates?.authorized === "false") {
      const db = getSupabaseAdmin();
      const { data: integrations } = await db
        .from("integrations")
        .select("user_id, metadata")
        .eq("provider", "strava");

      for (const row of (integrations || [])) {
        try {
          const meta = decryptMeta(row.metadata);
          if (meta?.athlete_id === owner_id) {
            await db.from("integrations").delete().eq("user_id", row.user_id).eq("provider", "strava");
            console.log(`[strava/webhook] Deauthorized athlete ${owner_id}, deleted integration for user ${row.user_id}`);
            break;
          }
        } catch {}
      }
    }

    // Activity events — log for now
    if (object_type === "activity") {
      console.log(`[strava/webhook] Activity ${aspect_type}: ${event.object_id} for athlete ${owner_id}`);
    }
  } catch (err) {
    console.error("[strava/webhook] Error:", err.message);
  }

  // Always return 200 within 2 seconds (Strava requirement)
  return Response.json({ ok: true });
}
