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

  // Fetch per-player volumes in parallel
  const volumes = {};
  await Promise.all(players.map(async (p) => {
    try {
      const v = await provider.getPlayerVolume(p.id);
      volumes[p.id] = v.volume;
    } catch { volumes[p.id] = 0; }
  }));

  return Response.json({
    householdId: households[0].id,
    groups,
    players,
    volumes,
  });
}

// POST /api/fabric/sonos — control playback or manage groups
export async function POST(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  const provider = getProvider(userId, "sonos");
  if (!provider) return Response.json({ error: "Sonos not available" }, { status: 400 });

  // Group management: create a group from selected player IDs, then transfer Spotify
  if (action === "setGroup") {
    const { householdId, playerIds } = body;
    if (!householdId || !playerIds?.length) {
      return Response.json({ error: "householdId and playerIds required" }, { status: 400 });
    }
    const result = await provider.createGroup(householdId, playerIds);
    if (!result) return Response.json({ error: "Failed to create group" }, { status: 500 });
    // Re-fetch groups so client gets the updated state
    const { groups, players } = await provider.getGroups(householdId);
    const newGroupId = result.id;

    // Transfer Spotify playback to the new Sonos group's coordinator
    let transferred = false;
    const spotify = getProvider(userId, "spotify");
    if (spotify) {
      try {
        // Find the coordinator player name
        const newGroup = groups.find(g => g.id === newGroupId);
        const coordPlayer = players.find(p => p.id === newGroup?.coordinatorId);
        const coordName = coordPlayer?.name;
        if (coordName) {
          const devices = await spotify.getDevices();
          // Match Sonos room name to Spotify Connect device name
          const match = devices.find(d =>
            d.name === coordName ||
            d.name.toLowerCase().includes(coordName.toLowerCase()) ||
            coordName.toLowerCase().includes(d.name.toLowerCase())
          );
          if (match) {
            await spotify.transferPlayback(match.id, true);
            transferred = true;
          }
        }
      } catch (e) {
        console.warn("[sonos] Spotify transfer failed:", e.message);
      }
    }

    return Response.json({ ok: true, newGroupId, groups, players, transferred });
  }

  // Per-player volume
  if (action === "playerVolume") {
    const { playerId, volume } = body;
    if (!playerId || volume == null) return Response.json({ error: "playerId and volume required" }, { status: 400 });
    const result = await provider.setPlayerVolume(playerId, volume);
    if (!result) return Response.json({ error: "Volume set failed" }, { status: 500 });
    return Response.json({ ok: true });
  }

  // Playback control
  const { groupId, value } = body;
  if (!groupId || !action) return Response.json({ error: "groupId and action required" }, { status: 400 });

  const result = await provider.control(groupId, action, value);
  if (!result) return Response.json({ error: "Control failed" }, { status: 500 });

  return Response.json({ ok: true });
}
