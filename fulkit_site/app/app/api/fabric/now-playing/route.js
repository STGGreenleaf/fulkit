import { authenticateUser, fabricFetch } from "../../../../lib/fabric-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fabricFetch(userId, "/me/player");

  // No active device or nothing playing
  if (res.status === 204 || res.status === 202) {
    return Response.json({ isPlaying: false, track: null });
  }

  if (res.error) {
    return Response.json({ error: res.error }, { status: res.status });
  }

  if (!res.ok) {
    return Response.json({ isPlaying: false, track: null });
  }

  const data = await res.json();

  if (!data.item) {
    return Response.json({ isPlaying: data.is_playing || false, track: null });
  }

  const track = {
    id: data.item.id,
    title: data.item.name,
    artist: data.item.artists?.map((a) => a.name).join(", ") || "",
    album: data.item.album?.name || "",
    duration: Math.round((data.item.duration_ms || 0) / 1000),
    art: data.item.album?.images?.[0]?.url || null,
    progress: (data.progress_ms || 0) / (data.item.duration_ms || 1),
    progressMs: data.progress_ms || 0,
  };

  return Response.json({ isPlaying: data.is_playing, track, volume: data.device?.volume_percent ?? null });
}
