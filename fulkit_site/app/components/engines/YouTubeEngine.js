"use client";

import { useEffect, useRef } from "react";

// YouTubeEngine — hidden iframe-based playback for YouTube tracks.
// Renders nothing visible. Communicates via YouTube iframe API.

let ytApiLoaded = false;
let ytApiCallbacks = [];

function whenYTReady(cb) {
  if (ytApiLoaded && window.YT?.Player) return cb();
  ytApiCallbacks.push(cb);
}

// Load YouTube iframe API script once
if (typeof window !== "undefined") {
  if (window.YT?.Player) {
    ytApiLoaded = true;
  } else {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      if (prev) prev();
      ytApiCallbacks.forEach(cb => cb());
      ytApiCallbacks = [];
    };
    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }
}

export default function YouTubeEngine() {
  const playerRef = useRef(null);
  const readyRef = useRef(false);
  const pendingVideoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    whenYTReady(() => {
      if (playerRef.current) return;

      // Create a div for the player (YT API replaces it with iframe)
      const div = document.createElement("div");
      div.id = "yt-player-" + Date.now();
      containerRef.current.appendChild(div);

      playerRef.current = new window.YT.Player(div.id, {
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
          onReady: () => {
            console.log("[YouTubeEngine] Player ready");
            readyRef.current = true;
            // Play queued video if any
            if (pendingVideoRef.current) {
              playerRef.current.loadVideoById(pendingVideoRef.current);
              pendingVideoRef.current = null;
            }
          },
          onStateChange: (event) => {
            const states = { "-1": "unstarted", 0: "ended", 1: "playing", 2: "paused", 3: "buffering", 5: "cued" };
            console.log("[YouTubeEngine] State:", states[event.data] || event.data);
          },
          onError: (event) => {
            console.error("[YouTubeEngine] Error:", event.data);
          },
        },
      });
    });

    return () => {
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
        readyRef.current = false;
      }
    };
  }, []);

  // Expose control methods
  useEffect(() => {
    window.__ytEngine = {
      play: (videoId) => {
        console.log("[YouTubeEngine] Play requested:", videoId);
        if (readyRef.current && playerRef.current?.loadVideoById) {
          playerRef.current.loadVideoById(videoId);
        } else {
          // Queue it — will play when onReady fires
          pendingVideoRef.current = videoId;
        }
      },
      cue: (videoId, startSeconds) => {
        console.log("[YouTubeEngine] Cue requested:", videoId, "at", startSeconds || 0);
        if (readyRef.current && playerRef.current?.cueVideoById) {
          playerRef.current.cueVideoById({ videoId, startSeconds: startSeconds || 0 });
        } else {
          pendingVideoRef.current = videoId;
        }
      },
      pause: () => playerRef.current?.pauseVideo?.(),
      resume: () => playerRef.current?.playVideo?.(),
      seek: (ms) => playerRef.current?.seekTo?.(ms / 1000, true),
      setVolume: (pct) => playerRef.current?.setVolume?.(pct),
      isReady: () => readyRef.current,
      getState: () => {
        const p = playerRef.current;
        if (!p?.getPlayerState) return null;
        return {
          isPlaying: p.getPlayerState() === 1,
          currentTime: (p.getCurrentTime?.() || 0) * 1000,
          duration: (p.getDuration?.() || 0) * 1000,
          volume: p.getVolume?.() || 50,
        };
      },
    };

    return () => { delete window.__ytEngine; };
  }, []);

  // Off-screen container — real dimensions needed for audio, but invisible
  return <div ref={containerRef} style={{ position: "fixed", left: -9999, top: -9999, width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />;
}
