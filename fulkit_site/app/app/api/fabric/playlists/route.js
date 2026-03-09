import { authenticateUser, fabricFetch } from "../../../../lib/fabric-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fabricFetch(userId, "/me/playlists?limit=20");

  if (res.error) {
    return Response.json({ error: res.error }, { status: res.status });
  }

  if (!res.ok) {
    return Response.json({ playlists: [] });
  }

  const data = await res.json();

  const playlists = (data.items || []).map((pl) => ({
    id: pl.id,
    name: pl.name,
    tracks: pl.tracks?.total || 0,
    description: pl.description || "",
    image: pl.images?.[0]?.url || null,
  }));

  return Response.json({ playlists });
}
