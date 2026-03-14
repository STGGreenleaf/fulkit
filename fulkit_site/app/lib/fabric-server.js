// Server-side Fabric helpers — provider dispatcher + auth
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { SpotifyProvider } from "./providers/spotify";

// Provider registry — add new providers here
const PROVIDERS = {
  spotify: SpotifyProvider,
};

// Authenticate user from Bearer token
export async function authenticateUser(request) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

// Get a specific provider instance by name
export function getProvider(userId, providerName = "spotify") {
  const Provider = PROVIDERS[providerName];
  if (!Provider) return null;
  return new Provider(userId);
}

// Get ALL connected providers for this user
export async function getConnectedProviders(userId) {
  const { data: integrations } = await getSupabaseAdmin()
    .from("integrations")
    .select("provider")
    .eq("user_id", userId)
    .in("provider", Object.keys(PROVIDERS));

  const connected = {};
  for (const row of (integrations || [])) {
    const Provider = PROVIDERS[row.provider];
    if (Provider) connected[row.provider] = new Provider(userId);
  }
  return connected;
}

// Get the provider for a specific track (by its provider field)
export function getTrackProvider(userId, track) {
  return getProvider(userId, track?.provider || "spotify");
}

// ═══ Backward compatibility ═══
// These wrap the Spotify provider for routes that haven't been updated yet.
// Will be removed once all routes use provider methods directly.

export async function getFabricToken(userId) {
  const provider = getProvider(userId, "spotify");
  return provider._getIntegration();
}

export async function fabricFetch(userId, endpoint, options = {}) {
  const provider = getProvider(userId, "spotify");
  return provider._fetch(endpoint, options);
}
