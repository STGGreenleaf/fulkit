"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./auth";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(isDev ? MOCK_TRACKS[0] : null);
  const [queue, setQueue] = useState(isDev ? MOCK_TRACKS.slice(1, 5) : []);
  const [flagged, setFlagged] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("fulkit-flagged-tracks");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
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

  // Helper for authenticated API calls
  const apiFetch = useCallback(async (endpoint, options = {}) => {
    if (!accessToken) return null;
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return { ok: true };
    try { return JSON.parse(text); } catch { return { ok: true }; }
  }, [accessToken]);

  // Check connection status
  useEffect(() => {
    if (isDev || !accessToken) return;
    apiFetch("/api/fabric/status").then((data) => {
      if (data) setConnected(data.connected);
    });
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

    const fetchNowPlaying = async () => {
      const data = await apiFetch("/api/fabric/now-playing");
      if (!data) return;
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
    sendControl("previous");
  }, [isDev, sendControl]);

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

  // Fetch Fabric timeline when a new track starts playing
  useEffect(() => {
    if (isDev || !connected || !accessToken || !currentTrack?.id) return;
    if (timelineRequested.current.has(currentTrack.id)) return;
    timelineRequested.current.add(currentTrack.id);

    apiFetch(`/api/fabric/timeline?id=${currentTrack.id}`).then((data) => {
      if (data?.status === "complete" && data.timeline) {
        setTimeline(data.timeline);
        setTimelineResolution(data.resolution_ms || 500);
      } else {
        setTimeline(null); // fallback to procedural
      }
    }).catch(() => setTimeline(null));
  }, [currentTrack?.id, connected, accessToken, isDev, apiFetch]);

  // Re-fetch timeline on track change
  useEffect(() => {
    setTimeline(null);
  }, [currentTrack?.id]);

  // Snapshot interpolator: progress → current snapshot data
  const getSnapshot = useCallback((progressFraction) => {
    if (!timeline || timeline.length === 0) return null;
    const totalDuration = timeline[timeline.length - 1].t;
    const currentTime = progressFraction * totalDuration;
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
  }, [timeline]);

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
    setFlagged((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      try { localStorage.setItem("fulkit-flagged-tracks", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const flag = useCallback((track) => {
    setFlagged((prev) => {
      const next = prev.some((t) => t.id === track.id)
        ? prev.filter((t) => t.id !== track.id)
        : [...prev, track];
      try { localStorage.setItem("fulkit-flagged-tracks", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isFlagged = useCallback(
    (trackId) => flagged.some((t) => t.id === trackId),
    [flagged]
  );

  const playTrack = useCallback((track) => {
    setCurrentTrack(track);
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

  const formatTime = useCallback((seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  return (
    <FabricContext.Provider
      value={{
        connected,
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
        playTrack,
        playPlaylist,
        fetchPlaylistTracks,
        setProgress,
        volume,
        setVolume,
        formatTime,
        timeline,
        getSnapshot,
      }}
    >
      {children}
    </FabricContext.Provider>
  );
}

export function useFabric() {
  const ctx = useContext(FabricContext);
  if (!ctx) throw new Error("useFabric must be used within FabricProvider");
  return ctx;
}
