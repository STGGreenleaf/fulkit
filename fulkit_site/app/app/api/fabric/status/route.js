import { authenticateUser, getConnectedProviders } from "../../../../lib/fabric-server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const PROVIDER_SEAT_LIMITS = {
  spotify: 5, // Spotify Extended Quota cap
};

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const providers = await getConnectedProviders(userId);

  const results = {};
  for (const [name, provider] of Object.entries(providers)) {
    results[name] = await provider.validateConnection();
  }

  const connected = Object.values(results).some(v => v);

  // Seat counts for providers with limits
  const seats = {};
  for (const [name, max] of Object.entries(PROVIDER_SEAT_LIMITS)) {
    const { count } = await getSupabaseAdmin()
      .from("integrations")
      .select("user_id", { count: "exact", head: true })
      .eq("provider", name);
    seats[name] = { used: count || 0, max };
  }

  return Response.json({
    connected,
    providers: results,
    seats,
    // Backward compat
    spotifySeats: seats.spotify || { used: 0, max: PROVIDER_SEAT_LIMITS.spotify },
  });
}
