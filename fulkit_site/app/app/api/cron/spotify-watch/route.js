/**
 * GET /api/cron/spotify-watch — Monitor Spotify developer thread for changes.
 * Runs daily. Fetches the thread, hashes content, compares to stored hash.
 * If changed, creates a whisper on owner's dashboard.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { createHash } from "crypto";

const WATCH_URL = "https://community.spotify.com/t5/Spotify-for-Developers/February-2026-Spotify-for-Developers-update-thread/td-p/7330564";
const PREF_KEY = "spotify_watch_hash";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();

    // Get owner
    const { data: owner } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "owner")
      .single();
    if (!owner) return Response.json({ status: "no_owner" });

    // Fetch the page
    const res = await fetch(WATCH_URL, {
      headers: { "User-Agent": "Fulkit/1.0 (fulkit.app)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return Response.json({ status: "fetch_failed", code: res.status });

    const html = await res.text();

    // Extract the main content area (between message bodies)
    const bodyMatch = html.match(/class="lia-message-body-content"[^>]*>([\s\S]*?)<\/div>/g);
    const content = bodyMatch ? bodyMatch.join("").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "";

    if (!content) return Response.json({ status: "no_content" });

    // Hash it
    const hash = createHash("md5").update(content).digest("hex");

    // Compare to stored hash
    const { data: stored } = await admin
      .from("preferences")
      .select("value")
      .eq("user_id", owner.id)
      .eq("key", PREF_KEY)
      .maybeSingle();

    const oldHash = stored?.value;

    if (oldHash === hash) {
      return Response.json({ status: "no_change", hash });
    }

    // Content changed — store new hash
    await admin.from("preferences").upsert({
      user_id: owner.id,
      key: PREF_KEY,
      value: hash,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,key" });

    // Create a whisper on dashboard
    const snippet = content.slice(0, 200);
    await admin.from("preferences").upsert({
      user_id: owner.id,
      key: "spotify_watch_whisper",
      value: JSON.stringify({
        text: `Spotify developer thread updated. New content detected. Check: ${WATCH_URL}`,
        snippet,
        detected: new Date().toISOString(),
      }),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,key" });

    return Response.json({ status: "changed", hash, oldHash, snippet: snippet.slice(0, 100) });
  } catch (err) {
    console.error("[cron/spotify-watch] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
