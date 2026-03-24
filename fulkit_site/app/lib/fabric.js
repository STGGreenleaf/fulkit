"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth";
import PlaybackEngine from "../components/PlaybackEngine";

const FabricContext = createContext(null);

// Fetch real album art — iTunes first, MusicBrainz fallback
async function fetchAlbumArt(artist, title) {
  if (!artist || !title) return null;
  // 1. iTunes Search API
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.results?.[0]?.artworkUrl100) {
        return data.results[0].artworkUrl100.replace("100x100", "600x600");
      }
    }
  } catch {}
  // 2. MusicBrainz + Cover Art Archive
  try {
    const q = encodeURIComponent(`recording:"${title}" AND artist:"${artist}"`);
    const res = await fetch(`https://musicbrainz.org/ws/2/recording/?query=${q}&limit=1&fmt=json`, {
      headers: { "User-Agent": "Fulkit/1.0 (https://fulkit.app)" },
    });
    if (res.ok) {
      const data = await res.json();
      const releaseId = data.recordings?.[0]?.releases?.[0]?.id;
      if (releaseId) {
        return `https://coverartarchive.org/release/${releaseId}/front-250`;
      }
    }
  } catch {}
  return null;
}

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
// ═══ Camelot Key Compatibility ═══
const CAMELOT = {
  "Ab": "1B", "Abm": "1A", "G#m": "1A",
  "Eb": "2B", "Ebm": "2A", "Cm": "2A",
  "Bb": "3B", "Bbm": "3A", "Gm": "3A",
  "F": "4B", "Fm": "4A", "Dm": "4A",
  "C": "5B", "C#m": "5A", "Am": "5A",
  "G": "6B", "Gm": "6A", "Em": "6A",
  "D": "7B", "D#m": "7A", "Bm": "7A",
  "A": "8B", "A#m": "8A", "F#m": "8A",
  "E": "9B", "E#m": "9A", "C#m": "9A",
  "B": "10B", "B#m": "10A", "G#m": "10A",
  "F#": "11B", "F#m": "11A", "D#m": "11A",
  "Db": "12B", "Dbm": "12A", "Bbm": "12A",
};

function camelotCompatible(keyA, keyB) {
  if (!keyA || !keyB) return true; // no data = no penalty
  const a = CAMELOT[keyA], b = CAMELOT[keyB];
  if (!a || !b) return true;
  const numA = parseInt(a), numB = parseInt(b);
  const modeA = a.slice(-1), modeB = b.slice(-1);
  if (a === b) return true; // same key
  if (numA === numB) return true; // same number (A↔B)
  if (modeA === modeB && (Math.abs(numA - numB) === 1 || Math.abs(numA - numB) === 11)) return true; // ±1
  return false;
}

// ═══ Arc Sort — Three-Act Energy Sequencing ═══
function sortByArc(tracks, features) {
  if (!tracks || tracks.length === 0) return tracks;
  // Short lists: just sort by energy (low → high → low)
  if (tracks.length <= 3) {
    const withEnergy = tracks.map(t => ({ t, e: features[t.id]?.energy ?? 50 }));
    withEnergy.sort((a, b) => a.e - b.e);
    if (withEnergy.length === 3) {
      // low, high, medium — simple arc
      return [withEnergy[0].t, withEnergy[2].t, withEnergy[1].t];
    }
    return withEnergy.map(x => x.t);
  }

  // Build target energy curve: intro → build → peak (with valley) → cool → close
  const n = tracks.length;
  const targets = [];
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1); // 0 to 1
    let target;
    if (p < 0.15) target = 35 + p / 0.15 * 15; // intro: 35→50
    else if (p < 0.35) target = 50 + (p - 0.15) / 0.2 * 30; // build: 50→80
    else if (p < 0.5) target = 80 + (p - 0.35) / 0.15 * 20; // peak 1: 80→100
    else if (p < 0.55) target = 100 - (p - 0.5) / 0.05 * 30; // valley: 100→70
    else if (p < 0.7) target = 70 + (p - 0.55) / 0.15 * 30; // peak 2: 70→100
    else if (p < 0.9) target = 100 - (p - 0.7) / 0.2 * 60; // cool: 100→40
    else target = 40 - (p - 0.9) / 0.1 * 10; // close: 40→30
    targets.push(target);
  }

  // Score each track for each slot, pick best assignment
  const available = tracks.map((t, i) => ({
    track: t,
    energy: features[t.id]?.energy ?? 50,
    bpm: features[t.id]?.bpm ?? 120,
    key: features[t.id]?.key ?? null,
    valence: features[t.id]?.valence ?? 50,
    hasFeatures: !!features[t.id],
    origIndex: i,
  }));

  // Greedy assignment: for each slot, pick the best remaining track
  const sorted = [];
  const used = new Set();

  for (let slot = 0; slot < n; slot++) {
    let bestIdx = -1;
    let bestScore = Infinity;

    for (let j = 0; j < available.length; j++) {
      if (used.has(j)) continue;
      const t = available[j];

      // Tracks without features go to the end
      if (!t.hasFeatures) {
        if (bestIdx === -1) bestIdx = j;
        continue;
      }

      // Energy distance to target (primary)
      let score = Math.abs(t.energy - targets[slot]) * 3;

      // BPM smoothness with previous track
      if (sorted.length > 0) {
        const prev = available[sorted[sorted.length - 1]];
        const bpmDiff = Math.abs(t.bpm - prev.bpm);
        if (bpmDiff > 15) score += bpmDiff * 0.5;
        else if (bpmDiff > 10) score += bpmDiff * 0.2;

        // Key compatibility
        if (!camelotCompatible(t.key, prev.key)) score += 20;

        // Valence clustering (avoid mood whiplash)
        score += Math.abs(t.valence - prev.valence) * 0.1;
      }

      // Opener preference: medium energy, not too fast
      if (slot === 0) {
        if (t.energy > 70) score += 15;
        if (t.bpm > 140) score += 10;
      }

      // Closer preference: lower energy, memorable (not weakest)
      if (slot === n - 1) {
        if (t.energy > 60) score += 15;
        if (t.energy < 15) score += 10; // not the weakest either
      }

      if (score < bestScore) {
        bestScore = score;
        bestIdx = j;
      }
    }

    if (bestIdx >= 0) {
      sorted.push(bestIdx);
      used.add(bestIdx);
    }
  }

  return sorted.map(i => available[i].track);
}

function computeScore(entry) {
  const ageWeeks = (Date.now() - (entry.addedAt || Date.now())) / 604800000;
  const decay = Math.max(0.3, 1 - ageWeeks * 0.02);
  let raw = 0;
  if (entry.adopted) raw += 3;        // added to a set — strong positive
  if (entry.liked) raw += 2;          // explicit like — positive taste signal
  raw += Math.min(entry.playCount || 0, 5) * 1.5;  // passive positive (listened)
  raw += Math.min(entry.totalListenPct || 0, 5) * 0.5;
  if (entry.thumbedDown) raw -= 10;   // permanent negative — never again
  // Skip and remove are neutral — no penalty
  return Math.round(raw * decay * 10) / 10;
}
function makeHistoryDefaults() {
  return { addedAt: Date.now(), kept: true, removedAt: null, adopted: false, adoptedTo: null, playCount: 0, totalListenPct: 0, lastPlayedAt: null, skipCount: 0, score: 0 };
}

