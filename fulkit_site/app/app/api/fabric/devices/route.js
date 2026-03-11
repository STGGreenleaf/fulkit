import { authenticateUser, fabricFetch } from "../../../../lib/fabric-server";

// GET — list available Spotify Connect devices
// POST — transfer playback to a device
export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fabricFetch(userId, "/me/player/devices");
  if (res.error) return Response.json({ error: res.error }, { status: res.status || 500 });
  if (!res.ok) return Response.json({ devices: [] });

  const data = await res.json();
  return Response.json({
    devices: (data.devices || []).map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      is_active: d.is_active,
      volume: d.volume_percent,
    })),
  });
}

export async function POST(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { device_id, play } = await request.json();
  if (!device_id) return Response.json({ error: "device_id required" }, { status: 400 });

  const res = await fabricFetch(userId, "/me/player", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_ids: [device_id], play: play !== false }),
  });

  if (res.error) return Response.json({ error: res.error }, { status: res.status || 500 });
  if (res.status === 204 || res.status === 202 || res.ok) return Response.json({ ok: true });
  return Response.json({ error: "Transfer failed" }, { status: res.status });
}
