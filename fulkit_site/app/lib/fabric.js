"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./auth";
import SpotifyPlayer from "../components/SpotifyPlayer";

const FabricContext = createContext(null);

// Mock data for dev mode
const MOCK_TRACKS = [
  { id: "1", title: "Midnight City", artist: "M83", album: "Hurry Up, We're Dreaming", duration: 243, art: null },
  { id: "2", title: "Tadow", artist: "Masego, FKJ", album: "Tadow", duration: 295, art: null },
  { id: "3", title: "Breathe", artist: "Télépopmusik", album: "Genetic World", duration: 258, art: null },
  { id: "4", title: "Intro", artist: "The xx", album: "xx", duration: 128, art: null },
  { id: "5", title: "Nikes", artist: "Frank Ocean", album: "Blonde", duration: 313, art: null },
  { id: "6", title: "Be Quiet and Drive", artist: "Deftones", album: "Around the Fur", duration: 310, art: null },
  { id: "7", title: "Dissolve", artist: "Absofacto", album: "Thousand Peaces", duration: 227, art: null },
  { id: "8", title: "Lost in the Light", artist: "Bahamas", album: "Barchords", duration: 209, art: null },
];

const MOCK_PLAYLISTS = [
  { id: "p1", name: "Deep Work", tracks: 24, description: "Focus without friction" },
  { id: "p2", name: "Night Drive", tracks: 18, description: "Windows down, volume up" },
  { id: "p3", name: "Sunday Morning", tracks: 31, description: "Slow start, no rush" },
];

const MOCK_FEATURES = {
  "1": { bpm: 105, key: "Am", energy: 78, danceability: 62, valence: 45, loudness: -8, acousticness: 15 },
  "2": { bpm: 98, key: "Fm", energy: 65, danceability: 71, valence: 58, loudness: -10, acousticness: 25 },
  "3": { bpm: 112, key: "C", energy: 42, danceability: 55, valence: 38, loudness: -14, acousticness: 60 },
  "4": { bpm: 120, key: "Dm", energy: 35, danceability: 48, valence: 30, loudness: -16, acousticness: 70 },
  "5": { bpm: 130, key: "Eb", energy: 55, danceability: 60, valence: 25, loudness: -12, acousticness: 10 },
  "6": { bpm: 138, key: "Em", energy: 88, danceability: 45, valence: 35, loudness: -5, acousticness: 5 },
  "7": { bpm: 100, key: "G", energy: 50, danceability: 65, valence: 70, loudness: -11, acousticness: 40 },
  "8": { bpm: 92, key: "D", energy: 38, danceability: 52, valence: 72, loudness: -13, acousticness: 55 },
};

