"use client";

import { useEffect, useRef, useCallback } from "react";

// YouTubeEngine — hidden iframe-based playback for YouTube tracks.
// Renders nothing visible. Communicates via YouTube iframe API.
// The Fabric player UI controls this engine the same way it controls Spotify.

let ytReady = false;
let ytReadyCallbacks = [];

function onYTReady(cb) {
  if (ytReady) return cb();
  ytReadyCallbacks.push(cb);
}

// Load YouTube iframe API script once
if (typeof window !== "undefined" && !window.YT) {
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = () => {
    ytReady = true;
    ytReadyCallbacks.forEach(cb => cb());
    ytReadyCallbacks = [];
  };
} else if (typeof window !== "undefined" && window.YT?.Player) {
  ytReady = true;
}

export default function YouTubeEngine({ onStateChange, onTrackChange }) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    onYTReady(() => {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: "1",
        width: "1",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (event) => {
            const states = { 1: "playing", 2: "paused", 0: "ended", 3: "buffering" };
            onStateChange?.(states[event.data] || "unknown");
          },
        },
      });
    });

    return () => {
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [onStateChange]);

  // Expose control methods via window for the Fabric player to call
  useEffect(() => {
    window.__ytEngine = {
      play: (videoId) => {
        if (playerRef.current?.loadVideoById) {
          playerRef.current.loadVideoById(videoId);
          onTrackChange?.(videoId);
        }
      },
      pause: () => playerRef.current?.pauseVideo?.(),
      resume: () => playerRef.current?.playVideo?.(),
      next: () => {}, // No queue concept in basic mode
      previous: () => {},
      seek: (ms) => playerRef.current?.seekTo?.(ms / 1000, true),
      setVolume: (pct) => playerRef.current?.setVolume?.(pct),
      getState: () => {
        const p = playerRef.current;
        if (!p?.getPlayerState) return null;
        const state = p.getPlayerState();
        return {
          isPlaying: state === 1,
          currentTime: (p.getCurrentTime?.() || 0) * 1000,
          duration: (p.getDuration?.() || 0) * 1000,
          volume: p.getVolume?.() || 50,
          videoId: p.getVideoData?.()?.video_id || null,
          title: p.getVideoData?.()?.title || null,
        };
      },
    };

    return () => { delete window.__ytEngine; };
  }, [onTrackChange]);

  // Off-screen container — needs real dimensions for audio to play, but visually hidden
  return <div ref={containerRef} style={{ position: "fixed", left: -9999, top: -9999, width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />;
}
