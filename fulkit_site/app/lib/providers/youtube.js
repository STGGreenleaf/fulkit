// YouTube Music Provider — implements the Fabric provider interface
// No OAuth needed. Uses YouTube iframe API for playback, Data API v3 for search.
// The universal fallback — every user gets music.

const YT_API = "https://www.googleapis.com/youtube/v3";

// ═══ Multi-key rotation ═══
// YOUTUBE_API_KEY = primary, YOUTUBE_API_KEY_2 = fallback, etc.
// When a key gets 403 (quota), it's blocked until midnight Pacific.
function _getApiKeys() {
  const keys = [];
  if (process.env.YOUTUBE_API_KEY) keys.push(process.env.YOUTUBE_API_KEY);
  if (process.env.YOUTUBE_API_KEY_2) keys.push(process.env.YOUTUBE_API_KEY_2);
  if (process.env.YOUTUBE_API_KEY_3) keys.push(process.env.YOUTUBE_API_KEY_3);
  return keys;
}

const _blockedKeys = new Map(); // key → blocked-until timestamp

function _isKeyBlocked(key) {
  const until = _blockedKeys.get(key);
  if (!until) return false;
  if (Date.now() > until) { _blockedKeys.delete(key); return false; }
  return true;
}

function _blockKey(key) {
  // Block until next midnight Pacific (YouTube quota resets then)
  const now = new Date();
  const pacific = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const midnight = new Date(pacific);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  const msUntilReset = midnight.getTime() - pacific.getTime();
  _blockedKeys.set(key, Date.now() + msUntilReset);
}

// ═══ Server-side LRU Search Cache ═══
// YouTube Data API v3: 10,000 units/day, search = 100 units = max 100 searches/day.
// This in-memory cache persists across requests in the same serverless instance.
// Cache hit = zero quota burn.
const CACHE_MAX = 500;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

const _searchCache = new Map();

function _cacheKey(query, type, limit) {
  return `${query.trim().toLowerCase()}|${type}|${limit}`;
}

function _cacheGet(key) {
  const entry = _searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    _searchCache.delete(key);
    return null;
  }
  // Move to end (most recently used) — Map preserves insertion order
  _searchCache.delete(key);
  _searchCache.set(key, entry);
  return entry.data;
}

function _cacheSet(key, data) {
  // Evict oldest entries if at capacity
  if (_searchCache.size >= CACHE_MAX) {
    // Map iterator gives insertion-order; first key = oldest
    const oldest = _searchCache.keys().next().value;
    _searchCache.delete(oldest);
  }
  _searchCache.set(key, { data, ts: Date.now() });
}

export class YouTubeProvider {
  name = "youtube";
  displayName = "YouTube";

  constructor(userId) {
    this.userId = userId;
  }

  // ═══ Auth (not needed — YouTube is always available) ═══

  getConnectUrl() {
    return null; // No OAuth — YouTube is the free fallback
  }

  async exchangeCode() {
    return { ok: true }; // No-op
  }

  async getValidToken() {
    return _getApiKeys()[0] || null; // API key, not user token
  }

  // ═══ Search ═══

  async search(query, type = "video", limit = 5) {
    const keys = _getApiKeys();
    if (!keys.length) return { error: "YouTube API key not configured" };

    const ytType = type === "track" ? "video" : type === "playlist" ? "playlist" : "video";

    // ── Cache check (saves 100 quota units per hit) ──
    const cKey = _cacheKey(query, ytType, limit);
    const cached = _cacheGet(cKey);
    if (cached) return cached;

    // Try each API key — rotate past quota-blocked ones
    let lastError = null;
    for (const apiKey of keys) {
      if (_isKeyBlocked(apiKey)) continue;

      const params = new URLSearchParams({
        part: "snippet",
        q: query + (ytType === "video" ? " music" : ""),
        type: ytType,
        maxResults: String(limit),
        key: apiKey,
        videoCategoryId: ytType === "video" ? "10" : undefined, // Music category
      });
      // Remove undefined params
      if (ytType !== "video") params.delete("videoCategoryId");

      const res = await fetch(`${YT_API}/search?${params}`);
      if (res.status === 403) {
        // Quota exceeded — block this key until next reset (midnight Pacific)
        _blockKey(apiKey);
        lastError = `YouTube API 403 (quota)`;
        continue;
      }
      if (!res.ok) return { error: `YouTube API ${res.status}`, status: res.status };

      const data = await res.json();
      let result;

      if (ytType === "video") {
        result = {
          tracks: (data.items || []).map(item => ({
            source_id: item.id.videoId,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            album: null,
            duration_ms: 0,
            uri: `youtube:video:${item.id.videoId}`,
            image: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || null,
            provider: "youtube",
          })),
        };
      } else if (ytType === "playlist") {
        result = {
          playlists: (data.items || []).map(item => ({
            id: item.id.playlistId,
            name: item.snippet.title,
            description: item.snippet.description?.slice(0, 100) || null,
            trackCount: 0,
            owner: item.snippet.channelTitle,
            uri: `youtube:playlist:${item.id.playlistId}`,
          })),
        };
      } else {
        return { error: "unsupported type" };
      }

      _cacheSet(cKey, result);
      return result;
    }

    // All keys exhausted
    return { error: lastError || "All YouTube API keys quota-blocked", status: 403 };
  }

  // ═══ Playback (managed client-side via iframe API) ═══

  async getNowPlaying() {
    // YouTube playback state is managed client-side in YouTubeEngine
    return { isPlaying: false, track: null };
  }

  async control() {
    // Controls are client-side via iframe postMessage
    return { ok: true };
  }

  async getDevices() {
    return []; // YouTube plays in the browser only
  }

  async transferPlayback() {
    return { ok: true }; // No-op
  }

  // ═══ Library ═══

  async getPlaylists() {
    return []; // YouTube playlists would require OAuth, skip for now
  }

  async getPlaylistTracks(playlistId, limit = 50) {
    const keys = _getApiKeys();
    if (!keys.length) return [];

    let res;
    for (const apiKey of keys) {
      if (_isKeyBlocked(apiKey)) continue;
      const params = new URLSearchParams({
        part: "snippet",
        playlistId,
        maxResults: String(limit),
        key: apiKey,
      });
      res = await fetch(`${YT_API}/playlistItems?${params}`);
      if (res.status === 403) { _blockKey(apiKey); continue; }
      break;
    }
    if (!res?.ok) return [];

    const data = await res.json();
    return (data.items || []).map(item => ({
      source_id: item.snippet.resourceId?.videoId,
      title: item.snippet.title,
      artist: item.snippet.videoOwnerChannelTitle || "",
      album: null,
      duration_ms: 0,
      uri: `youtube:video:${item.snippet.resourceId?.videoId}`,
      image: item.snippet.thumbnails?.medium?.url || null,
      provider: "youtube",
    }));
  }

  // ═══ Identity ═══

  makeTrackUri(id) {
    return `youtube:video:${id}`;
  }

  makePlaylistUri(id) {
    return `youtube:playlist:${id}`;
  }

  // ═══ Validation ═══

  async validateConnection() {
    return true; // YouTube is always available
  }
}
