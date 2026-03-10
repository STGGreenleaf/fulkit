import { authenticateUser, fabricFetch } from "../../../../../../lib/fabric-server";

export async function GET(request, { params }) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return Response.json({ error: "Playlist ID required" }, { status: 400 });

  try {
    const res = await fabricFetch(userId, `/playlists/${id}/items?limit=50`);

    if (res.error) return Response.json({ error: res.error }, { status: res.status });

    const data = await res.json();
    const tracks = (data.items || [])
      .filter((entry) => entry.item && entry.item.id)
      .map((entry) => {
        const t = entry.item;
        return {
          id: t.id,
          title: t.name,
          artist: t.artists?.map((a) => a.name).join(", ") || "Unknown",
          album: t.album?.name || "",
          duration: Math.round((t.duration_ms || 0) / 1000),
          art: t.album?.images?.[0]?.url || null,
          uri: t.uri,
        };
      });

    return Response.json({ tracks });
  } catch {
    return Response.json({ tracks: [] });
  }
}