// URI helpers — build provider-specific URIs from track data
function makeTrackUri(id, provider = "spotify") {
  if (provider === "spotify") return `spotify:track:${id}`;
  return null;
}

function makePlaylistUri(id, provider = "spotify") {
  if (provider === "spotify") return `spotify:playlist:${id}`;
  return null;
}

export function FabricProvider({ children }) {
  const { user, accessToken } = useAuth();
  const pathname = usePathname();
  const onFabricPage = pathname === "/fabric" || pathname === "/fabricproto";

  const [connected, setConnected] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState({});
  const connectedProvidersRef = useRef({});
  useEffect(() => { connectedProvidersRef.current = connectedProviders; }, [connectedProviders]);
  const [statusChecked, setStatusChecked] = useState(false);

  // ── Thumbs Down (permanent rejection) ──
  const [thumbsDownSet, setThumbsDownSet] = useState(new Set());
  const thumbsDownRef = useRef(new Set());
  useEffect(() => { thumbsDownRef.current = thumbsDownSet; }, [thumbsDownSet]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  // Seed data — one empty set for truly fresh installs. Users create their own.
  const SEED_SETS = {
    activeId: "set-1",
    sets: [
      {
        id: "set-1",
        name: "My Set",
        tracks: [],
      },
    ],
  };

  // Multi-set state (migrates from old single-set format, seeds if empty)
  const [setsData, setSetsData] = useState(() => {
    if (typeof window === "undefined") return SEED_SETS;
    try {
      const newFormat = localStorage.getItem("fulkit-sets");
      if (newFormat) {
        const parsed = JSON.parse(newFormat);
        // Patch: backfill missing provider field on tracks (YouTube regression fix)
        let patched = false;
        for (const s of parsed.sets || []) {
          for (const t of s.tracks || []) {
            if (!t.provider) {
              // Spotify IDs are 22-char base62; everything else is YouTube
              t.provider = /^[A-Za-z0-9]{22}$/.test(t.id) ? "spotify" : "youtube";
              patched = true;
            }
          }
        }
        if (patched) localStorage.setItem("fulkit-sets", JSON.stringify(parsed));
        return parsed;
      }
      // Migrate old format
      const oldTracks = localStorage.getItem("fulkit-flagged-tracks");
      if (oldTracks) {
        const tracks = JSON.parse(oldTracks);
        const migrated = { activeId: "set-1", sets: [{ id: "set-1", name: "Set 1", tracks }] };
        localStorage.setItem("fulkit-sets", JSON.stringify(migrated));
        localStorage.removeItem("fulkit-flagged-tracks");
        return migrated;
      }
      // Fresh install — seed with starter sets
      localStorage.setItem("fulkit-sets", JSON.stringify(SEED_SETS));
      return SEED_SETS;
    } catch { return SEED_SETS; }
  });

  // Persist sets to localStorage
  const persistSets = useCallback((data) => {
    try { localStorage.setItem("fulkit-sets", JSON.stringify(data)); } catch {}
  }, []);

  // Derived: active set's tracks (backwards-compatible with old `flagged`)
  const activeSet = setsData.sets.find(s => s.id === setsData.activeId) || setsData.sets[0];
  const flagged = activeSet?.tracks || [];
  const [playlists, setPlaylists] = useState([]);
  const [progress, setProgress] = useState(0);
  const [volume, setVolumeState] = useState(50);
  const [audioFeatures, setAudioFeatures] = useState({});
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
  const featuredCratesRef = useRef([]); // populated by page.js for autoAdvance fallback
  const autoAdvanceTriggered = useRef(false);
  const autoAdvanceTriggeredAt = useRef(0);
  const autoAdvanceRef = useRef(null); // ref to avoid temporal dead zone (skip defined before autoAdvance)
  const lastPollState = useRef({ isPlaying: false, trackId: null, progress: 0 });
  const queuedNextRef = useRef(null); // URI of pre-queued next track
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

  // Reconnect: redirect to provider OAuth
  const reconnect = useCallback((providerName = "spotify") => {
    if (!accessToken) return;
    window.location.href = `/api/fabric/connect?token=${accessToken}&provider=${providerName}`;
  }, [accessToken]);
  // Backward compat alias
  const reconnectSpotify = reconnect;

  // Check connection status
  useEffect(() => {
    if (!accessToken) return;
    apiFetch("/api/fabric/status").then((data) => {
      if (data) {
        // YouTube is always available — no OAuth needed
        const providers = { youtube: true, ...(data.providers || {}) };
        setConnected(data.connected || true); // At least YouTube is always connected
        setConnectedProviders(providers);
      } else {
        // Even without API response, YouTube works
        setConnected(true);
        setConnectedProviders({ youtube: true });
      }
      setStatusChecked(true);
    }).catch(() => {
      setConnected(true);
      setConnectedProviders({ youtube: true });
      setStatusChecked(true);
    });
  }, [accessToken, apiFetch]);

  // Load thumbs-down list from Supabase
  useEffect(() => {
    if (!accessToken) return;
    apiFetch("/api/fabric/thumbsdown").then((data) => {
      if (Array.isArray(data)) {
        const keys = new Set(data.map(d => d.track_key));
        setThumbsDownSet(keys);
      }
    }).catch(() => {});
  }, [accessToken, apiFetch]);

  // Fetch playlists from Supabase (works regardless of source connection)
  useEffect(() => {
    if (!accessToken || !onFabricPage) return;
    apiFetch("/api/fabric/playlists").then((data) => {
      if (data?.playlists) setPlaylists(data.playlists);
    });
  }, [accessToken, apiFetch, onFabricPage]);

  // Bulk-resolve unresolved tracks on Fabric page load — precache YouTube IDs
  const bulkResolveRan = useRef(false);
  useEffect(() => {
    if (!accessToken || !onFabricPage || bulkResolveRan.current) return;
    bulkResolveRan.current = true;
    // Collect all tracks without a ytId that need resolution
    const unresolved = [];
    for (const s of setsData.sets || []) {
      for (const t of s.tracks || []) {
        if (t.ytId) continue; // already resolved
        if (/^[A-Za-z0-9_-]{10,12}$/.test(t.id)) continue; // already a real YT ID
        if (t.title) unresolved.push(t.id);
      }
    }
    if (!unresolved.length) return;
    console.log(`[fabric] Precaching ${unresolved.length} track(s)...`);
    // Stagger resolves — 500ms apart to avoid hammering API
    unresolved.forEach((trackId, i) => {
      setTimeout(() => resolveYouTubeId(trackId), i * 500);
    });
  }, [accessToken, onFabricPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Playback resume after refresh ──
  // Save state on beforeunload, restore on mount
  useEffect(() => {
    const save = () => {
      const track = currentTrack;
      if (!track || track.provider === "spotify") return; // Spotify app handles its own resume
      try {
        localStorage.setItem("fulkit-playback-resume", JSON.stringify({
          trackId: track.id, ytId: track.ytId, title: track.title, artist: track.artist,
          provider: track.provider, art: track.art, duration: track.duration,
          progress, timestamp: Date.now(),
          context: playbackContextRef.current ? {
            type: playbackContextRef.current.type,
            id: playbackContextRef.current.id,
            currentIndex: playbackContextRef.current.currentIndex,
          } : null,
        }));
      } catch {}
    };
    window.addEventListener("beforeunload", save);
    return () => window.removeEventListener("beforeunload", save);
  }, [currentTrack, progress]);

  // Restore on mount
  const resumeAttempted = useRef(false);
  useEffect(() => {
    if (resumeAttempted.current || typeof window === "undefined") return;
    resumeAttempted.current = true;
    try {
      const raw = localStorage.getItem("fulkit-playback-resume");
      if (!raw) return;
      localStorage.removeItem("fulkit-playback-resume");
      const saved = JSON.parse(raw);
      if (Date.now() - saved.timestamp > 30000) return; // stale (>30s)
      if (saved.provider === "spotify") return;

      const track = {
        id: saved.trackId, ytId: saved.ytId, title: saved.title,
        artist: saved.artist, provider: saved.provider || "youtube",
        art: saved.art, duration: saved.duration,
      };

      // Restore context if available
      if (saved.context) {
        const setData = setsData.sets.find(s => s.id === saved.context.id);
        if (setData) {
          playbackContextRef.current = {
            type: saved.context.type, id: saved.context.id,
            tracks: setData.tracks, currentIndex: saved.context.currentIndex,
          };
        }
      }

      // Wait for ytEngine to be ready, then play and seek
      const waitAndPlay = () => {
        if (window.__ytEngine?.isReady()) {
          playTrack(track);
          if (saved.progress > 0.01 && saved.duration) {
            setTimeout(() => {
              window.__ytEngine?.seek(saved.progress * saved.duration * 1000);
              setProgress(saved.progress);
            }, 1500); // give iframe time to load video
          }
        } else {
          setTimeout(waitAndPlay, 200);
        }
      };
      setTimeout(waitAndPlay, 500);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll now playing every 4s when Spotify is connected (only on fabric page or if already playing)
  // YouTube tracks don't need polling — state is managed client-side
  const hasSpotify = connectedProvidersRef.current?.spotify;
  useEffect(() => {
    if (!hasSpotify || !accessToken) return;
    if (!onFabricPage && !isPlaying) return;

    let failCount = 0;
    const fetchNowPlaying = async () => {
      const data = await apiFetch("/api/fabric/now-playing");
      if (!data || data.error) {
        failCount++;
        if (failCount >= 3) { clearInterval(pollRef.current); }
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

            // Detect Spotify auto-advancing to our pre-queued track
            const ctx = playbackContextRef.current;
            if (ctx && ctx.tracks) {
              const nextIdx = ctx.currentIndex + 1;
              if (nextIdx < ctx.tracks.length) {
                const nextTrack = ctx.tracks[nextIdx];
                if (nextTrack.id === data.track.id || nextTrack.uri === makeTrackUri(data.track.id, data.track.provider)) {
                  ctx.currentIndex = nextIdx;
                  queuedNextRef.current = null;
                  autoAdvanceTriggered.current = false;
                }
              }
            }

            return data.track;
          }
          // Same track — update max progress
          playSessionRef.current.maxProgress = Math.max(playSessionRef.current.maxProgress, data.track.progress || 0);
          return { ...prev, progress: data.track.progress, progressMs: data.track.progressMs };
        });
        setProgress(data.track.progress);

        // Pre-queue next track for smooth transition when past 75%
        if (data.isPlaying && data.track.progress > 0.75 && playbackContextRef.current && !queuedNextRef.current) {
          queueNextTrackRef.current?.();
        }
      } else {
        setCurrentTrack(null);
        setProgress(0);
      }

      // Auto-advance: detect track completion (handles 204/no-track, stalled-at-end, and vanished)
      const prevPoll = lastPollState.current;
      const trackGone = prevPoll.isPlaying && prevPoll.progress > 0.8 && (!data.isPlaying || !data.track || data.track.id !== prevPoll.trackId);
      const trackEnded = !data.isPlaying && data.track && data.track.progress > 0.95;
      const trackVanished = prevPoll.isPlaying && prevPoll.trackId && !data.track;

      if ((trackGone || trackEnded || trackVanished) && playbackContextRef.current) {
        if (!autoAdvanceTriggered.current) {
          autoAdvanceTriggered.current = true;
          autoAdvanceTriggeredAt.current = Date.now();
          autoAdvanceRef.current?.();
        } else if (Date.now() - autoAdvanceTriggeredAt.current > 10000) {
          // Guard stuck — playTrack likely failed silently. Reset and retry.
          autoAdvanceTriggered.current = false;
        }
      } else if (data.isPlaying) {
        autoAdvanceTriggered.current = false;
      }

      lastPollState.current = {
        isPlaying: data.isPlaying,
        trackId: data.track?.id || null,
        progress: data.track?.progress || 0,
      };
    };

    fetchNowPlaying();
    const interval = onFabricPage ? 4000 : 30000;
    pollRef.current = setInterval(fetchNowPlaying, interval);
    return () => clearInterval(pollRef.current);
  }, [hasSpotify, accessToken, apiFetch, onFabricPage, isPlaying]);

  // YouTube progress poll — read iframe state for time/duration
  useEffect(() => {
    if (!isPlaying) return;
    const isYT = currentTrack?.provider === "youtube" || !connectedProvidersRef.current?.spotify;
    if (!isYT || !window.__ytEngine) return;

    let ended = false;
    const interval = setInterval(() => {
      const state = window.__ytEngine.getState?.();
      if (!state) return;
      const { currentTime, duration, isPlaying: ytPlaying } = state;
      if (duration > 0) {
        const pct = currentTime / duration;
        setProgress(pct);
        // Update duration on currentTrack if missing
        if (!currentTrack?.duration || currentTrack.duration < 10) {
          setCurrentTrack((cur) => cur ? { ...cur, duration: Math.round(duration / 1000) } : cur);
        }
        // Detect track end → auto-advance to next in context
        if (!ytPlaying && pct > 0.95 && !ended) {
          ended = true;
          clearInterval(interval);
          if (autoAdvanceRef.current && playbackContextRef.current) {
            autoAdvanceRef.current();
          } else {
            setIsPlaying(false);
          }
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.provider]);

  // Smooth progress interpolation between Spotify polls
  useEffect(() => {
    if (!isPlaying || !currentTrack?.duration) return;
    const isYT = currentTrack?.provider === "youtube" || !connectedProvidersRef.current?.spotify;
    if (isYT) return; // YouTube handles its own progress above
    const interval = setInterval(() => {
      setProgress((p) => {
        const step = 0.25 / currentTrack.duration;
        return Math.min(p + step, 1);
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.duration, currentTrack?.provider]);

  // Controls — route to correct engine
  const sendControl = useCallback(async (action) => {
    // YouTube or no Spotify: control via iframe engine
    const useYT = currentTrack?.provider === "youtube" || !connectedProvidersRef.current?.spotify;
    if (useYT && window.__ytEngine) {
      if (action === "play") window.__ytEngine.resume();
      else if (action === "pause") window.__ytEngine.pause();
      return;
    }
    // Spotify / other: control via API
    await apiFetch("/api/fabric/controls", {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  }, [apiFetch, currentTrack?.provider, connectedProvidersRef.current?.spotify]);

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
    // Skip is neutral — no taste penalty (browsing is browsing)
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
    queuedNextRef.current = null; // reset pre-queue on skip
    const ctx = playbackContextRef.current;
    if (ctx?.tracks && ctx.currentIndex < ctx.tracks.length - 1) {
      ctx.currentIndex++;
      playTrackRef.current?.(ctx.tracks[ctx.currentIndex]);
    } else if (ctx && autoAdvanceRef.current) {
      autoAdvanceRef.current();
    } else {
      sendControl("next");
    }
  }, [sendControl, progress, currentTrack]);

  const prev = useCallback(() => {
    // If we jumped to a track manually, go back to what was playing
    const saved = prevTrackRef.current;
    if (saved) {
      prevTrackRef.current = null;
      setCurrentTrack(saved);
      setProgress(0);
      setIsPlaying(true);
      apiFetch("/api/fabric/controls", {
        method: "POST",
        body: JSON.stringify({ action: "play_track", value: { uri: saved.uri || makeTrackUri(saved.id, saved.provider) } }),
      });
      return;
    }
    sendControl("previous");
  }, [sendControl, apiFetch]);

  const setVolume = useCallback((val) => {
    const v = Math.max(0, Math.min(100, Math.round(val)));
    setVolumeState(v);
    volumeLockedUntil.current = Date.now() + 5000;
    clearTimeout(volumeTimer.current);
    volumeTimer.current = setTimeout(() => {
      // YouTube or no Spotify: set volume directly on iframe
      const useYT = currentTrack?.provider === "youtube" || !connectedProvidersRef.current?.spotify;
      if (useYT && window.__ytEngine) {
        window.__ytEngine.setVolume(v);
        return;
      }
      // Spotify / other: set via API
      apiFetch("/api/fabric/controls", {
        method: "POST",
        body: JSON.stringify({ action: "volume", value: v }),
      });
    }, 300);
  }, [apiFetch, currentTrack?.provider]);

  // Save track to Spotify Liked Songs (fire-and-forget)
  const likeTrack = useCallback((track) => {
    if (!track?.id) return;
    // Fulkit taste signal — source-independent, works with any provider
    if (findHistoryMatchRef.current) {
      const match = findHistoryMatchRef.current(track.id, track.title, track.artist);
      if (match && updateHistorySignalRef.current) {
        updateHistorySignalRef.current(match.id, { liked: true });
      }
    }
    // Also save to Spotify library if connected (bonus, not the gate)
    if (connectedProvidersRef.current?.spotify) {
      apiFetch("/api/fabric/controls", {
        method: "POST",
        body: JSON.stringify({ action: "save_track", value: { id: track.id } }),
      }).catch(() => {});
    }
  }, [apiFetch]);

  // Seek to position (fraction 0-1)
  const seekTo = useCallback((fraction) => {
    if (!currentTrack?.duration) return;
    const ms = Math.round(fraction * currentTrack.duration * 1000);
    setProgress(fraction);
    pollSuppressedUntil.current = Date.now() + 3000;
    apiFetch("/api/fabric/controls", {
      method: "POST",
      body: JSON.stringify({ action: "seek", value: ms }),
    });
  }, [currentTrack, apiFetch]);

  // Fetch Fabric timeline when track changes
  const prevTimelineTrack = useRef(null);
  useEffect(() => {
    if (!connected || !accessToken || !currentTrack?.id) return;
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
  }, [currentTrack?.id, connected, accessToken, apiFetch]);

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
    if (!connected || !accessToken) return;
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
  }, [currentTrack?.id, flagged, connected, accessToken, apiFetch, audioFeatures]);

  // Auto-sync crowned set to Supabase after any mutation (fire-and-forget)
  const autoSyncCrowned = useCallback((setId, sets) => {
    const set = sets.find(s => s.id === setId);
    if (!set) return;
    const crateId = publishedSetsRef.current[set.name];
    if (!crateId) return; // Not crowned — skip
    // Re-publish in background
    apiFetch("/api/fabric/sets/publish", {
      method: "POST",
      body: JSON.stringify({
        name: set.name,
        tracks: set.tracks.map((t, i) => ({
          source_id: t.id,
          title: t.title,
          artist: t.artist,
          duration_ms: t.duration_ms || (t.duration ? t.duration * 1000 : 0),
          position: i,
        })),
      }),
    }).catch(() => {});
  }, [apiFetch]);

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
      autoSyncCrowned(prev.activeId, next.sets);
      return next;
    });
  }, [persistSets, autoSyncCrowned]);

  const flag = useCallback((track) => {
    setSetsData((prev) => {
      const activeSet = prev.sets.find(s => s.id === prev.activeId);
      const wasInSet = activeSet?.tracks.some(t => t.id === track.id);
      const next = { ...prev, sets: prev.sets.map(s => {
        if (s.id !== prev.activeId) return s;
        return { ...s, tracks: wasInSet ? s.tracks.filter(t => t.id !== track.id) : [...s.tracks, track] };
      })};
      persistSets(next);
      autoSyncCrowned(prev.activeId, next.sets);
      if (!wasInSet && activeSet) {
        flagAdoptionRef.current = { trackId: track.id, setName: activeSet.name };
        resolveYouTubeId(track.id);
      }
      return next;
    });
  }, [persistSets, autoSyncCrowned]);

  const isFlagged = useCallback(
    (trackId) => flagged.some((t) => t.id === trackId),
    [flagged]
  );

  // Resolve YouTube video ID for a track — one search, stored forever.
  // Tracks with real YT IDs (11-char) skip resolution. Slug IDs (btc-*, search-*) get resolved.
  // Uses a ref-based pattern to avoid circular hook dependencies with flag/addToGuyCrate.
  const resolveYouTubeIdRef = useRef(null);
  const resolveYouTubeId = useCallback((trackId) => {
    resolveYouTubeIdRef.current?.(trackId);
  }, []);
  useEffect(() => {
    resolveYouTubeIdRef.current = (trackId) => {
      if (!trackId) return;
      if (/^[A-Za-z0-9_-]{10,12}$/.test(trackId)) return;
      // Read current sets to find the track's metadata
      setSetsData((prev) => {
        for (const s of prev.sets) {
          const t = s.tracks.find(t => t.id === trackId);
          if (t?.title) {
            const q = `${t.artist || ""} ${t.title}`.trim();
            apiFetch(`/api/fabric/search?q=${encodeURIComponent(q)}&type=track`).then((data) => {
              const ytMatch = (data?.results || []).find(r => r.provider === "youtube");
              if (!ytMatch) return;
              setSetsData((cur) => {
                const next = { ...cur, sets: cur.sets.map(s => ({
                  ...s,
                  tracks: s.tracks.map(t => t.id === trackId ? { ...t, ytId: ytMatch.source_id, provider: "youtube" } : t),
                }))};
                persistSets(next);
                return next;
              });
            });
            break;
          }
        }
        return prev;
      });
    };
  });

  // Guy's Crate — auto-populated by BTC recommendations
  const guyCrate = setsData.sets.find(s => s.id === "guy-crate") || null;


  // Shadow history — every track Guy ever recommended, with taste signals
  const [guyHistory, setGuyHistory] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = JSON.parse(localStorage.getItem("fulkit-guy-history") || "[]");
      const version = localStorage.getItem("fulkit-guy-history-version");
      if (version === "2") {
        // Patch: backfill missing provider field
        let patched = false;
        for (const t of raw) {
          if (!t.provider) {
            t.provider = /^[A-Za-z0-9]{22}$/.test(t.id) ? "spotify" : "youtube";
            patched = true;
          }
        }
        if (patched) localStorage.setItem("fulkit-guy-history", JSON.stringify(raw));
        return raw;
      }
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
      const entry = { id: track.id, title: track.title, artist: track.artist, provider: track.provider, ...makeHistoryDefaults(), addedAt: Date.now() };
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
        resolveYouTubeId(track.id);
        return next;
      }
      if (gc.tracks.some(t => t.id === track.id)) return prev;
      const next = { ...prev, sets: prev.sets.map(s =>
        s.id === "guy-crate" ? { ...s, tracks: [...s.tracks, track] } : s
      )};
      persistSets(next);
      resolveYouTubeId(track.id);
      return next;
    });
  }, [persistSets]);

  const enrichGuyCrateTrack = useCallback((trackId, fields) => {
    setSetsData((prev) => {
      const gc = prev.sets.find(s => s.id === "guy-crate");
      if (!gc) return prev;
      const t = gc.tracks.find(t => t.id === trackId);
      if (!t) return prev;
      Object.assign(t, fields);
      const next = { ...prev, sets: [...prev.sets] };
      persistSets(next);
      return next;
    });
  }, [persistSets]);

  const removeFromGuyCrate = useCallback((trackId) => {
    // Remove is neutral — "not right now", no taste judgment
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

  // ── Thumbs Down ──
  const thumbsDownTrack = useCallback((track) => {
    if (!track?.artist && !track?.title) return;
    const key = `${(track.artist || "").trim().toLowerCase()}|${(track.title || "").trim().toLowerCase()}`;
    // Update local state immediately
    setThumbsDownSet(prev => new Set([...prev, key]));
    // Mark in history (does NOT remove from crate — user controls that separately)
    if (track.id) {
      updateHistorySignal(track.id, { thumbedDown: true });
    }
    // Fire-and-forget: persist to Supabase
    apiFetch("/api/fabric/thumbsdown", {
      method: "POST",
      body: JSON.stringify({ trackId: track.id, artist: track.artist, title: track.title }),
    }).catch(() => {});
  }, [apiFetch, updateHistorySignal]);

  const isThumbedDown = useCallback((artist, title) => {
    const key = `${(artist || "").trim().toLowerCase()}|${(title || "").trim().toLowerCase()}`;
    return thumbsDownRef.current.has(key);
  }, []);

  // Multi-set CRUD
  const userSets = setsData.sets.filter(s => s.source !== "guy");
  const allSets = userSets.filter(s => !s.trophied).map(s => ({ id: s.id, name: s.name, trackCount: s.tracks.length, tracks: s.arcActive ? sortByArc(s.tracks, audioFeatures) : s.tracks, arcActive: !!s.arcActive }));
  const trophiedSets = userSets.filter(s => s.trophied).map(s => ({ id: s.id, name: s.name, trackCount: s.tracks.length, tracks: s.arcActive ? sortByArc(s.tracks, audioFeatures) : s.tracks, trophied: true, arcActive: !!s.arcActive }));
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

  const reorderSets = useCallback((fromIndex, toIndex) => {
    setSetsData((prev) => {
      // Only reorder non-guy sets
      const userSets = prev.sets.filter(s => s.source !== "guy");
      const guySets = prev.sets.filter(s => s.source === "guy");
      const [moved] = userSets.splice(fromIndex, 1);
      userSets.splice(toIndex, 0, moved);
      const next = { ...prev, sets: [...guySets, ...userSets] };
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

  // Arc sort — toggle B-Side smart sequencing on a set
  const toggleArc = useCallback((setId) => {
    setSetsData((prev) => {
      const next = { ...prev, sets: prev.sets.map(s => {
        if (s.id !== setId) return s;
        const turning_on = !s.arcActive;
        if (turning_on) {
          // Save manual order before sorting
          return { ...s, arcActive: true, manualOrder: s.tracks.map(t => t.id) };
        } else {
          // Restore manual order
          if (s.manualOrder) {
            const byId = Object.fromEntries(s.tracks.map(t => [t.id, t]));
            const restored = s.manualOrder.map(id => byId[id]).filter(Boolean);
            // Add any tracks that were added while arc was on
            const restoredIds = new Set(restored.map(t => t.id));
            const extras = s.tracks.filter(t => !restoredIds.has(t.id));
            return { ...s, arcActive: false, tracks: [...restored, ...extras], manualOrder: null };
          }
          return { ...s, arcActive: false };
        }
      })};
      persistSets(next);
      return next;
    });
  }, [persistSets]);

  // Trophy — mark set as complete, persist to Supabase
  const trophySet = useCallback((setId) => {
    setSetsData((prev) => {
      const next = { ...prev, sets: prev.sets.map(s =>
        s.id === setId ? { ...s, trophied: true } : s
      )};
      persistSets(next);
      // Fire-and-forget: save to Supabase
      const set = next.sets.find(s => s.id === setId);
      if (set && apiFetch) {
        apiFetch("/api/fabric/sets/trophy", {
          method: "POST",
          body: JSON.stringify({ setId: set.id, name: set.name, tracks: set.tracks }),
        }).catch(() => {});
      }
      return next;
    });
  }, [persistSets, apiFetch]);

  const untrophySet = useCallback((setId) => {
    setSetsData((prev) => {
      const next = { ...prev, sets: prev.sets.map(s =>
        s.id === setId ? { ...s, trophied: false } : s
      )};
      persistSets(next);
      // Fire-and-forget: remove from Supabase
      if (apiFetch) {
        apiFetch(`/api/fabric/sets/trophy?setId=${setId}`, { method: "DELETE" }).catch(() => {});
      }
      return next;
    });
  }, [persistSets, apiFetch]);

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
    // Reset lastPollState so first non-suppressed poll starts fresh (avoids stale trackGone)
    lastPollState.current = { isPlaying: true, trackId: track.id, progress: 0 };

    // Resolve YouTube video ID — search by artist+title, works for any track
    const resolveAndPlayYT = async () => {
      if (!window.__ytEngine || !track.title) {
        console.warn("[playTrack] No ytEngine or no title, cannot play:", track.id);
        return false;
      }
      // If track has a precached YouTube video ID, play directly — zero quota
      if (track.ytId) {
        window.__ytEngine.play(track.ytId);
        if (!track.art) {
          fetchAlbumArt(track.artist, track.title).then((art) => {
            if (art) setCurrentTrack((cur) => cur ? { ...cur, art } : cur);
            else {
              const fallback = `https://img.youtube.com/vi/${track.ytId}/mqdefault.jpg`;
              setCurrentTrack((cur) => cur ? { ...cur, art: fallback } : cur);
            }
          });
        }
        return true;
      }
      // If track ID is already a real YouTube video ID, play directly
      const rawId = track.id || track.uri?.replace("youtube:video:", "");
      if (rawId && /^[A-Za-z0-9_-]{10,12}$/.test(rawId)) {
        window.__ytEngine.play(rawId);
        if (!track.art) {
          fetchAlbumArt(track.artist, track.title).then((art) => {
            if (art) setCurrentTrack((cur) => cur ? { ...cur, art } : cur);
            else {
              const fallback = `https://img.youtube.com/vi/${rawId}/mqdefault.jpg`;
              setCurrentTrack((cur) => cur ? { ...cur, art: fallback } : cur);
            }
          });
        }
        return true;
      }
      // Search YouTube for the real video
      try {
        const q = `${track.artist || ""} ${track.title}`.trim();
        console.log("[playTrack] YouTube search:", q);
        const data = await apiFetch(`/api/fabric/search?q=${encodeURIComponent(q)}&type=track`);
        if (playInFlightRef.current !== requestId) return false;
        const ytMatch = (data?.results || []).find(r => r.provider === "youtube");
        if (ytMatch) {
          console.log("[playTrack] YouTube match:", ytMatch.source_id);
          window.__ytEngine.play(ytMatch.source_id);
          if (!track.art) {
            fetchAlbumArt(track.artist, track.title).then((art) => {
              if (art) setCurrentTrack((cur) => cur ? { ...cur, art, provider: "youtube" } : cur);
              else {
                const fallback = `https://img.youtube.com/vi/${ytMatch.source_id}/mqdefault.jpg`;
                setCurrentTrack((cur) => cur ? { ...cur, art: fallback, provider: "youtube" } : cur);
              }
            });
          } else {
            setCurrentTrack((cur) => cur ? { ...cur, provider: "youtube" } : cur);
          }
          return true;
        }
        console.warn("[playTrack] YouTube search returned no results for:", q, data);
        return false;
      } catch (err) {
        console.error("[playTrack] YouTube search failed:", err);
        return false;
      }
    };

    // YouTube tracks: route directly
    if (track.provider === "youtube") {
      await resolveAndPlayYT();
      return;
    }

    // If Spotify isn't connected, fall back to YouTube for ANY track
    const spotifyConnected = connectedProvidersRef.current?.spotify;
    if (!spotifyConnected && window.__ytEngine && track.title) {
      const played = await resolveAndPlayYT();
      if (played) return;
      // If YouTube search failed too, nothing to do
      return;
    }

    // Spotify path: resolve URI and play via API
    let uri = track.uri || (track.id.startsWith("btc-") ? null : makeTrackUri(track.id, track.provider));
    if (!uri && track.artist && track.title) {
      try {
        const data = await apiFetch(`/api/fabric/search?q=${encodeURIComponent(`${track.artist} ${track.title}`)}&type=track`);
        if (playInFlightRef.current !== requestId) return;
        if (data?.tracks?.[0]) {
          const match = data.tracks[0];
          uri = match.uri;
          track.uri = uri;
          if (match.source_id) track.id = match.source_id;
          if (match.image) track.art = match.image;
          setCurrentTrack((cur) => (cur && cur.uri === uri) ? cur : { ...track });
        }
      } catch {}
    }
    if (playInFlightRef.current !== requestId) return;

    // Spotify (and other OAuth providers): play via API
    if (!uri) return;

    let result = await apiFetch("/api/fabric/controls", {
      method: "POST",
      body: JSON.stringify({ action: "play_track", value: { uri } }),
    });

    // If play failed, try activating a device first then retry
    if (!result?.ok) {
      const devRes = await apiFetch("/api/fabric/devices");
      const device = devRes?.devices?.[0];
      if (device) {
        await apiFetch("/api/fabric/devices", {
          method: "POST",
          body: JSON.stringify({ device_id: device.id, play: false }),
        });
        await new Promise(r => setTimeout(r, 300));
        result = await apiFetch("/api/fabric/controls", {
          method: "POST",
          body: JSON.stringify({ action: "play_track", value: { uri } }),
        });
      }
      if (!result?.ok) console.warn("[fabric] play_track failed:", result);
    }

    // Fetch album art if we don't have it yet
    if (!track.art && track.artist && track.title && playInFlightRef.current === requestId) {
      try {
        const data = await apiFetch(`/api/fabric/search?q=${encodeURIComponent(`${track.artist} ${track.title}`)}&type=track`);
        if (playInFlightRef.current === requestId && data?.tracks?.[0]?.image) {
          track.art = data.tracks[0].image;
          setCurrentTrack((cur) => (cur && cur.id === track.id) ? { ...cur, art: track.art } : cur);
        }
      } catch {}
    }
  }, [apiFetch]);
  playTrackRef.current = playTrack;

  // Play a track with context for auto-continue
  const playTrackInContext = useCallback(async (track, contextType, contextId, trackList, trackIndex) => {
    playbackContextRef.current = {
      type: contextType,
      id: contextId,
      tracks: trackList,
      currentIndex: trackIndex,
    };
    queuedNextRef.current = null; // reset pre-queue on context change
    await playTrack(track);
  }, [playTrack]);

  // Pre-queue next track in Spotify for gapless transition
  const queueNextTrack = useCallback(async () => {
    const ctx = playbackContextRef.current;
    if (!ctx?.tracks?.length) return;
    const nextIdx = ctx.currentIndex + 1;
    if (nextIdx >= ctx.tracks.length) return;

    const nextTrack = ctx.tracks[nextIdx];
    let uri = nextTrack.uri || (nextTrack.id.startsWith("btc-") ? null : makeTrackUri(nextTrack.id, nextTrack.provider));

    // Resolve btc-* tracks via search
    if (!uri && nextTrack.artist && nextTrack.title) {
      try {
        const data = await apiFetch(`/api/fabric/search?q=${encodeURIComponent(`${nextTrack.artist} ${nextTrack.title}`)}&type=track`);
        if (data?.tracks?.[0]) {
          uri = data.tracks[0].uri;
          nextTrack.uri = uri;
          if (data.tracks[0].source_id) nextTrack.id = data.tracks[0].source_id;
        }
      } catch {}
    }
    if (!uri || uri === queuedNextRef.current) return;

    await apiFetch("/api/fabric/controls", {
      method: "POST",
      body: JSON.stringify({ action: "add_to_queue", value: { uri } }),
    }).catch(() => {});
    queuedNextRef.current = uri;
  }, [apiFetch]);
  const queueNextTrackRef = useRef(null);
  queueNextTrackRef.current = queueNextTrack;

  // Auto-advance to next track when current finishes
  const autoAdvance = useCallback(() => {
    const ctx = playbackContextRef.current;
    if (!ctx?.tracks?.length) return;

    // Find next non-thumbed-down track in context
    let nextIndex = ctx.currentIndex + 1;
    while (nextIndex < ctx.tracks.length) {
      const t = ctx.tracks[nextIndex];
      if (!isThumbedDown(t.artist, t.title)) break;
      nextIndex++;
    }

    // Next track in current context
    if (nextIndex < ctx.tracks.length) {
      ctx.currentIndex = nextIndex;
      playTrack(ctx.tracks[nextIndex]);
      return;
    }

    // Context exhausted — try next set in chain
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

    // After B-Sides or any context exhausts → try Bin Picks (featured crates)
    const featured = featuredCratesRef.current || [];
    if (featured.length > 0) {
      // If we just finished a featured crate, try the next one
      if (ctx.type === "featured") {
        const crateIdx = featured.findIndex(c => c.id === ctx.id);
        if (crateIdx >= 0 && crateIdx < featured.length - 1) {
          const nextCrate = featured[crateIdx + 1];
          if (nextCrate.tracks?.length) {
            playbackContextRef.current = { type: "featured", id: nextCrate.id, tracks: nextCrate.tracks, currentIndex: 0 };
            playTrack(nextCrate.tracks[0]);
            return;
          }
        }
      }
      // Otherwise start from first featured crate with tracks
      if (ctx.type !== "featured") {
        const firstCrate = featured.find(c => c.tracks?.length > 0);
        if (firstCrate) {
          playbackContextRef.current = { type: "featured", id: firstCrate.id, tracks: firstCrate.tracks, currentIndex: 0 };
          playTrack(firstCrate.tracks[0]);
          return;
        }
      }
    }

    // Fallback: first user set
    if (userSets.length > 0 && (ctx.type !== "set" || ctx.id !== userSets[0].id)) {
      playbackContextRef.current = { type: "set", id: userSets[0].id, tracks: userSets[0].tracks, currentIndex: 0 };
      playTrack(userSets[0].tracks[0]);
      return;
    }

    // Final fallback: B-Sides crate (loop)
    const gc = setsData.sets.find(s => s.id === "guy-crate");
    if (gc && gc.tracks.length > 0) {
      playbackContextRef.current = { type: "bsides", id: "guy-crate", tracks: gc.tracks, currentIndex: 0 };
      playTrack(gc.tracks[0]);
    }
  }, [setsData.sets, playTrack]);
  autoAdvanceRef.current = autoAdvance;

  const playPlaylist = useCallback(async (playlistId, startTrackUri) => {
    await apiFetch("/api/fabric/controls", {
      method: "POST",
      body: JSON.stringify({
        action: "play_context",
        value: {
          context_uri: makePlaylistUri(playlistId),
          ...(startTrackUri ? { offset: { uri: startTrackUri } } : {}),
        },
      }),
    });
    setIsPlaying(true);
  }, [apiFetch]);

  // Cache for fetched playlist tracks
  const mixTracksCacheRef = useRef({});

  const fetchPlaylistTracks = useCallback(async (playlistId) => {
    if (mixTracksCacheRef.current[playlistId]) return mixTracksCacheRef.current[playlistId];
    const data = await apiFetch(`/api/fabric/playlists/${playlistId}/tracks`);
    const tracks = data?.tracks || [];
    mixTracksCacheRef.current[playlistId] = tracks;
    return tracks;
  }, [apiFetch]);

  // ═══ Published sets (featured mixes) ═══
  const [publishedSets, setPublishedSets] = useState({}); // { setName: crateId }
  const publishedSetsRef = useRef({});
  useEffect(() => { publishedSetsRef.current = publishedSets; }, [publishedSets]);

  // Fetch published sets on mount — auto-restore missing personal sets from crowned crates
  useEffect(() => {
    if (!accessToken) return;
    apiFetch("/api/fabric/featured").then((data) => {
      if (!data?.crates) return;
      const map = {};
      for (const c of data.crates) {
        if (c.source === "set") map[c.name] = c.id;
      }
      setPublishedSets(map);

      // Auto-restore: if a crowned set exists in Supabase but not in personal sets, recreate it
      const currentSetNames = new Set(setsData.sets.map(s => s.name));
      let restored = false;
      for (const c of data.crates) {
        if (c.source === "set" && !currentSetNames.has(c.name) && c.tracks?.length > 0) {
          const restoredSet = {
            id: `restored-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: c.name,
            tracks: c.tracks.map(t => ({
              id: t.source_id || t.id,
              title: t.title,
              artist: t.artist,
              album: t.album || "",
              duration: Math.round((t.duration_ms || 0) / 1000),
              art: t.art || null,
            })),
          };
          setSetsData((prev) => {
            const next = { ...prev, sets: [...prev.sets, restoredSet] };
            persistSets(next);
            return next;
          });
          restored = true;
        }
      }
      if (restored) console.log("[fabric] Restored crowned sets to personal list");
    });

    // Auto-restore trophied sets from Supabase
    apiFetch("/api/fabric/playlists").then((data) => {
      if (!data?.playlists) return;
      const trophiedPlaylists = data.playlists.filter(p => p.source === "set");
      if (!trophiedPlaylists.length) return;

      setSetsData((prev) => {
        const currentSetIds = new Set(prev.sets.map(s => s.id));
        const currentSetNames = new Set(prev.sets.map(s => s.name));
        let restored = false;

        for (const pl of trophiedPlaylists) {
          // Skip if set already exists (by ID or name)
          if (currentSetIds.has(pl.id) || currentSetNames.has(pl.name)) continue;

          // Fetch tracks for this playlist
          apiFetch(`/api/fabric/playlists/${pl._fulkitId}/tracks`).then((trackData) => {
            const tracks = (trackData?.tracks || []).map(t => ({
              id: t.source_id || t.id,
              title: t.title,
              artist: t.artist,
              album: t.album || "",
              duration: Math.round((t.duration_ms || 0) / 1000),
              provider: t.provider || "youtube",
            }));
            if (!tracks.length) return;

            setSetsData((cur) => {
              // Double-check it hasn't been restored already
              if (cur.sets.some(s => s.name === pl.name)) return cur;
              const restoredSet = {
                id: pl.id || `trophy-${Date.now()}`,
                name: pl.name,
                tracks,
                trophied: true,
              };
              const next = { ...cur, sets: [...cur.sets, restoredSet] };
              persistSets(next);
              console.log(`[fabric] Restored trophied set: ${pl.name}`);
              return next;
            });
          });
          restored = true;
        }
        return prev; // Don't mutate here — async callbacks handle it
      });
    });

    // Auto-restore sets from B-Side adoption memory (sets that existed but were lost)
    const guyHist = JSON.parse(localStorage.getItem("fulkit-guy-history") || "[]");
    const adoptedSets = {};
    for (const e of guyHist) {
      if (e.adopted && e.adoptedTo) {
        if (!adoptedSets[e.adoptedTo]) adoptedSets[e.adoptedTo] = [];
        adoptedSets[e.adoptedTo].push({ id: e.id, title: e.title, artist: e.artist, provider: e.provider || "youtube" });
      }
    }
    setSetsData((prev) => {
      let changed = false;
      const newSets = prev.sets.map(s => {
        const memoryTracks = adoptedSets[s.name];
        if (!memoryTracks?.length) return s;
        // Merge missing tracks from B-Side memory into existing set
        const existingIds = new Set(s.tracks.map(t => t.id));
        const existingKeys = new Set(s.tracks.map(t => `${(t.artist || "").toLowerCase()}|${(t.title || "").toLowerCase()}`));
        const missing = memoryTracks.filter(t => {
          if (existingIds.has(t.id)) return false;
          const key = `${(t.artist || "").toLowerCase()}|${(t.title || "").toLowerCase()}`;
          return !existingKeys.has(key);
        });
        if (!missing.length) return s;
        changed = true;
        console.log(`[fabric] Restored ${missing.length} track(s) to "${s.name}" from B-Side memory`);
        return { ...s, tracks: [...s.tracks, ...missing] };
      });
      // Also create sets that don't exist at all
      const currentNames = new Set(newSets.map(s => s.name));
      for (const [name, tracks] of Object.entries(adoptedSets)) {
        if (currentNames.has(name) || !tracks.length) continue;
        newSets.push({
          id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          tracks,
        });
        changed = true;
        console.log(`[fabric] Restored set from B-Side memory: ${name} (${tracks.length} tracks)`);
      }
      if (!changed) return prev;
      const next = { ...prev, sets: newSets };
      persistSets(next);
      return next;
    });
  }, [accessToken, apiFetch]);

  const publishSet = useCallback(async (setId) => {
    const set = setsData.sets.find(s => s.id === setId);
    if (!set || set.tracks.length === 0) return { error: "empty" };
    const res = await apiFetch("/api/fabric/sets/publish", {
      method: "POST",
      body: JSON.stringify({
        name: set.name,
        tracks: set.tracks.map((t, i) => ({
          source_id: t.id,
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
    if (!accessToken || !currentTrack?.id) return;
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
  }, [currentTrack?.id, accessToken, apiFetch, tickerTrackId]);

  // Build taste summary for the API (computed per message, not stored)
  const buildTasteSummary = useCallback(() => {
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

    // NEW: Full set contents (B-Side can reference what's in each set)
    const setContents = setsData.sets
      .filter(s => s.source !== "guy" && s.tracks.length > 0)
      .map(s => ({ name: s.name, tracks: s.tracks.slice(0, 20).map(t => `${t.artist} - ${t.title}`) }));

    // NEW: Thumbed-down tracks (never suggest these)
    const thumbedDown = [...thumbsDownSet].slice(0, 15).map(key => {
      const parts = key.split("|");
      return parts.length === 2 ? `${parts[0]} - ${parts[1]}` : key;
    });

    // NEW: Audio feature preferences (aggregate across all set tracks)
    let featureProfile = null;
    const allFeats = setsData.sets.flatMap(s => s.tracks).map(t => audioFeatures[t.id]).filter(Boolean);
    if (allFeats.length >= 3) {
      const bpms = allFeats.map(f => f.bpm).filter(Boolean);
      const energies = allFeats.map(f => f.energy).filter(Boolean);
      const valences = allFeats.map(f => f.valence).filter(Boolean);
      const keys = allFeats.map(f => f.key).filter(Boolean);
      const keyCount = {};
      for (const k of keys) { keyCount[k] = (keyCount[k] || 0) + 1; }
      const topKeys = Object.entries(keyCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
      const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

      featureProfile = {
        bpmRange: bpms.length >= 2 ? [Math.min(...bpms), Math.max(...bpms)] : null,
        avgEnergy: avg(energies),
        avgValence: avg(valences),
        topKeys,
      };
    }

    // NEW: Recently played (recency signal)
    const recentlyPlayed = guyHistory
      .filter(e => e.lastPlayedAt)
      .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
      .slice(0, 5)
      .map(e => `${e.artist} - ${e.title}`);

    return {
      favorites, passes, likedArtists, dislikedArtists,
      setNames, adoptionPatterns,
      setContents, thumbedDown, featureProfile, recentlyPlayed,
    };
  }, [guyHistory, setsData.sets, audioFeatures, thumbsDownSet]);

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
          spotifyConnected: connected,
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
        allTracks: [],
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
        trophiedSets,
        trophySet,
        untrophySet,
        toggleArc,
        activeSetId,
        createSet,
        deleteSet,
        renameSet,
        reorderSets,
        switchSet,
        guyCrate,
        saveGuyCrateAsSet,
        addToGuyCrate,
        enrichGuyCrateTrack,
        removeFromGuyCrate,
        thumbsDownTrack,
        isThumbedDown,
        clearGuyCrate,
        playTrack,
        playTrackInContext,
        playPlaylist,
        fetchPlaylistTracks,
        setProgress,
        seekTo,
        likeTrack,
        volume,
        setVolume,
        formatTime,
        timeline,
        getSnapshot,
        publishedSets,
        publishSet,
        unpublishSet,
        featuredCratesRef,
        musicMessages,
        musicChatOpen,
        musicStreaming,
        tickerFact,
        sendMusicMessage,
        toggleMusicChat,
        reconnect,
        reconnectSpotify,
        connectedProviders,
      }}
    >
      <PlaybackEngine connectedProviders={connectedProviders} />
      {children}
    </FabricContext.Provider>
  );
}

export function useFabric() {
  const ctx = useContext(FabricContext);
  if (!ctx) throw new Error("useFabric must be used within FabricProvider");
  return ctx;
}
