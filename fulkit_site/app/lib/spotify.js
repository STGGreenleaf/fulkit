"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./auth";

const SpotifyContext = createContext(null);

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
  "1": { bpm: 105, key: "Am", energy: 78, danceability: 62, valence: 45 },
  "2": { bpm: 98, key: "Fm", energy: 65, danceability: 71, valence: 58 },
  "3": { bpm: 112, key: "C", energy: 42, danceability: 55, valence: 38 },
  "4": { bpm: 120, key: "Dm", energy: 35, danceability: 48, valence: 30 },
  "5": { bpm: 130, key: "Eb", energy: 55, danceability: 60, valence: 25 },
  "6": { bpm: 138, key: "Em", energy: 88, danceability: 45, valence: 35 },
  "7": { bpm: 100, key: "G", energy: 50, danceability: 65, valence: 70 },
  "8": { bpm: 92, key: "D", energy: 38, danceability: 52, valence: 72 },
};

export function SpotifyProvider({ children }) {
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
  const [volume, setVolumeState] = useState(50);
  const [audioFeatures, setAudioFeatures] = useState(isDev ? MOCK_FEATURES : {});
  const pollRef = useRef(null);
  const volumeTimer = useRef(null);
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
    return res.json();
  }, [accessToken]);

  // Check connection status
  useEffect(() => {
    if (isDev || !accessToken) return;
    apiFetch("/api/spotify/status").then((data) => {
      if (data) setConnected(data.connected);
    });
  }, [accessToken, isDev, apiFetch]);

  // Fetch playlists when connected
  useEffect(() => {
    if (isDev || !connected || !accessToken) return;
    apiFetch("/api/spotify/playlists").then((data) => {
      if (data?.playlists) setPlaylists(data.playlists);
    });
  }, [connected, accessToken, isDev, apiFetch]);

  // Poll now playing every 4s when connected
  useEffect(() => {
    if (isDev || !connected || !accessToken) return;

    const fetchNowPlaying = async () => {
      const data = await apiFetch("/api/spotify/now-playing");
      if (!data) return;
      setIsPlaying(data.isPlaying);
      if (data.volume != null) setVolumeState(data.volume);
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
    await apiFetch("/api/spotify/controls", {
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
    if (isDev) return;
    clearTimeout(volumeTimer.current);
    volumeTimer.current = setTimeout(() => {
      apiFetch("/api/spotify/controls", {
        method: "POST",
        body: JSON.stringify({ action: "volume", value: v }),
      });
    }, 200);
  }, [isDev, apiFetch]);

  // Fetch audio features for tracks we haven't fetched yet
  // Note: Spotify deprecated /audio-features for Dev Mode apps (Nov 2024).
  // This will gracefully return empty until the app is in Extended Quota Mode.
  const featuresFailed = useRef(false);
  useEffect(() => {
    if (isDev || !connected || !accessToken || featuresFailed.current) return;
    const ids = [];
    if (currentTrack?.id && !audioFeatures[currentTrack.id] && !featuresRequested.current.has(currentTrack.id)) {
      ids.push(currentTrack.id);
    }
    for (const t of flagged) {
      if (!audioFeatures[t.id] && !featuresRequested.current.has(t.id)) ids.push(t.id);
    }
    if (ids.length === 0) return;
    ids.forEach((id) => featuresRequested.current.add(id));
    apiFetch(`/api/spotify/audio-features?ids=${ids.join(",")}`).then((data) => {
      if (data?.features && Object.keys(data.features).length > 0) {
        setAudioFeatures((prev) => ({ ...prev, ...data.features }));
      } else {
        // Endpoint likely deprecated — stop retrying
        featuresFailed.current = true;
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
  }, []);

  const formatTime = useCallback((seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  return (
    <SpotifyContext.Provider
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
        setProgress,
        volume,
        setVolume,
        formatTime,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify() {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error("useSpotify must be used within SpotifyProvider");
  return ctx;
}
