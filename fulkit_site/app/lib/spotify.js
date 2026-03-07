"use client";

import { createContext, useContext, useState, useCallback } from "react";

const SpotifyContext = createContext(null);

// Mock data — replace with real Spotify Web API calls
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

export function SpotifyProvider({ children }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(MOCK_TRACKS[0]);
  const [queue, setQueue] = useState(MOCK_TRACKS.slice(1, 5));
  const [flagged, setFlagged] = useState([]);
  const [playlists] = useState(MOCK_PLAYLISTS);
  const [progress, setProgress] = useState(0); // 0-1
  const [connected] = useState(true); // mock connected

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((p) => !p), []);

  const skip = useCallback(() => {
    if (queue.length === 0) return;
    setCurrentTrack(queue[0]);
    setQueue((q) => q.slice(1));
    setProgress(0);
    setIsPlaying(true);
  }, [queue]);

  const prev = useCallback(() => {
    setProgress(0);
  }, []);

  const flag = useCallback((track) => {
    setFlagged((prev) => {
      if (prev.some((t) => t.id === track.id)) {
        return prev.filter((t) => t.id !== track.id);
      }
      return [...prev, track];
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
        allTracks: MOCK_TRACKS,
        play,
        pause,
        toggle,
        skip,
        prev,
        flag,
        isFlagged,
        playTrack,
        setProgress,
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
