"use client";
import SpotifyEngine from "./engines/SpotifyEngine";
import YouTubeEngine from "./engines/YouTubeEngine";

// Polymorphic playback engine — renders provider-specific SDK bridges
// Only connected providers are mounted. Only one plays at a time.
// YouTube is always available as the free fallback.
export default function PlaybackEngine({ connectedProviders, onDeviceReady, onDeviceLost }) {
  return (
    <>
      {connectedProviders?.spotify && (
        <SpotifyEngine
          connected={true}
          onDeviceReady={onDeviceReady}
          onDeviceLost={onDeviceLost}
        />
      )}
      <YouTubeEngine />
    </>
  );
}
