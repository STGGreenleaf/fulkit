import { authenticateUser, getFabricToken } from "../../../../lib/fabric-server";

// Returns the current Spotify access token for client-side Web Playback SDK
// Auto-refreshes if expired (handled by getFabricToken pipeline)
export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await getFabricToken(userId);
  if (!integration?.access_token) {
    return Response.json({ error: "Not connected" }, { status: 401 });
  }

  // Check expiry — if expired, trigger refresh via fabricFetch
  const expiresAt = integration.metadata?.expires_at || 0;
  if (Date.now() > expiresAt - 60000) {
    // Import fabricFetch to trigger the refresh
    const { fabricFetch } = await import("../../../../lib/fabric-server");
    const res = await fabricFetch(userId, "/me");
    if (res.error) return Response.json({ error: "Token expired" }, { status: 401 });
    // Re-fetch the now-refreshed token
    const refreshed = await getFabricToken(userId);
    return Response.json({ token: refreshed?.access_token || null });
  }

  return Response.json({ token: integration.access_token });
}
