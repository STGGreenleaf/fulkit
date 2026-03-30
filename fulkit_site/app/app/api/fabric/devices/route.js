import { authenticateUser, getProvider } from "../../../../lib/fabric-server";

// GET — list available devices
export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const providerName = url.searchParams.get("provider") || "spotify";
  const provider = getProvider(userId, providerName);
  if (!provider) return Response.json({ error: "Unknown provider" }, { status: 400 });
  const devices = await provider.getDevices();
  return Response.json({ devices });
}

// POST — transfer playback to a device
export async function POST(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { device_id, play, provider: providerName } = await request.json();
  if (!device_id) return Response.json({ error: "device_id required" }, { status: 400 });

  const provider = getProvider(userId, providerName || "spotify");
  if (!provider) return Response.json({ error: "Unknown provider" }, { status: 400 });
  const result = await provider.transferPlayback(device_id, play !== false);

  if (result.error) return Response.json({ error: result.error }, { status: result.status || 500 });
  return Response.json({ ok: true });
}
