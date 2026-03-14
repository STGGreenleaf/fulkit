import { authenticateUser, fabricFetch } from "../../../../lib/fabric-server";

const ACTIONS = {
  play: { endpoint: "/me/player/play", method: "PUT" },
  pause: { endpoint: "/me/player/pause", method: "PUT" },
  next: { endpoint: "/me/player/next", method: "POST" },
  previous: { endpoint: "/me/player/previous", method: "POST" },
};

export async function POST(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { action, value } = await request.json();

  // Volume is special — uses query param
  if (action === "volume" && typeof value === "number") {
    const percent = Math.max(0, Math.min(100, Math.round(value)));
    const res = await fabricFetch(userId, `/me/player/volume?volume_percent=${percent}`, { method: "PUT" });
    if (res.error) return Response.json({ error: res.error }, { status: res.status });
    if (res.status === 204 || res.status === 202 || res.ok) return Response.json({ ok: true });
    return Response.json({ error: "Volume error" }, { status: res.status });
  }

  // Seek to position
  if (action === "seek" && typeof value === "number") {
    const ms = Math.max(0, Math.round(value));
    const res = await fabricFetch(userId, `/me/player/seek?position_ms=${ms}`, { method: "PUT" });
    if (res.error) return Response.json({ error: res.error }, { status: res.status });
    if (res.status === 204 || res.status === 202 || res.ok) return Response.json({ ok: true });
    return Response.json({ error: "Seek error" }, { status: res.status });
  }

  // Save track to Liked Songs
  if (action === "save_track" && value?.id) {
    const res = await fabricFetch(userId, `/me/tracks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [value.id] }),
    });
    if (res.error) return Response.json({ error: res.error }, { status: res.status });
    if (res.status === 200 || res.status === 204 || res.ok) return Response.json({ ok: true });
    return Response.json({ error: "Save error" }, { status: res.status });
  }

  // Add track to queue (for gapless transitions)
  if (action === "add_to_queue" && value?.uri) {
    const res = await fabricFetch(userId, `/me/player/queue?uri=${encodeURIComponent(value.uri)}`, { method: "POST" });
    if (res.error) return Response.json({ error: res.error }, { status: res.status });
    if (res.status === 204 || res.status === 202 || res.ok) return Response.json({ ok: true });
    return Response.json({ error: "Queue error" }, { status: res.status });
  }

  // Play a specific track by URI
  if (action === "play_track" && value?.uri) {
    const res = await fabricFetch(userId, "/me/player/play", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: [value.uri] }),
    });
    if (res.error) return Response.json({ error: res.error }, { status: res.status });
    if (res.status === 204 || res.status === 202 || res.ok) return Response.json({ ok: true });
    return Response.json({ error: "Play track error" }, { status: res.status });
  }

  // Play a playlist context (optionally starting from a specific track)
  if (action === "play_context" && value?.context_uri) {
    const body = { context_uri: value.context_uri };
    if (value.offset) body.offset = value.offset;
    const res = await fabricFetch(userId, "/me/player/play", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.error) return Response.json({ error: res.error }, { status: res.status });
    if (res.status === 204 || res.status === 202 || res.ok) return Response.json({ ok: true });
    return Response.json({ error: "Play context error" }, { status: res.status });
  }

  const config = ACTIONS[action];
  if (!config) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const res = await fabricFetch(userId, config.endpoint, { method: config.method });

  if (res.error) {
    return Response.json({ error: res.error }, { status: res.status });
  }

  // Spotify returns 204 on success for control endpoints
  if (res.status === 204 || res.status === 202 || res.ok) {
    return Response.json({ ok: true });
  }

  const data = await res.json().catch(() => ({}));
  return Response.json(
    { error: data.error?.message || "Spotify error" },
    { status: res.status }
  );
}
