import { authenticateUser, getConnectedProviders } from "../../../../lib/fabric-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const providers = await getConnectedProviders(userId);
  const results = {};

  for (const [name, provider] of Object.entries(providers)) {
    results[name] = await provider.validateConnection();
  }

  // Backward compatible: connected = true if any provider is connected
  const connected = Object.values(results).some(v => v);

  return Response.json({ connected, providers: results });
}
