import { authenticateUser, spotifyFetch } from "../../../../lib/spotify-server";

const ACTIONS = {
  play: { endpoint: "/me/player/play", method: "PUT" },
  pause: { endpoint: "/me/player/pause", method: "PUT" },
  next: { endpoint: "/me/player/next", method: "POST" },
  previous: { endpoint: "/me/player/previous", method: "POST" },
};

export async function POST(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await request.json();

  const config = ACTIONS[action];
  if (!config) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const res = await spotifyFetch(userId, config.endpoint, { method: config.method });

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
