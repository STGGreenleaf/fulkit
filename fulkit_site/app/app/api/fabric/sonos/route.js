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

  // Group management: select speakers, then transfer Spotify to Sonos
  if (action === "setGroup") {
    const { householdId, playerIds } = body;
    if (!householdId || !playerIds?.length) {
      return Response.json({ error: "householdId and playerIds required" }, { status: 400 });
    }

    let { groups, players } = await provider.getGroups(householdId);
    let targetGroupId = null;

    // 1. Check if all requested players already share one group (common: "Play everywhere")
    const exact = groups.find(g =>
      playerIds.length === g.playerIds.length &&
      playerIds.every(id => g.playerIds.includes(id))
    );
    if (exact) {
      targetGroupId = exact.id;
    }

    // 2. Check if a group already contains all requested players (subset)
    if (!targetGroupId) {
      const superset = groups.find(g => playerIds.every(id => g.playerIds.includes(id)));
      if (superset) targetGroupId = superset.id;
    }

    // 3. Try creating a new group via Sonos API
    if (!targetGroupId) {
      try {
        const result = await provider.createGroup(householdId, playerIds);
        if (result?.id) {
          targetGroupId = result.id;
          const updated = await provider.getGroups(householdId);
          groups = updated.groups;
          players = updated.players;
        }
      } catch (e) {
        console.warn("[sonos] createGroup failed:", e.message);
      }
    }

    // 4. Fallback: use the group containing the first requested player
    if (!targetGroupId) {
      const fallback = groups.find(g => g.playerIds.includes(playerIds[0]));
      if (fallback) targetGroupId = fallback.id;
    }

    // Transfer Spotify playback to a Sonos device
    let transferred = false;
    let transferDebug = { spotifyDevices: [], coordName: null, matchedDevice: null, error: null, woke: false };
    const spotify = getProvider(userId, "spotify");
    if (spotify && targetGroupId) {
      try {
        // Wake the Sonos group first — this makes it appear in Spotify's device list
        await provider.control(targetGroupId, "play").catch(() => {});
        transferDebug.woke = true;
        // Give Sonos a moment to register with Spotify Connect
        await new Promise(r => setTimeout(r, 1500));

        const devices = await spotify.getDevices();
        transferDebug.spotifyDevices = devices.map(d => ({ name: d.name, type: d.type, id: d.id, active: d.is_active }));

        const targetGroup = groups.find(g => g.id === targetGroupId);
        const coordPlayer = players.find(p => p.id === targetGroup?.coordinatorId);
        const coordName = coordPlayer?.name?.toLowerCase();
        transferDebug.coordName = coordPlayer?.name || null;

        // Try coordinator name first
        if (coordName) {
          const match = devices.find(d => d.name.toLowerCase() === coordName);
          if (match) {
            await spotify.transferPlayback(match.id, true);
            transferDebug.matchedDevice = match.name;
            transferred = true;
          }
        }
        // Broaden: try any Sonos player name
        if (!transferred) {
          for (const p of players) {
            const match = devices.find(d => d.name.toLowerCase() === p.name.toLowerCase());
            if (match) {
              await spotify.transferPlayback(match.id, true);
              transferDebug.matchedDevice = match.name;
              transferred = true;
              break;
            }
          }
        }
        // Last resort: any Speaker-type device
        if (!transferred) {
          const speaker = devices.find(d => d.type === "Speaker" || d.type === "CastAudio");
          if (speaker) {
            await spotify.transferPlayback(speaker.id, true);
            transferDebug.matchedDevice = speaker.name;
            transferred = true;
          }
        }
      } catch (e) {
        transferDebug.error = e.message;
        console.warn("[sonos] Spotify transfer failed:", e.message);
      }
    }

    console.log("[sonos] setGroup result:", { targetGroupId, transferred, transferDebug });
    return Response.json({ ok: true, newGroupId: targetGroupId, groups, players, transferred, transferDebug });
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
