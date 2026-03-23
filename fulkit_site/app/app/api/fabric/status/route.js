import { authenticateUser, getConnectedProviders } from "../../../../lib/fabric-server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const SPOTIFY_MAX_SEATS = 5;

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Run provider check and seat count in parallel
  const [providers, seatCount] = await Promise.all([
    getConnectedProviders(userId),
    getSupabaseAdmin()
      .from("integrations")
      .select("user_id", { count: "exact", head: true })
      .eq("provider", "spotify")
      .then(r => r.count || 0),
  ]);

  const results = {};
  for (const [name, provider] of Object.entries(providers)) {
    results[name] = await provider.validateConnection();
  }

  const connected = Object.values(results).some(v => v);

  return Response.json({
    connected,
    providers: results,
    spotifySeats: { used: seatCount, max: SPOTIFY_MAX_SEATS },
  });
}
