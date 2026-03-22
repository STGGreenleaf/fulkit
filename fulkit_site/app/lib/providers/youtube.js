// YouTube Music Provider — implements the Fabric provider interface
// No OAuth needed. Uses YouTube iframe API for playback, Data API v3 for search.
// The universal fallback — every user gets music.

const YT_API = "https://www.googleapis.com/youtube/v3";

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
    return process.env.YOUTUBE_API_KEY || null; // API key, not user token
  }

  // ═══ Search ═══

  async search(query, type = "video", limit = 5) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return { error: "YouTube API key not configured" };

    const ytType = type === "track" ? "video" : type === "playlist" ? "playlist" : "video";

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
    if (!res.ok) return { error: `YouTube API ${res.status}`, status: res.status };

    const data = await res.json();

    if (ytType === "video") {
      return {
        tracks: (data.items || []).map(item => ({
          source_id: item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          album: null,
          duration_ms: 0, // Would need a separate API call for duration
          uri: `youtube:video:${item.id.videoId}`,
          image: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || null,
          provider: "youtube",
        })),
      };
    }

    if (ytType === "playlist") {
      return {
        playlists: (data.items || []).map(item => ({
          id: item.id.playlistId,
          name: item.snippet.title,
          description: item.snippet.description?.slice(0, 100) || null,
          trackCount: 0,
          owner: item.snippet.channelTitle,
          uri: `youtube:playlist:${item.id.playlistId}`,
        })),
      };
    }

    return { error: "unsupported type" };
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
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return [];

    const params = new URLSearchParams({
      part: "snippet",
      playlistId,
      maxResults: String(limit),
      key: apiKey,
    });

    const res = await fetch(`${YT_API}/playlistItems?${params}`);
    if (!res.ok) return [];

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
