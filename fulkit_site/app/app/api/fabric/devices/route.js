import { authenticateUser, getProvider } from "../../../../lib/fabric-server";

// GET — list available devices
export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const provider = getProvider(userId, "spotify");
  const devices = await provider.getDevices();
  return Response.json({ devices });
}

// POST — transfer playback to a device
export async function POST(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { device_id, play } = await request.json();
  if (!device_id) return Response.json({ error: "device_id required" }, { status: 400 });

  const provider = getProvider(userId, "spotify");
  const result = await provider.transferPlayback(device_id, play !== false);

  if (result.error) return Response.json({ error: result.error }, { status: result.status || 500 });
  return Response.json({ ok: true });
}
