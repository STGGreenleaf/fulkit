// Server-side Fabric helpers — provider dispatcher + auth
// Only import from API routes. Never from client.

import { getSupabaseAdmin } from "./supabase-server";
import { SpotifyProvider } from "./providers/spotify";
import { YouTubeProvider } from "./providers/youtube";
import { SonosProvider } from "./providers/sonos";

// Provider registry — add new providers here
const PROVIDERS = {
  spotify: SpotifyProvider,
  youtube: YouTubeProvider,
  sonos: SonosProvider,
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

// Get a specific provider instance by name — caller must specify provider
export function getProvider(userId, providerName) {
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
  return getProvider(userId, track?.provider || "youtube");
}

// ═══ Spotify-specific helpers (legacy) ═══
// Explicitly Spotify — used by routes that are inherently Spotify-only.

export async function getSpotifyToken(userId) {
  const provider = getProvider(userId, "spotify");
  return provider._getIntegration();
}

export async function spotifyFetch(userId, endpoint, options = {}) {
  const provider = getProvider(userId, "spotify");
  return provider._fetch(endpoint, options);
}

// Backward-compat aliases — remove when all call sites migrate
export const getFabricToken = getSpotifyToken;
export const fabricFetch = spotifyFetch;
