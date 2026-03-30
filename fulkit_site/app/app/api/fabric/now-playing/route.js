import { authenticateUser, getProvider } from "../../../../lib/fabric-server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const providerName = url.searchParams.get("provider") || "spotify";
  const provider = getProvider(userId, providerName);
  if (!provider) return Response.json({ error: "Unknown provider" }, { status: 400 });
  const result = await provider.getNowPlaying();

  if (result.error) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  if (!result.track) {
    return Response.json({ isPlaying: result.isPlaying || false, track: null });
  }

  // Fire-and-forget: queue untracked songs + bump priority for played tracks
  const raw = result._raw;
  if (raw?.id) {
    const db = getSupabaseAdmin();
    db.from("fabric_tracks")
      .upsert({
        source_id: raw.id,
        provider: providerName,
        title: raw.name,
        artist: raw.artists?.map(a => a.name).join(", ") || "",
        duration_ms: raw.duration_ms || 0,
        isrc: raw.isrc,
        composite_key: `${(raw.artists?.map(a => a.name).join(", ") || "").toLowerCase().trim()}|${(raw.name || "").toLowerCase().trim()}|${Math.round((raw.duration_ms || 0) / 5000) * 5}`,
        status: "pending",
        priority: 1,
      }, { onConflict: "source_id,provider", ignoreDuplicates: true })
      .then(() => {})
      .catch(() => {});
    db.from("fabric_tracks")
      .update({ priority: 1 })
      .eq("source_id", raw.id)
      .eq("status", "pending")
      .then(() => {})
      .catch(() => {});
  }

  return Response.json({
    isPlaying: result.isPlaying,
    track: result.track,
    volume: result.volume,
    device: result.device,
  });
}
