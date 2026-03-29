import { authenticateUser, getProvider } from "../../../../lib/fabric-server";

// GET /api/fabric/sonos — list households + groups (rooms)
export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const provider = getProvider(userId, "sonos");
  if (!provider) return Response.json({ error: "Sonos not available" }, { status: 400 });

  const connected = await provider.validateConnection();
  if (!connected) return Response.json({ error: "Sonos not connected" }, { status: 401 });

  const households = await provider.getHouseholds();
  if (!households.length) return Response.json({ households: [], groups: [], players: [] });

  // Get groups for the first household (most users have one)
  const { groups, players } = await provider.getGroups(households[0].id);

  return Response.json({
    householdId: households[0].id,
    groups,
    players,
  });
}

// POST /api/fabric/sonos — control playback on a group
export async function POST(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, action, value } = await request.json();
  if (!groupId || !action) return Response.json({ error: "groupId and action required" }, { status: 400 });

  const provider = getProvider(userId, "sonos");
  if (!provider) return Response.json({ error: "Sonos not available" }, { status: 400 });

  const result = await provider.control(groupId, action, value);
  if (!result) return Response.json({ error: "Control failed" }, { status: 500 });

  return Response.json({ ok: true });
}
