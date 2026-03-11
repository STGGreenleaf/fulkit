"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "../lib/auth";

// Spotify Web Playback SDK — makes Fulkit a Spotify Connect device
// Loads the SDK script, initializes a player, auto-transfers playback
export default function SpotifyPlayer({ connected, onDeviceReady, onDeviceLost }) {
  const { accessToken } = useAuth();
  const playerRef = useRef(null);
  const deviceIdRef = useRef(null);
  const [sdkReady, setSdkReady] = useState(false);

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
    if (!sdkReady || !connected || !accessToken) return;

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
        console.error("[Spotify SDK] Auth error:", message);
        onDeviceLost?.();
      });

      player.addListener("account_error", ({ message }) => {
        console.error("[Spotify SDK] Account error (Premium required):", message);
      });

      const success = await player.connect();
      if (success) {
        console.log("[Spotify SDK] Connected to Spotify");
        playerRef.current = player;
      }
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        deviceIdRef.current = null;
      }
    };
  }, [sdkReady, connected, accessToken, getToken, onDeviceReady, onDeviceLost]);

  // No UI — this is a headless component
  return null;
}