export function FabricProvider({ children }) {
  const { user, accessToken } = useAuth();
  const isDev = user?.isDev;

  const [connected, setConnected] = useState(isDev ? true : false);
  const [statusChecked, setStatusChecked] = useState(isDev ? true : false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(isDev ? MOCK_TRACKS[0] : null);
  const [queue, setQueue] = useState(isDev ? MOCK_TRACKS.slice(1, 5) : []);
  // Multi-set state (migrates from old single-set format)
  const [setsData, setSetsData] = useState(() => {
    if (typeof window === "undefined") return { activeId: "set-1", sets: [{ id: "set-1", name: "Set 1", tracks: [] }] };
    try {
      const newFormat = localStorage.getItem("fulkit-sets");
      if (newFormat) return JSON.parse(newFormat);
      // Migrate old format
      const oldTracks = localStorage.getItem("fulkit-flagged-tracks");
      const tracks = oldTracks ? JSON.parse(oldTracks) : [];
      const migrated = { activeId: "set-1", sets: [{ id: "set-1", name: "Set 1", tracks }] };
      localStorage.setItem("fulkit-sets", JSON.stringify(migrated));
      localStorage.removeItem("fulkit-flagged-tracks");
      return migrated;
    } catch { return { activeId: "set-1", sets: [{ id: "set-1", name: "Set 1", tracks: [] }] }; }
  });

  // Persist sets to localStorage
  const persistSets = useCallback((data) => {
    try { localStorage.setItem("fulkit-sets", JSON.stringify(data)); } catch {}
  }, []);

  // Derived: active set's tracks (backwards-compatible with old `flagged`)
  const activeSet = setsData.sets.find(s => s.id === setsData.activeId) || setsData.sets[0];
  const flagged = activeSet?.tracks || [];
  const [playlists, setPlaylists] = useState(isDev ? MOCK_PLAYLISTS : []);
  const [progress, setProgress] = useState(0);
  const [volume, setVolumeState] = useState(null);
  const [audioFeatures, setAudioFeatures] = useState(isDev ? MOCK_FEATURES : {});
  const [timeline, setTimeline] = useState(null); // Fabric per-second data
  const [timelineResolution, setTimelineResolution] = useState(500);
  const timelineRequested = useRef(new Set());
  const pollRef = useRef(null);
  const volumeTimer = useRef(null);
  const volumeLockedUntil = useRef(0);
  const featuresRequested = useRef(new Set());
  const prevTrackRef = useRef(null); // track before manual playTrack jump

  // Helper for authenticated API calls
  const apiFetch = useCallback(async (endpoint, options = {}) => {
    if (!accessToken) { console.warn("[fabric] No accessToken for", endpoint); return null; }
    try {
      const res = await fetch(endpoint, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      if (!res.ok) {
        console.warn("[fabric]", endpoint, res.status);
        const text = await res.text();
        try { return JSON.parse(text); } catch { return null; }
      }
      const text = await res.text();
      if (!text) return { ok: true };
      try { return JSON.parse(text); } catch { return { ok: true }; }
    } catch (e) { console.warn("[fabric]", endpoint, e.message); return null; }
  }, [accessToken]);

  // Web Playback SDK device ID
  const [sdkDeviceId, setSdkDeviceId] = useState(null);
  const sdkTransferred = useRef(false);

  const onDeviceReady = useCallback((deviceId) => {
    setSdkDeviceId(deviceId);
    console.log("[Spotify SDK] Fülkit device available:", deviceId);
    // Don't auto-transfer — let user's current device keep playing
    // Transfer only happens when user explicitly activates Fülkit as output
  }, []);

  const onDeviceLost = useCallback(() => {
    setSdkDeviceId(null);
    sdkTransferred.current = false;
  }, []);

  // Reconnect: redirect to Spotify OAuth
  const reconnectSpotify = useCallback(() => {
    if (!accessToken) return;
    window.location.href = `/api/fabric/connect?token=${accessToken}`;
  }, [accessToken]);

  // Check connection status
  useEffect(() => {
    if (isDev || !accessToken) return;
    apiFetch("/api/fabric/status").then((data) => {
      if (data) setConnected(data.connected);
      setStatusChecked(true);
    }).catch(() => setStatusChecked(true));
  }, [accessToken, isDev, apiFetch]);

  // Fetch playlists when connected
  useEffect(() => {
    if (isDev || !connected || !accessToken) return;
    apiFetch("/api/fabric/playlists").then((data) => {
      if (data?.playlists) setPlaylists(data.playlists);
    });
  }, [connected, accessToken, isDev, apiFetch]);

  // Poll now playing every 4s when connected
  useEffect(() => {
    if (isDev || !connected || !accessToken) return;

    let failCount = 0;
    const fetchNowPlaying = async () => {
      const data = await apiFetch("/api/fabric/now-playing");
      if (!data || data.error) {
        failCount++;
        if (failCount >= 3) { setConnected(false); clearInterval(pollRef.current); }
        return;
      }
      failCount = 0;
      setIsPlaying(data.isPlaying);
      if (data.volume != null && Date.now() > volumeLockedUntil.current) setVolumeState(data.volume);
      if (data.track) {
        setCurrentTrack((prev) => {
          // Only update if track changed or progress jumped
          if (!prev || prev.id !== data.track.id) return data.track;
          return { ...prev, progress: data.track.progress, progressMs: data.track.progressMs };
        });
        setProgress(data.track.progress);
      } else {
        setCurrentTrack(null);
        setProgress(0);
      }
    };

    fetchNowPlaying();
    pollRef.current = setInterval(fetchNowPlaying, 4000);
    return () => clearInterval(pollRef.current);
  }, [connected, accessToken, isDev, apiFetch]);

  // Smooth progress interpolation between polls
  useEffect(() => {
    if (!isPlaying || !currentTrack?.duration) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        const step = 0.25 / currentTrack.duration;
        return Math.min(p + step, 1);
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.duration]);

  // Controls — send to API
  const sendControl = useCallback(async (action) => {
    if (isDev) return;
    await apiFetch("/api/fabric/controls", {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  }, [isDev, apiFetch]);

  const play = useCallback(() => {
    setIsPlaying(true);
    sendControl("play");
  }, [sendControl]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    sendControl("pause");
  }, [sendControl]);

  const toggle = useCallback(() => {
    setIsPlaying((p) => {
      sendControl(p ? "pause" : "play");
      return !p;
    });
  }, [sendControl]);

  const skip = useCallback(() => {
    if (isDev) {
      if (queue.length === 0) return;
      setCurrentTrack(queue[0]);
      setQueue((q) => q.slice(1));
      setProgress(0);
      setIsPlaying(true);
      return;
    }
    sendControl("next");
    // Optimistic: poll will catch the actual track shortly
  }, [isDev, queue, sendControl]);

  const prev = useCallback(() => {
    if (isDev) {
      setProgress(0);
      return;
    }
    // If we jumped to a track manually, go back to what was playing
    const saved = prevTrackRef.current;
    if (saved) {
      prevTrackRef.current = null;
      setCurrentTrack(saved);
      setProgress(0);
      setIsPlaying(true);
      apiFetch("/api/fabric/controls", {
        method: "POST",
        body: JSON.stringify({ action: "play_track", value: { uri: saved.uri || `spotify:track:${saved.id}` } }),
      });
      return;
    }
    sendControl("previous");
  }, [isDev, sendControl, apiFetch]);

  const setVolume = useCallback((val) => {
    const v = Math.max(0, Math.min(100, Math.round(val)));
    setVolumeState(v);
    // Suppress poll-based volume updates for 5s so the slider doesn't snap back
    volumeLockedUntil.current = Date.now() + 5000;
    if (isDev) return;
    clearTimeout(volumeTimer.current);
    volumeTimer.current = setTimeout(() => {
      apiFetch("/api/fabric/controls", {
        method: "POST",
        body: JSON.stringify({ action: "volume", value: v }),
      });
    }, 300);
  }, [isDev, apiFetch]);

  // Fetch Fabric timeline when track changes
  const prevTimelineTrack = useRef(null);
  useEffect(() => {
    if (isDev || !connected || !accessToken || !currentTrack?.id) return;
    if (prevTimelineTrack.current === currentTrack.id) return;
    prevTimelineTrack.current = currentTrack.id;
    setTimeline(null); // clear old data first

    apiFetch(`/api/fabric/timeline?id=${currentTrack.id}`).then((data) => {
      // Only set if still the same track
      if (prevTimelineTrack.current !== currentTrack.id) return;
      if (data?.status === "complete" && data.timeline) {
        setTimeline(data.timeline);
        setTimelineResolution(data.resolution_ms || 500);
      } else {
        setTimeline(null);
      }
    }).catch(() => setTimeline(null));
  }, [currentTrack?.id, connected, accessToken, isDev, apiFetch]);

  // Snapshot interpolator: progress → current snapshot data
  const getSnapshot = useCallback((progressFraction) => {
    if (!timeline || timeline.length === 0) return null;
    // Use Spotify's track duration to map progress, clamped to timeline range
    const trackDurationSec = currentTrack?.duration || timeline[timeline.length - 1].t;
    const timelineDuration = timeline[timeline.length - 1].t;
    const currentTime = Math.min(progressFraction * trackDurationSec, timelineDuration);
    // Find surrounding snapshots
    let lo = 0, hi = timeline.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (timeline[mid].t <= currentTime) lo = mid; else hi = mid;
    }
    const a = timeline[lo], b = timeline[hi];
    if (a.t === b.t) return a;
    const frac = (currentTime - a.t) / (b.t - a.t);
    // Linearly interpolate numeric fields
    return {
      t: currentTime,
      loudness: a.loudness + (b.loudness - a.loudness) * frac,
      bands: Object.fromEntries(
        Object.keys(a.bands).map(k => [k, a.bands[k] + (b.bands[k] - a.bands[k]) * frac])
      ),
      flux: a.flux + (b.flux - a.flux) * frac,
      spectral_centroid: a.spectral_centroid + (b.spectral_centroid - a.spectral_centroid) * frac,
      spectral_spread: (a.spectral_spread || 0) + ((b.spectral_spread || 0) - (a.spectral_spread || 0)) * frac,
      spectral_rolloff: (a.spectral_rolloff || 0) + ((b.spectral_rolloff || 0) - (a.spectral_rolloff || 0)) * frac,
      zero_crossing_rate: (a.zero_crossing_rate || 0) + ((b.zero_crossing_rate || 0) - (a.zero_crossing_rate || 0)) * frac,
      dynamic_range: (a.dynamic_range || 0) + ((b.dynamic_range || 0) - (a.dynamic_range || 0)) * frac,
      beat: b.beat || false,
      beat_strength: b.beat_strength || 0,
      downbeat: b.downbeat || false,
      onset: b.onset || false,
      onset_strength: b.onset_strength || 0,
    };
  }, [timeline, currentTrack?.duration]);

  // Fetch audio features for tracks we haven't fetched yet (via ReccoBeats)
  useEffect(() => {
    if (isDev || !connected || !accessToken) return;
    const ids = [];
    if (currentTrack?.id && !audioFeatures[currentTrack.id] && !featuresRequested.current.has(currentTrack.id)) {
      ids.push(currentTrack.id);
    }
    for (const t of flagged) {
      if (!audioFeatures[t.id] && !featuresRequested.current.has(t.id)) ids.push(t.id);
    }
    if (ids.length === 0) return;
    ids.forEach((id) => featuresRequested.current.add(id));
    apiFetch(`/api/fabric/audio-features?ids=${ids.join(",")}`).then((data) => {
      if (data?.features && Object.keys(data.features).length > 0) {
        setAudioFeatures((prev) => ({ ...prev, ...data.features }));
      }
    });
  }, [currentTrack?.id, flagged, connected, accessToken, isDev, apiFetch, audioFeatures]);

  const reorderFlagged = useCallback((fromIndex, toIndex) => {
    setSetsData((prev) => {
      const next = { ...prev, sets: prev.sets.map(s => {
        if (s.id !== prev.activeId) return s;
        const tracks = [...s.tracks];
        const [moved] = tracks.splice(fromIndex, 1);
        tracks.splice(toIndex, 0, moved);
        return { ...s, tracks };
      })};
      persistSets(next);
      return next;
    });
  }, [persistSets]);

  const flag = useCallback((track) => {
    setSetsData((prev) => {
      const next = { ...prev, sets: prev.sets.map(s => {
        if (s.id !== prev.activeId) return s;
        const has = s.tracks.some(t => t.id === track.id);
        return { ...s, tracks: has ? s.tracks.filter(t => t.id !== track.id) : [...s.tracks, track] };
      })};
      persistSets(next);
      return next;
    });
  }, [persistSets]);

  const isFlagged = useCallback(
    (trackId) => flagged.some((t) => t.id === trackId),
    [flagged]
  );

  // Guy's Crate — auto-populated by BTC recommendations
  const guyCrate = setsData.sets.find(s => s.id === "guy-crate") || null;

  const addToGuyCrate = useCallback((track) => {
    setSetsData((prev) => {
      let gc = prev.sets.find(s => s.id === "guy-crate");
      if (!gc) {
        gc = { id: "guy-crate", name: "Guy's Crate", source: "guy", tracks: [] };
        if (gc.tracks.some(t => t.id === track.id)) return prev;
        const next = { ...prev, sets: [...prev.sets, { ...gc, tracks: [track] }] };
        persistSets(next);
        return next;
      }
      if (gc.tracks.some(t => t.id === track.id)) return prev;
      const next = { ...prev, sets: prev.sets.map(s =>
        s.id === "guy-crate" ? { ...s, tracks: [...s.tracks, track] } : s
      )};
      persistSets(next);
      return next;
    });
  }, [persistSets]);

  const removeFromGuyCrate = useCallback((trackId) => {
    setSetsData((prev) => {
      const next = { ...prev, sets: prev.sets.map(s =>
        s.id === "guy-crate" ? { ...s, tracks: s.tracks.filter(t => t.id !== trackId) } : s
      )};
      persistSets(next);
      return next;
    });
  }, [persistSets]);

  const clearGuyCrate = useCallback(() => {
    setSetsData((prev) => {
      const next = { ...prev, sets: prev.sets.filter(s => s.id !== "guy-crate") };
      persistSets(next);
      return next;
    });
  }, [persistSets]);

  // Multi-set CRUD
  const allSets = setsData.sets.filter(s => s.source !== "guy").map(s => ({ id: s.id, name: s.name, trackCount: s.tracks.length }));
  const activeSetId = setsData.activeId;

  const createSet = useCallback((name) => {
    setSetsData((prev) => {
      const num = prev.sets.length + 1;
      const id = `set-${Date.now()}`;
      const newSet = { id, name: name || `Set ${num}`, tracks: [] };
      const next = { activeId: id, sets: [...prev.sets, newSet] };
      persistSets(next);
      return next;
    });
  }, [persistSets]);

  const deleteSet = useCallback((setId) => {
    setSetsData((prev) => {
      const remaining = prev.sets.filter(s => s.id !== setId);
      if (remaining.length === 0) {
        const fallback = { activeId: "set-1", sets: [{ id: "set-1", name: "Set 1", tracks: [] }] };
        persistSets(fallback);
        return fallback;
      }
      const activeId = prev.activeId === setId ? remaining[0].id : prev.activeId;
      const next = { activeId, sets: remaining };
      persistSets(next);
      return next;
    });
  }, [persistSets]);

  const renameSet = useCallback((setId, name) => {
    setSetsData((prev) => {
      const next = { ...prev, sets: prev.sets.map(s => s.id === setId ? { ...s, name } : s) };
      persistSets(next);
      return next;
    });
  }, [persistSets]);

  const switchSet = useCallback((setId) => {
    if (setId === "guy-crate") return;
    setSetsData((prev) => {
      const next = { ...prev, activeId: setId };
      persistSets(next);
      return next;
    });
  }, [persistSets]);

  const playTrack = useCallback((track) => {
    setCurrentTrack((cur) => {
      if (cur && cur.id !== track.id) prevTrackRef.current = cur;
      return track;
    });
    setProgress(0);
    setIsPlaying(true);
    if (isDev) return;
    apiFetch("/api/fabric/controls", {
      method: "POST",
      body: JSON.stringify({ action: "play_track", value: { uri: track.uri || `spotify:track:${track.id}` } }),
    });
  }, [isDev, apiFetch]);

  const playPlaylist = useCallback(async (playlistId, startTrackUri) => {
    if (isDev) return;
    await apiFetch("/api/fabric/controls", {
      method: "POST",
      body: JSON.stringify({
        action: "play_context",
        value: {
          context_uri: `spotify:playlist:${playlistId}`,
          ...(startTrackUri ? { offset: { uri: startTrackUri } } : {}),
        },
      }),
    });
    setIsPlaying(true);
  }, [isDev, apiFetch]);

  // Cache for fetched playlist tracks
  const mixTracksCacheRef = useRef({});

  const fetchPlaylistTracks = useCallback(async (playlistId) => {
    if (mixTracksCacheRef.current[playlistId]) return mixTracksCacheRef.current[playlistId];
    if (isDev) return MOCK_TRACKS;
    const data = await apiFetch(`/api/fabric/playlists/${playlistId}/tracks`);
    const tracks = data?.tracks || [];
    mixTracksCacheRef.current[playlistId] = tracks;
    return tracks;
  }, [isDev, apiFetch]);

  // ═══ Published sets (featured mixes) ═══
  const [publishedSets, setPublishedSets] = useState({}); // { setName: crateId }

  // Fetch published sets on mount
  useEffect(() => {
    if (isDev || !accessToken) return;
    apiFetch("/api/fabric/featured").then((data) => {
      if (!data?.crates) return;
      const map = {};
      for (const c of data.crates) {
        if (c.source === "set") map[c.name] = c.id;
      }
      setPublishedSets(map);
    });
  }, [accessToken, isDev, apiFetch]);

  const publishSet = useCallback(async (setId) => {
    const set = setsData.sets.find(s => s.id === setId);
    if (!set || set.tracks.length === 0) return { error: "empty" };
    const res = await apiFetch("/api/fabric/sets/publish", {
      method: "POST",
      body: JSON.stringify({
        name: set.name,
        tracks: set.tracks.map((t, i) => ({
          spotify_id: t.id,
          title: t.title,
          artist: t.artist,
          duration_ms: t.duration_ms || (t.duration ? t.duration * 1000 : 0),
          position: i,
        })),
      }),
    });
    if (res?.crateId) {
      setPublishedSets(prev => ({ ...prev, [set.name]: res.crateId }));
      return { ok: true, crateId: res.crateId };
    }
    return res || { error: "failed" };
  }, [setsData.sets, apiFetch]);

  const unpublishSet = useCallback(async (crateId) => {
    const res = await apiFetch(`/api/fabric/sets/publish?id=${crateId}`, { method: "DELETE" });
    if (res?.ok) {
      setPublishedSets(prev => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(next)) {
          if (v === crateId) delete next[k];
        }
        return next;
      });
    }
    return res;
  }, [apiFetch]);

  // ═══ Record Store Guy (music chat + ticker) ═══
  const [musicMessages, setMusicMessages] = useState([]);
  const [musicChatOpen, setMusicChatOpen] = useState(false);
  const [tickerFact, setTickerFact] = useState(null);
  const [tickerTrackId, setTickerTrackId] = useState(null);
  const [musicStreaming, setMusicStreaming] = useState(false);

  // Fetch ticker fact when track changes
  useEffect(() => {
    if (isDev || !accessToken || !currentTrack?.id) return;
    if (tickerTrackId === currentTrack.id) return;
    setTickerTrackId(currentTrack.id);
    apiFetch("/api/fabric/ticker", {
      method: "POST",
      body: JSON.stringify({
        trackId: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
      }),
    }).then((data) => {
      if (data?.fact) setTickerFact(data.fact);
      else setTickerFact(null);
    }).catch(() => setTickerFact(null));
  }, [currentTrack?.id, accessToken, isDev, apiFetch, tickerTrackId]);

  const sendMusicMessage = useCallback(async (text) => {
    if (!text.trim() || musicStreaming) return;
    const userMsg = { role: "user", content: text.trim() };
    const newMessages = [...musicMessages, userMsg];
    setMusicMessages(newMessages);
    setMusicStreaming(true);

    try {
      const res = await fetch("/api/fabric/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          currentTrack,
          audioFeatures: currentTrack?.id ? audioFeatures[currentTrack.id] : null,
          setTracks: flagged,
        }),
      });

      if (!res.ok) {
        setMusicMessages(prev => [...prev, { role: "assistant", content: "Couldn't reach the back room. Try again." }]);
        setMusicStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const { text: t } = JSON.parse(payload);
            if (t) {
              assistantText += t;
              setMusicMessages(prev => {
                const msgs = [...prev];
                const last = msgs[msgs.length - 1];
                if (last?.role === "assistant" && last._streaming) {
                  msgs[msgs.length - 1] = { role: "assistant", content: assistantText, _streaming: true };
                } else {
                  msgs.push({ role: "assistant", content: assistantText, _streaming: true });
                }
                return msgs;
              });
            }
          } catch {}
        }
      }

      // Finalize — remove streaming flag
      setMusicMessages(prev => {
        const msgs = [...prev];
        const last = msgs[msgs.length - 1];
        if (last?._streaming) {
          msgs[msgs.length - 1] = { role: "assistant", content: last.content };
        }
        return msgs;
      });
    } catch (e) {
      setMusicMessages(prev => [...prev, { role: "assistant", content: "Lost the signal. Try again." }]);
    }
    setMusicStreaming(false);
  }, [musicMessages, musicStreaming, accessToken, currentTrack, audioFeatures, flagged]);

  const toggleMusicChat = useCallback(() => setMusicChatOpen(v => !v), []);

  const formatTime = useCallback((seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  return (
    <FabricContext.Provider
      value={{
        connected,
        statusChecked,
        isPlaying,
        currentTrack,
        queue,
        flagged,
        playlists,
        progress,
        allTracks: isDev ? MOCK_TRACKS : [],
        audioFeatures,
        play,
        pause,
        toggle,
        skip,
        prev,
        flag,
        isFlagged,
        reorderFlagged,
        allSets,
        activeSetId,
        createSet,
        deleteSet,
        renameSet,
        switchSet,
        guyCrate,
        addToGuyCrate,
        removeFromGuyCrate,
        clearGuyCrate,
        playTrack,
        playPlaylist,
        fetchPlaylistTracks,
        setProgress,
        volume,
        setVolume,
        formatTime,
        timeline,
        getSnapshot,
        publishedSets,
        publishSet,
        unpublishSet,
        musicMessages,
        musicChatOpen,
        musicStreaming,
        tickerFact,
        sendMusicMessage,
        toggleMusicChat,
        sdkDeviceId,
        reconnectSpotify,
      }}
    >
      {!isDev && <SpotifyPlayer connected={connected} onDeviceReady={onDeviceReady} onDeviceLost={onDeviceLost} />}
      {children}
    </FabricContext.Provider>
  );
}

export function useFabric() {
  const ctx = useContext(FabricContext);
  if (!ctx) throw new Error("useFabric must be used within FabricProvider");
  return ctx;
}
