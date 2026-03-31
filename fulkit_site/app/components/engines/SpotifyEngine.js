"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "../../lib/auth";
import { ThumbprintBuilder } from "../../lib/thumbprint";

// Spotify Web Playback SDK — makes Fulkit a Spotify Connect device
// Also captures thumbprint data via Web Audio API AnalyserNode
export default function SpotifyEngine({ connected, onDeviceReady, onDeviceLost }) {
  const { accessToken } = useAuth();
  const playerRef = useRef(null);
  const deviceIdRef = useRef(null);
  const [sdkReady, setSdkReady] = useState(false);
  const authFailedRef = useRef(false); // Stop reconnect loop on scope errors
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const thumbprintRef = useRef(null);
  const captureFrameRef = useRef(null);
  const currentTrackRef = useRef(null);

  // Fetch a fresh Spotify token from our server
  const getToken = useCallback(async () => {
    if (!accessToken) return null;
    try {
      const res = await fetch("/api/fabric/token", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.token || null;
    } catch { return null; }
  }, [accessToken]);

  // Load SDK script once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Spotify) { setSdkReady(true); return; }

    window.onSpotifyWebPlaybackSDKReady = () => setSdkReady(true);

    if (!document.getElementById("spotify-sdk")) {
      const script = document.createElement("script");
      script.id = "spotify-sdk";
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Initialize player when SDK + connection are ready
  useEffect(() => {
    if (!sdkReady || !connected || !accessToken || authFailedRef.current) return;

    const initPlayer = async () => {
      const token = await getToken();
      if (!token) return;

      // Disconnect existing player if any
      if (playerRef.current) {
        playerRef.current.disconnect();
      }

      const player = new window.Spotify.Player({
        name: "Fülkit",
        getOAuthToken: async (cb) => {
          const t = await getToken();
          cb(t || "");
        },
        volume: 0.5,
      });

      player.addListener("ready", ({ device_id }) => {
        console.log("[Spotify SDK] Device ready:", device_id);
        deviceIdRef.current = device_id;
        onDeviceReady?.(device_id);
      });

      player.addListener("not_ready", ({ device_id }) => {
        console.log("[Spotify SDK] Device not ready:", device_id);
        deviceIdRef.current = null;
        onDeviceLost?.();
      });

      player.addListener("initialization_error", ({ message }) => {
        console.error("[Spotify SDK] Init error:", message);
      });

      player.addListener("authentication_error", ({ message }) => {
        console.error("[Spotify SDK] Auth error:", message, "— SDK disabled until re-auth");
        authFailedRef.current = true;
        // Kill everything — remove listeners, disconnect, null out player
        player.removeListener("ready");
        player.removeListener("not_ready");
        player.removeListener("player_state_changed");
        player.removeListener("authentication_error");
        player.removeListener("initialization_error");
        player.removeListener("account_error");
        player.disconnect();
        playerRef.current = null;
        deviceIdRef.current = null;
        onDeviceLost?.();
      });

      player.addListener("account_error", ({ message }) => {
        console.error("[Spotify SDK] Account error (Premium required):", message);
      });

      // Track changes — manage thumbprint capture per song
      player.addListener("player_state_changed", (state) => {
        if (!state || authFailedRef.current) return;
        const trackId = state.track_window?.current_track?.id;
        const isPlaying = !state.paused;

        // New track started
        if (trackId && trackId !== currentTrackRef.current) {
          // Finalize previous thumbprint if exists
          if (thumbprintRef.current && currentTrackRef.current) {
            const result = thumbprintRef.current.finalize();
            if (result && result.snapshot_count > 10) {
              uploadThumbprint(currentTrackRef.current, result);
            }
          }
          currentTrackRef.current = trackId;
          if (!thumbprintRef.current) thumbprintRef.current = new ThumbprintBuilder();
          thumbprintRef.current.reset();
        }

        // Start/stop capture loop based on play state
        if (isPlaying && analyserRef.current && thumbprintRef.current) {
          startCapture();
        } else {
          stopCapture();
        }
      });

      const success = await player.connect();
      if (success) {
        console.log("[Spotify SDK] Connected to Spotify");
        playerRef.current = player;

        // Try to attach Web Audio AnalyserNode to SDK's audio output
        try {
          if (typeof AudioContext !== "undefined" && !audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
          }
          // Spotify SDK exposes _activeDeviceId and internal audio — try to find it
          const audioElements = document.querySelectorAll("audio");
          for (const el of audioElements) {
            if (el.src?.includes("scdn") || el.src?.includes("spotify")) {
              const source = audioCtxRef.current.createMediaElementSource(el);
              analyserRef.current = audioCtxRef.current.createAnalyser();
              analyserRef.current.fftSize = 16384;
              source.connect(analyserRef.current);
              analyserRef.current.connect(audioCtxRef.current.destination);
              console.log("[Spotify SDK] AnalyserNode attached for thumbprint capture");
              break;
            }
          }
        } catch (e) {
          console.log("[Spotify SDK] Could not attach AnalyserNode:", e.message);
        }
      }
    };

    const startCapture = () => {
      if (captureFrameRef.current) return;
      const loop = () => {
        if (analyserRef.current && thumbprintRef.current) {
          thumbprintRef.current.capture(analyserRef.current, performance.now());
        }
        captureFrameRef.current = requestAnimationFrame(loop);
      };
      captureFrameRef.current = requestAnimationFrame(loop);
    };

    const stopCapture = () => {
      if (captureFrameRef.current) {
        cancelAnimationFrame(captureFrameRef.current);
        captureFrameRef.current = null;
      }
    };

    const uploadThumbprint = async (trackId, data) => {
      try {
        const res = await fetch("/api/fabric/timeline", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ trackId, ...data }),
        });
        if (res.ok) console.log("[Thumbprint] Uploaded for track:", trackId);
      } catch (e) {
        console.log("[Thumbprint] Upload failed:", e.message);
      }
    };

    initPlayer();

    return () => {
      stopCapture();
      // Finalize any in-progress thumbprint
      if (thumbprintRef.current && currentTrackRef.current) {
        const result = thumbprintRef.current.finalize();
        if (result && result.snapshot_count > 10) {
          uploadThumbprint(currentTrackRef.current, result);
        }
      }
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        deviceIdRef.current = null;
      }
    };
  }, [sdkReady, connected, accessToken, getToken, onDeviceReady, onDeviceLost]);

  // Expose analyser for Signal Terrain real-time visualization
  useEffect(() => {
    window.__spotifyAnalyser = analyserRef.current;
    return () => { delete window.__spotifyAnalyser; };
  });

  // No UI — this is a headless component
  return null;
}
