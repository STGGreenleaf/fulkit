import { authenticateUser, getProvider } from "../../../../lib/fabric-server";

// Returns the current access token for client-side playback SDKs.
// Spotify Web Playback SDK requires the token client-side — standard pattern.
// Auth-gated: only the authenticated user can retrieve their own token.
export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const providerName = url.searchParams.get("provider") || "spotify";
  const provider = getProvider(userId, providerName);
  if (!provider) return Response.json({ error: "Unknown provider" }, { status: 400 });
  const token = await provider.getValidToken();

  if (!token) {
    return Response.json({ error: "Not connected" }, { status: 401 });
  }

  return Response.json({ token });
}
