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

// --- Taste Signal Utilities ---
function normalizeForMatch(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/[\u2018\u2019\u201C\u201D]/g, "'").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}
function fuzzyMatch(a, b) {
  if (!a || !b) return false;
  const na = normalizeForMatch(a), nb = normalizeForMatch(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  return longer.startsWith(shorter) && shorter.length / longer.length > 0.7;
}
function computeScore(entry) {
  const ageWeeks = (Date.now() - (entry.addedAt || Date.now())) / 604800000;
  const decay = Math.max(0.3, 1 - ageWeeks * 0.02);
  let raw = 0;
  if (entry.kept) raw += 2;
  if (entry.adopted) raw += 3;
  if (!entry.kept && entry.removedAt) raw -= 1.5;
  raw += Math.min(entry.playCount || 0, 5) * 1.5;
  raw += Math.min(entry.totalListenPct || 0, 5) * 0.5;
  raw -= Math.min(entry.skipCount || 0, 3) * 2;
  return Math.round(raw * decay * 10) / 10;
}
function makeHistoryDefaults() {
  return { addedAt: Date.now(), kept: true, removedAt: null, adopted: false, adoptedTo: null, playCount: 0, totalListenPct: 0, lastPlayedAt: null, skipCount: 0, score: 0 };
}

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
  const flagAdoptionRef = useRef(null); // deferred adoption signal from flag()
  const playbackContextRef = useRef(null); // { type, id, tracks, currentIndex }
  const autoAdvanceTriggered = useRef(false);
  const autoAdvanceRef = useRef(null); // ref to avoid temporal dead zone (skip defined before autoAdvance)
  const playTrackRef = useRef(null); // same — skip defined before playTrack
  // Refs for taste signal functions (used by skip/poller which are declared before the history block)
  const findHistoryMatchRef = useRef(null);
  const updateHistorySignalRef = useRef(null);

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

  // Poll suppression — prevent poller from overwriting optimistic UI after play commands
  const pollSuppressedUntil = useRef(0);
  const playInFlightRef = useRef(null);

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
      // Skip state updates while suppressed (after play commands)
      if (Date.now() < pollSuppressedUntil.current) return;
      setIsPlaying(data.isPlaying);
      if (data.volume != null && Date.now() > volumeLockedUntil.current) setVolumeState(data.volume);
      if (data.track) {
        setCurrentTrack((prev) => {
          // Track changed — finalize previous play session, start new one
          if (!prev || prev.id !== data.track.id) {
            if (playSessionRef.current.trackId && findHistoryMatchRef.current) {
              const pct = playSessionRef.current.maxProgress;
              const match = findHistoryMatchRef.current(playSessionRef.current.trackId, prev?.title, prev?.artist);
              if (match && updateHistorySignalRef.current) updateHistorySignalRef.current(match.id, {
                playCount: (match.playCount || 0) + 1,
                totalListenPct: (match.totalListenPct || 0) + pct,
                lastPlayedAt: Date.now(),
              });
            }
            playSessionRef.current = { trackId: data.track.id, maxProgress: data.track.progress || 0 };
            return data.track;
          }
          // Same track — update max progress
          playSessionRef.current.maxProgress = Math.max(playSessionRef.current.maxProgress, data.track.progress || 0);
          return { ...prev, progress: data.track.progress, progressMs: data.track.progressMs };
        });
        setProgress(data.track.progress);
      } else {
        setCurrentTrack(null);
        setProgress(0);
      }

      // Auto-advance: when Spotify stops after track finishes, play next in context
      if (!data.isPlaying && data.track && data.track.progress > 0.95 && playbackContextRef.current) {
        if (!autoAdvanceTriggered.current) {
          autoAdvanceTriggered.current = true;
          autoAdvanceRef.current?.();
        }
      } else if (data.isPlaying) {
        autoAdvanceTriggered.current = false;
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
    // Record skip signal if early (<50% through) and matches a BTC rec
    if (progress < 0.5 && currentTrack && findHistoryMatchRef.current) {
      const match = findHistoryMatchRef.current(currentTrack.id, currentTrack.title, currentTrack.artist);
      if (match && updateHistorySignalRef.current) updateHistorySignalRef.current(match.id, { skipCount: (match.skipCount || 0) + 1 });
    }
    // Finalize play session
    if (playSessionRef.current.trackId && findHistoryMatchRef.current) {
      const match = findHistoryMatchRef.current(playSessionRef.current.trackId, currentTrack?.title, currentTrack?.artist);
      if (match && updateHistorySignalRef.current) updateHistorySignalRef.current(match.id, {
        playCount: (match.playCount || 0) + 1,
        totalListenPct: (match.totalListenPct || 0) + playSessionRef.current.maxProgress,
        lastPlayedAt: Date.now(),
      });
      playSessionRef.current = { trackId: null, maxProgress: 0 };
    }
    // Context-aware skip: advance within current context instead of Spotify's queue
    const ctx = playbackContextRef.current;
    if (ctx?.tracks && ctx.currentIndex < ctx.tracks.length - 1) {
      ctx.currentIndex++;
      playTrackRef.current?.(ctx.tracks[ctx.currentIndex]);
    } else if (ctx && autoAdvanceRef.current) {
      autoAdvanceRef.current();
    } else {
      sendControl("next");
    }
  }, [isDev, queue, sendControl, progress, currentTrack]);

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
      const activeSet = prev.sets.find(s => s.id === prev.activeId);
      const wasInSet = activeSet?.tracks.some(t => t.id === track.id);
      const next = { ...prev, sets: prev.sets.map(s => {
        if (s.id !== prev.activeId) return s;
        return { ...s, tracks: wasInSet ? s.tracks.filter(t => t.id !== track.id) : [...s.tracks, track] };
      })};
      persistSets(next);
      // Mark adoption via ref (history state declared below, accessed via flagAdoptionRef)
      if (!wasInSet && activeSet) flagAdoptionRef.current = { trackId: track.id, setName: activeSet.name };
      return next;
    });
  }, [persistSets]);

  const isFlagged = useCallback(
    (trackId) => flagged.some((t) => t.id === trackId),
    [flagged]
  );

  // Guy's Crate — auto-populated by BTC recommendations
  const guyCrate = setsData.sets.find(s => s.id === "guy-crate") || null;


  // Shadow history — every track Guy ever recommended, with taste signals
  const [guyHistory, setGuyHistory] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = JSON.parse(localStorage.getItem("fulkit-guy-history") || "[]");
      const version = localStorage.getItem("fulkit-guy-history-version");
      if (version === "2") return raw;
      // Migrate v1 → v2
      const now = Date.now();
      const guyCrateIds = new Set();
      try {
        const sets = JSON.parse(localStorage.getItem("fulkit-sets") || "{}");
        const gc = (sets.sets || []).find(s => s.id === "guy-crate");
        if (gc) gc.tracks.forEach(t => guyCrateIds.add(t.id));
      } catch {}
      const migrated = raw.map((entry, i) => ({
        ...entry,
        addedAt: now - (raw.length - i) * 60000,
        kept: guyCrateIds.has(entry.id),
        removedAt: guyCrateIds.has(entry.id) ? null : now,
        adopted: false, adoptedTo: null,
        playCount: 0, totalListenPct: 0, lastPlayedAt: null, skipCount: 0,
        score: guyCrateIds.has(entry.id) ? 2 : -0.5,
      }));
      localStorage.setItem("fulkit-guy-history", JSON.stringify(migrated));
      localStorage.setItem("fulkit-guy-history-version", "2");
      return migrated;
    } catch { return []; }
  });

  const persistHistory = useCallback((history) => {
    try { localStorage.setItem("fulkit-guy-history", JSON.stringify(history)); } catch {}
  }, []);

  const findHistoryMatch = useCallback((spotifyId, title, artist) => {
    return guyHistory.find(h => h.id === spotifyId) ||
      (title && artist ? guyHistory.find(h => fuzzyMatch(h.artist, artist) && fuzzyMatch(h.title, title)) : null) ||
      null;
  }, [guyHistory]);

  const updateHistorySignal = useCallback((trackId, updates) => {
    setGuyHistory((prev) => {
      const idx = prev.findIndex(h => h.id === trackId);
      if (idx === -1) return prev;
      const entry = { ...prev[idx], ...updates };
      entry.score = computeScore(entry);
      const next = [...prev];
      next[idx] = entry;
      persistHistory(next);
      return next;
    });
  }, [persistHistory]);

  // Keep refs in sync for skip/poller (declared before history block)
  findHistoryMatchRef.current = findHistoryMatch;
  updateHistorySignalRef.current = updateHistorySignal;

  const appendToHistory = useCallback((track) => {
    setGuyHistory((prev) => {
      if (prev.some(t => t.id === track.id)) return prev;
      const entry = { id: track.id, title: track.title, artist: track.artist, ...makeHistoryDefaults(), addedAt: Date.now() };
      let next = [...prev, entry];
      // Cap at 500 — prune lowest-scored removed entries
      if (next.length > 500) {
        const now = Date.now();
        const thirtyDays = 30 * 86400000;
        next.sort((a, b) => {
          const aProt = (a.score > 3 || a.adopted || (now - (a.addedAt || 0)) < thirtyDays) ? 1 : 0;
          const bProt = (b.score > 3 || b.adopted || (now - (b.addedAt || 0)) < thirtyDays) ? 1 : 0;
          if (aProt !== bProt) return aProt - bProt;
          return (a.score || 0) - (b.score || 0);
        });
        next = next.slice(next.length - 500);
      }
      persistHistory(next);
      return next;
    });
  }, [persistHistory]);

  // Process deferred adoption signal from flag()
  useEffect(() => {
    const pending = flagAdoptionRef.current;
    if (!pending) return;
    flagAdoptionRef.current = null;
    const match = guyHistory.find(h => h.id === pending.trackId);
    if (match) updateHistorySignal(pending.trackId, { adopted: true, adoptedTo: pending.setName });
  }, [setsData, guyHistory, updateHistorySignal]);

  // Play session tracking for listen signals
  const playSessionRef = useRef({ trackId: null, maxProgress: 0 });

  const addToGuyCrate = useCallback((track) => {
    appendToHistory(track);
    setSetsData((prev) => {
      let gc = prev.sets.find(s => s.id === "guy-crate");
      if (!gc) {
        gc = { id: "guy-crate", name: "Guy's Crate", source: "guy", tracks: [] };
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
    updateHistorySignal(trackId, { kept: false, removedAt: Date.now() });
    setSetsData((prev) => {
      const next = { ...prev, sets: prev.sets.map(s =>
        s.id === "guy-crate" ? { ...s, tracks: s.tracks.filter(t => t.id !== trackId) } : s
      )};
      persistSets(next);
      return next;
    });
  }, [persistSets, updateHistorySignal]);

  const clearGuyCrate = useCallback(() => {
    const gc = setsData.sets.find(s => s.id === "guy-crate");
    if (gc) {
      const now = Date.now();
      gc.tracks.forEach(t => updateHistorySignal(t.id, { kept: false, removedAt: now }));
    }
    setSetsData((prev) => {
      const next = { ...prev, sets: prev.sets.filter(s => s.id !== "guy-crate") };
      persistSets(next);
      return next;
    });
  }, [persistSets, setsData.sets, updateHistorySignal]);

  // Multi-set CRUD
  const allSets = setsData.sets.filter(s => s.source !== "guy").map(s => ({ id: s.id, name: s.name, trackCount: s.tracks.length }));
  const activeSetId = setsData.activeId;

  const createSet = useCallback((name) => {
    setSetsData((prev) => {
      const id = `set-${Date.now()}`;
      const newSet = { id, name: name || `Set ${prev.sets.filter(s => s.source !== "guy").length + 1}`, tracks: [] };
      const userSets = prev.sets.filter(s => s.source !== "guy");
      const guySets = prev.sets.filter(s => s.source === "guy");
      const next = { activeId: id, sets: [newSet, ...userSets, ...guySets] };
      persistSets(next);
      return next;
    });
  }, [persistSets]);

  const saveGuyCrateAsSet = useCallback((name) => {
    setSetsData((prev) => {
      const gc = prev.sets.find(s => s.id === "guy-crate");
      if (!gc || gc.tracks.length === 0) return prev;
      const id = `set-${Date.now()}`;
      const newSet = { id, name: name || `B-Sides ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, tracks: [...gc.tracks] };
      const userSets = prev.sets.filter(s => s.source !== "guy");
      const guySets = prev.sets.filter(s => s.source === "guy");
      const next = { activeId: id, sets: [newSet, ...userSets, ...guySets] };
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

  const playTrack = useCallback(async (track) => {
    const requestId = Date.now();
    playInFlightRef.current = requestId;

    setCurrentTrack((cur) => {
      if (cur && cur.id !== track.id) prevTrackRef.current = cur;
      return track;
    });
    setProgress(0);
    setIsPlaying(true);
    pollSuppressedUntil.current = Date.now() + 5000;
    if (isDev) return;

    // BTC tracks need Spotify resolution (synthetic IDs like btc-artist-title)
    let uri = track.uri || (track.id.startsWith("btc-") ? null : `spotify:track:${track.id}`);
    if (!uri && track.artist && track.title) {
      try {
        const data = await apiFetch(`/api/fabric/search?q=${encodeURIComponent(`${track.artist} ${track.title}`)}&type=track`);
        if (playInFlightRef.current !== requestId) return; // superseded by newer click
        if (data?.tracks?.[0]) {
          uri = data.tracks[0].uri;
          // Cache so we don't search again
          track.uri = uri;
          if (data.tracks[0].spotify_id) track.id = data.tracks[0].spotify_id;
        }
      } catch {}
    }
    if (!uri) return;
    if (playInFlightRef.current !== requestId) return; // superseded

    const result = await apiFetch("/api/fabric/controls", {
      method: "POST",
      body: JSON.stringify({ action: "play_track", value: { uri } }),
    });
    if (!result?.ok) console.warn("[fabric] play_track failed:", result);
  }, [isDev, apiFetch]);
  playTrackRef.current = playTrack;

  // Play a track with context for auto-continue
  const playTrackInContext = useCallback(async (track, contextType, contextId, trackList, trackIndex) => {
    playbackContextRef.current = {
      type: contextType,
      id: contextId,
      tracks: trackList,
      currentIndex: trackIndex,
    };
    await playTrack(track);
  }, [playTrack]);

  // Auto-advance to next track when current finishes
  const autoAdvance = useCallback(() => {
    const ctx = playbackContextRef.current;
    if (!ctx?.tracks?.length) return;

    const nextIndex = ctx.currentIndex + 1;

    // Next track in current context
    if (nextIndex < ctx.tracks.length) {
      ctx.currentIndex = nextIndex;
      playTrack(ctx.tracks[nextIndex]);
      return;
    }

    // Context exhausted — try next set
    const userSets = setsData.sets.filter(s => s.source !== "guy" && s.tracks.length > 0);
    if (ctx.type === "set") {
      const setIdx = userSets.findIndex(s => s.id === ctx.id);
      if (setIdx >= 0 && setIdx < userSets.length - 1) {
        const nextSet = userSets[setIdx + 1];
        playbackContextRef.current = { type: "set", id: nextSet.id, tracks: nextSet.tracks, currentIndex: 0 };
        playTrack(nextSet.tracks[0]);
        return;
      }
    }

    // Fallback: first user set (if not already at it)
    if (userSets.length > 0 && (ctx.type !== "set" || ctx.id !== userSets[0].id)) {
      playbackContextRef.current = { type: "set", id: userSets[0].id, tracks: userSets[0].tracks, currentIndex: 0 };
      playTrack(userSets[0].tracks[0]);
      return;
    }

    // Final fallback: B-Sides crate
    const gc = setsData.sets.find(s => s.id === "guy-crate");
    if (gc && gc.tracks.length > 0 && ctx.type !== "bsides") {
      playbackContextRef.current = { type: "bsides", id: "guy-crate", tracks: gc.tracks, currentIndex: 0 };
      playTrack(gc.tracks[0]);
    }
  }, [setsData.sets, playTrack]);
  autoAdvanceRef.current = autoAdvance;

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

  // Build taste summary for the API (computed per message, not stored)
  const buildTasteSummary = useCallback(() => {
    if (!guyHistory.length) return null;
    const scored = guyHistory.map(e => ({ ...e, score: e.score ?? computeScore(e) })).sort((a, b) => b.score - a.score);
    const favorites = scored.filter(e => e.score > 3).slice(0, 8).map(e => ({ artist: e.artist, title: e.title, score: e.score }));
    const passes = scored.filter(e => e.score < 0).slice(-5).map(e => ({ artist: e.artist, title: e.title }));
    // Artist tendencies
    const artistMap = {};
    for (const e of scored) {
      if (!artistMap[e.artist]) artistMap[e.artist] = { total: 0, count: 0 };
      artistMap[e.artist].total += e.score;
      artistMap[e.artist].count++;
    }
    const likedArtists = Object.entries(artistMap).filter(([, v]) => v.count >= 2 && v.total / v.count > 2).sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count).slice(0, 5).map(([a]) => a);
    const dislikedArtists = Object.entries(artistMap).filter(([, v]) => v.count >= 2 && v.total / v.count < -1).slice(0, 3).map(([a]) => a);
    // Set names + adoption patterns
    const setNames = setsData.sets.filter(s => s.source !== "guy" && s.tracks.length > 0).map(s => s.name);
    const adoptionPatterns = {};
    for (const e of scored) {
      if (e.adopted && e.adoptedTo) {
        if (!adoptionPatterns[e.adoptedTo]) adoptionPatterns[e.adoptedTo] = [];
        adoptionPatterns[e.adoptedTo].push(`${e.artist} - ${e.title}`);
      }
    }
    return { favorites, passes, likedArtists, dislikedArtists, setNames, adoptionPatterns };
  }, [guyHistory, setsData.sets]);

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
          bsidesTracks: guyCrate?.tracks || [],
          tasteSummary: buildTasteSummary(),
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
  }, [musicMessages, musicStreaming, accessToken, currentTrack, audioFeatures, flagged, buildTasteSummary, guyCrate]);

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
        saveGuyCrateAsSet,
        addToGuyCrate,
        removeFromGuyCrate,
        clearGuyCrate,
        playTrack,
        playTrackInContext,
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
        reconnectSpotify,
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
