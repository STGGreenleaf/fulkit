import { authenticateUser, getProvider } from "../../../../lib/fabric-server";

// Returns the current access token for client-side playback SDK
// Auto-refreshes if expired
export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const provider = getProvider(userId, "spotify");
  const token = await provider.getValidToken();

  if (!token) {
    return Response.json({ error: "Not connected" }, { status: 401 });
  }

  return Response.json({ token });
}
