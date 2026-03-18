// Spotify Music Provider — implements the Fabric provider interface
// All Spotify API logic lives here. Routes call provider methods, never Spotify directly.

import { getSupabaseAdmin } from "../supabase-server";
import { encryptToken, decryptToken, encryptMeta, decryptMeta } from "../token-crypt";

const SPOTIFY_API = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

const SCOPES = [
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-library-read",
  "user-top-read",
  "user-read-recently-played",
  "playlist-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

export class SpotifyProvider {
  name = "spotify";
  displayName = "Spotify";

  constructor(userId) {
    this.userId = userId;
  }

  // ═══ Auth ═══

  getConnectUrl(redirectUri, state) {
    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async exchangeCode(code, redirectUri) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
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

    // Upsert into integrations table
    const { error: dbError } = await getSupabaseAdmin()
      .from("integrations")
      .upsert(
        {
          user_id: this.userId,
          provider: "spotify",
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

    if (dbError) return { error: `db_${dbError.code}`, dbError };
    return { ok: true };
  }

  async getValidToken() {
    const integration = await this._getIntegration();
    if (!integration) return null;

    let token = integration.access_token;
    const expiresAt = integration.metadata?.expires_at || 0;

    if (Date.now() > expiresAt - 60000) {
      token = await this._refreshToken(integration.metadata?.refresh_token);
    }
    return token;
  }

  // ═══ Playback ═══

  async getNowPlaying() {
    const res = await this._fetch("/me/player");
    if (res.status === 204 || res.status === 202) {
      return { isPlaying: false, track: null };
    }
    if (res.error) return { error: res.error, status: res.status };
    if (!res.ok) return { isPlaying: false, track: null };

    const data = await res.json();
    if (!data.item) {
      return { isPlaying: data.is_playing || false, track: null };
    }

    return {
      isPlaying: data.is_playing,
      track: this._normalizeTrack(data.item, data.progress_ms),
      volume: data.device?.volume_percent ?? null,
      device: data.device ? { name: data.device.name, type: data.device.type } : null,
      // Raw data for DB tracking
      _raw: {
        id: data.item.id,
        name: data.item.name,
        artists: data.item.artists,
        duration_ms: data.item.duration_ms,
        isrc: data.item.external_ids?.isrc || null,
      },
    };
  }

  async control(action, value) {
    const ACTIONS = {
      play: { endpoint: "/me/player/play", method: "PUT" },
      pause: { endpoint: "/me/player/pause", method: "PUT" },
      next: { endpoint: "/me/player/next", method: "POST" },
      previous: { endpoint: "/me/player/previous", method: "POST" },
    };

    if (action === "volume" && typeof value === "number") {
      const percent = Math.max(0, Math.min(100, Math.round(value)));
      return this._controlRequest(`/me/player/volume?volume_percent=${percent}`, "PUT");
    }

    if (action === "seek" && typeof value === "number") {
      const ms = Math.max(0, Math.round(value));
      return this._controlRequest(`/me/player/seek?position_ms=${ms}`, "PUT");
    }

    if (action === "save_track" && value?.id) {
      return this._controlRequest("/me/tracks", "PUT", { ids: [value.id] });
    }

    if (action === "add_to_queue" && value?.uri) {
      return this._controlRequest(`/me/player/queue?uri=${encodeURIComponent(value.uri)}`, "POST");
    }

    if (action === "play_track" && value?.uri) {
      return this._controlRequest("/me/player/play", "PUT", { uris: [value.uri] });
    }

    if (action === "play_context" && value?.context_uri) {
      const body = { context_uri: value.context_uri };
      if (value.offset) body.offset = value.offset;
      return this._controlRequest("/me/player/play", "PUT", body);
    }

    const config = ACTIONS[action];
    if (!config) return { error: "Invalid action" };

    return this._controlRequest(config.endpoint, config.method);
  }

  async getDevices() {
    const res = await this._fetch("/me/player/devices");
    if (res.error || !res.ok) return [];

    const data = await res.json();
    return (data.devices || []).map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      is_active: d.is_active,
      volume: d.volume_percent,
    }));
  }

  async transferPlayback(deviceId, play = true) {
    return this._controlRequest("/me/player", "PUT", {
      device_ids: [deviceId],
      play,
    });
  }

  // ═══ Library ═══

  async getPlaylists(limit = 20) {
    const res = await this._fetch(`/me/playlists?limit=${limit}`);
    if (res.error || !res.ok) return [];

    const data = await res.json();
    return (data.items || []).map(pl => ({
      id: pl.id,
      name: pl.name,
      trackCount: typeof pl.items === "object" ? (pl.items.total ?? 0) : (pl.items ?? 0),
      description: pl.description || "",
      image: pl.images?.[0]?.url || null,
    }));
  }

  async getPlaylistTracks(playlistId, limit = 50) {
    const res = await this._fetch(`/playlists/${playlistId}/items?limit=${limit}`);
    if (res.error || !res.ok) return [];

    const data = await res.json();
    return (data.items || [])
      .filter(entry => entry.item && entry.item.id)
      .map(entry => this._normalizeTrack(entry.item));
  }

  async getPlaylistRaw(playlistId) {
    const res = await this._fetch(`/playlists/${playlistId}`);
    if (res.error || !res.ok) return null;
    return res.json();
  }

  // ═══ Search ═══

  async search(query, type = "album", limit) {
    const effectiveLimit = limit || (type === "album" ? 20 : 5);
    const res = await this._fetch(`/search?q=${encodeURIComponent(query)}&type=${type}&limit=${effectiveLimit}`);
    if (res.error) return { error: res.error, status: res.status };

    const data = await res.json();

    if (type === "album") {
      return {
        albums: (data.albums?.items || []).map(a => ({
          id: a.id,
          name: a.name,
          artist: a.artists?.[0]?.name || "Unknown",
          image: a.images?.[1]?.url || a.images?.[0]?.url || null,
          year: a.release_date?.slice(0, 4) || null,
          trackCount: a.total_tracks,
        })),
      };
    }

    if (type === "artist") {
      return {
        artists: (data.artists?.items || []).map(a => ({
          id: a.id,
          name: a.name,
          image: a.images?.[1]?.url || a.images?.[0]?.url || null,
          genres: a.genres?.slice(0, 3) || [],
        })),
      };
    }

    if (type === "track") {
      return {
        tracks: (data.tracks?.items || []).map(t => ({
          source_id: t.id,
          title: t.name,
          artist: t.artists?.[0]?.name || "Unknown",
          album: t.album?.name || null,
          duration_ms: t.duration_ms,
          uri: t.uri,
          image: t.album?.images?.[0]?.url || null,
          provider: "spotify",
        })),
      };
    }

    if (type === "playlist") {
      return {
        playlists: (data.playlists?.items || []).filter(Boolean).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || null,
          trackCount: p.tracks?.total || 0,
          owner: p.owner?.display_name || null,
          uri: p.uri,
        })),
      };
    }

    return { error: "unsupported type" };
  }

  async getAlbum(albumId) {
    const [albumRes, tracksRes] = await Promise.all([
      this._fetch(`/albums/${albumId}`),
      this._fetch(`/albums/${albumId}/tracks?limit=50`),
    ]);

    if (albumRes.error || tracksRes.error) {
      return { error: albumRes.error || tracksRes.error, status: albumRes.status || 500 };
    }

    const album = await albumRes.json();
    const tracksData = await tracksRes.json();

    return {
      album: {
        id: album.id,
        name: album.name,
        artist: album.artists?.[0]?.name || "Unknown",
        image: album.images?.[1]?.url || album.images?.[0]?.url || null,
        year: album.release_date?.slice(0, 4) || null,
        trackCount: album.total_tracks,
      },
      tracks: (tracksData.items || []).map((t, i) => ({
        source_id: t.id,
        title: t.name,
        artist: t.artists?.[0]?.name || album.artists?.[0]?.name || "Unknown",
        duration_ms: t.duration_ms,
        track_number: t.track_number || i + 1,
        provider: "spotify",
      })),
    };
  }

  async getArtistTopTracks(artistId) {
    const res = await this._fetch(`/artists/${artistId}/top-tracks?market=US`);
    if (res.error) return { error: res.error, status: res.status };

    const data = await res.json();
    return {
      tracks: (data.tracks || []).map((t, i) => ({
        source_id: t.id,
        title: t.name,
        artist: t.artists?.[0]?.name || "Unknown",
        album: t.album?.name || null,
        duration_ms: t.duration_ms,
        uri: t.uri,
        track_number: i + 1,
        provider: "spotify",
      })),
    };
  }

  // ═══ Identity ═══

  makeTrackUri(id) {
    return `spotify:track:${id}`;
  }

  makePlaylistUri(id) {
    return `spotify:playlist:${id}`;
  }

  // ═══ Validation ═══

  async validateConnection() {
    const res = await this._fetch("/me");
    return !res.error && res.status !== 401;
  }

  // ═══ Internal ═══

  _normalizeTrack(item, progressMs) {
    const track = {
      id: item.id,
      title: item.name,
      artist: item.artists?.map(a => a.name).join(", ") || "",
      album: item.album?.name || "",
      duration: Math.round((item.duration_ms || 0) / 1000),
      duration_ms: item.duration_ms || 0,
      art: item.album?.images?.[0]?.url || null,
      uri: item.uri,
      isrc: item.external_ids?.isrc || null,
      provider: "spotify",
    };
    if (progressMs !== undefined) {
      track.progress = progressMs / (item.duration_ms || 1);
      track.progressMs = progressMs;
    }
    return track;
  }

  async _getIntegration() {
    const { data } = await getSupabaseAdmin()
      .from("integrations")
      .select("access_token, metadata")
      .eq("user_id", this.userId)
      .eq("provider", "spotify")
      .single();
    if (!data) return null;
    return { access_token: decryptToken(data.access_token), metadata: decryptMeta(data.metadata) };
  }

  async _refreshToken(refreshTokenStr) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshTokenStr,
      }),
    });

    const data = await res.json();
    if (data.error || !data.access_token) {
      console.error("[spotify] Token refresh failed:", data.error);
      return null;
    }

    await getSupabaseAdmin()
      .from("integrations")
      .update({
        access_token: encryptToken(data.access_token),
        metadata: encryptMeta({ refresh_token: data.refresh_token || refreshTokenStr, expires_at: Date.now() + data.expires_in * 1000 }),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", this.userId)
      .eq("provider", "spotify");

    return data.access_token;
  }

  async _fetch(endpoint, options = {}) {
    const integration = await this._getIntegration();
    if (!integration) return { error: "Not connected", status: 401 };

    let token = integration.access_token;
    const expiresAt = integration.metadata?.expires_at || 0;
    if (Date.now() > expiresAt - 60000) {
      token = await this._refreshToken(integration.metadata?.refresh_token);
      if (!token) return { error: "Token refresh failed", status: 401 };
    }

    const res = await fetch(`${SPOTIFY_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (res.status === 401) {
      token = await this._refreshToken(integration.metadata?.refresh_token);
      if (!token) return { error: "Token expired", status: 401 };
      return fetch(`${SPOTIFY_API}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
    }

    return res;
  }

  async _controlRequest(endpoint, method, body) {
    const res = await this._fetch(endpoint, {
      method,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.error) return { error: res.error, status: res.status };
    if (res.status === 204 || res.status === 202 || res.ok) return { ok: true };

    const data = await res.json().catch(() => ({}));
    return { error: data.error?.message || "Spotify error", status: res.status };
  }
}
