// Sonos Control Provider — speaker control layer for Fabric
// Controls playback on Sonos speakers via the Sonos Control API.
// Not a music source — routes audio from connected services (Spotify, Apple Music).

import { getSupabaseAdmin } from "../supabase-server";
import { encryptToken, decryptToken, encryptMeta, decryptMeta } from "../token-crypt";

const SONOS_API = "https://api.ws.sonos.com/control/api/v1";
const AUTH_URL = "https://api.sonos.com/login/v3/oauth";
const TOKEN_URL = "https://api.sonos.com/login/v3/oauth/access";

const SCOPES = "playback-control-all";

export class SonosProvider {
  name = "sonos";
  displayName = "Sonos";

  constructor(userId) {
    this.userId = userId;
  }

  // ═══ Capability stubs ═══
  // Sonos is a speaker controller, not a music source.
  // These no-ops prevent crashes when routes iterate all connected providers.
  async search() { return { tracks: [] }; }
  async getPlaylists() { return []; }
  async getPlaylistTracks() { return []; }
  async getPlaylistRaw() { return null; }
  async getNowPlaying() { return { isPlaying: false, track: null }; }
  async getDevices() { return []; }
  async transferPlayback() { return { ok: true }; }
  makeTrackUri() { return null; }
  makePlaylistUri() { return null; }

  // ═══ Auth ═══

  getConnectUrl(redirectUri, state) {
    const params = new URLSearchParams({
      client_id: process.env.SONOS_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code, redirectUri) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SONOS_CLIENT_ID}:${process.env.SONOS_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await res.json();
    if (data.error || !data.access_token) {
      return { error: data.error, error_description: data.error_description };
    }

    const { error: dbError } = await getSupabaseAdmin()
      .from("integrations")
      .upsert(
        {
          user_id: this.userId,
          provider: "sonos",
          access_token: encryptToken(data.access_token),
          scope: data.scope || "",
          metadata: encryptMeta({
            refresh_token: data.refresh_token,
            expires_at: Date.now() + data.expires_in * 1000,
          }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (dbError) return { error: "db_error", dbError };
    return { ok: true };
  }

  async validateConnection() {
    const token = await this.getValidToken();
    return !!token;
  }

  // ═══ Token Management ═══

  async getValidToken() {
    const integration = await this._getIntegration();
    if (!integration) return null;

    const token = decryptToken(integration.access_token);
    const meta = decryptMeta(integration.metadata);
    if (!token || !meta) return null;

    // Token still valid (with 5min buffer)
    if (meta.expires_at && meta.expires_at > Date.now() + 300000) return token;

    // Refresh
    if (!meta.refresh_token) return null;
    try {
      const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          Authorization: `Basic ${Buffer.from(
            `${process.env.SONOS_CLIENT_ID}:${process.env.SONOS_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: meta.refresh_token,
        }),
      });

      const data = await res.json();
      if (!data.access_token) return null;

      await getSupabaseAdmin()
        .from("integrations")
        .update({
          access_token: encryptToken(data.access_token),
          metadata: encryptMeta({
            refresh_token: data.refresh_token || meta.refresh_token,
            expires_at: Date.now() + data.expires_in * 1000,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", this.userId)
        .eq("provider", "sonos");

      return data.access_token;
    } catch {
      return null;
    }
  }

  // ═══ Households & Groups ═══

  async getHouseholds() {
    const data = await this._fetch("/households");
    return data?.households || [];
  }

  async getGroups(householdId) {
    const data = await this._fetch(`/households/${householdId}/groups`);
    return {
      groups: (data?.groups || []).map((g) => ({
        id: g.id,
        name: g.name,
        playerIds: g.playerIds || [],
        coordinatorId: g.coordinatorId,
      })),
      players: (data?.players || []).map((p) => ({
        id: p.id,
        name: p.name,
        model: p.model,
        capabilities: p.capabilities || [],
      })),
    };
  }

  // ═══ Group Management ═══

  async createGroup(householdId, playerIds) {
    if (!playerIds?.length) return null;
    // Single player — just find its current group
    if (playerIds.length === 1) {
      const { groups } = await this.getGroups(householdId);
      const match = groups.find(g => g.playerIds.includes(playerIds[0]));
      return match || null;
    }
    const data = await this._fetch(`/households/${householdId}/groups/createGroup`, {
      method: "POST",
      body: JSON.stringify({ playerIds }),
    });
    return data?.group || data || null;
  }

  // ═══ Playback Control ═══

  async getPlaybackStatus(groupId) {
    const data = await this._fetch(`/groups/${groupId}/playback`);
    if (!data) return { error: "No playback data" };
    return {
      playbackState: data.playbackState, // PLAYBACK_STATE_IDLE, PLAYBACK_STATE_PLAYING, PLAYBACK_STATE_PAUSED, etc.
      track: data.currentItem?.track ? {
        name: data.currentItem.track.name,
        artist: data.currentItem.track.artist?.name,
        album: data.currentItem.track.album?.name,
        image: data.currentItem.track.imageUrl,
        service: data.currentItem.track.service?.name,
      } : null,
      positionMillis: data.positionMillis || 0,
    };
  }

  async control(groupId, action, value) {
    switch (action) {
      case "play":
        return this._fetch(`/groups/${groupId}/playback/play`, { method: "POST" });
      case "pause":
        return this._fetch(`/groups/${groupId}/playback/pause`, { method: "POST" });
      case "next":
        return this._fetch(`/groups/${groupId}/playback/skipToNextTrack`, { method: "POST" });
      case "previous":
        return this._fetch(`/groups/${groupId}/playback/skipToPreviousTrack`, { method: "POST" });
      case "volume":
        return this._fetch(`/groups/${groupId}/groupVolume`, {
          method: "POST",
          body: JSON.stringify({ volume: Math.round(value) }),
        });
      default:
        return { error: `Unknown action: ${action}` };
    }
  }

  async getVolume(groupId) {
    const data = await this._fetch(`/groups/${groupId}/groupVolume`);
    return { volume: data?.volume ?? 0, muted: data?.muted ?? false };
  }

  async getPlayerVolume(playerId) {
    const data = await this._fetch(`/players/${playerId}/playerVolume`);
    return { volume: data?.volume ?? 0, muted: data?.muted ?? false };
  }

  async setPlayerVolume(playerId, volume) {
    return this._fetch(`/players/${playerId}/playerVolume`, {
      method: "POST",
      body: JSON.stringify({ volume: Math.round(volume) }),
    });
  }

  // ═══ Favorites ═══

  async getFavorites(householdId) {
    const data = await this._fetch(`/households/${householdId}/favorites`);
    return (data?.items || []).map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      image: f.imageUrl,
      service: f.service?.name,
    }));
  }

  async playFavorite(groupId, favoriteId) {
    return this._fetch(`/groups/${groupId}/favorites`, {
      method: "POST",
      body: JSON.stringify({
        favoriteId,
        playOnCompletion: true,
      }),
    });
  }

  // ═══ Internal ═══

  async _getIntegration() {
    const { data } = await getSupabaseAdmin()
      .from("integrations")
      .select("access_token, metadata, scope")
      .eq("user_id", this.userId)
      .eq("provider", "sonos")
      .single();
    return data;
  }

  async _fetch(endpoint, options = {}) {
    const token = await this.getValidToken();
    if (!token) return null;

    const res = await fetch(`${SONOS_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`[sonos] ${options.method || "GET"} ${endpoint} → ${res.status}`, err);
      return null;
    }

    // Some Sonos endpoints return 200 with no body
    const text = await res.text();
    return text ? JSON.parse(text) : { ok: true };
  }
}
