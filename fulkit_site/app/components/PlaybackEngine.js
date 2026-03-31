"use client";
import SpotifyEngine from "./engines/SpotifyEngine";
import YouTubeEngine from "./engines/YouTubeEngine";

// Polymorphic playback engine — renders provider-specific SDK bridges
// Only connected providers are mounted. Only one plays at a time.
// YouTube is always available as the free fallback.
export default function PlaybackEngine({ connectedProviders, onDeviceReady, onDeviceLost }) {
  return (
    <>
      {/* SpotifyEngine disabled — web-playback scope 403 is a Spotify Dashboard issue.
          Not needed for Sonos (speakers are direct Spotify Connect devices).
          Re-enable when Dashboard permissions are fixed. */}
      {false && connectedProviders?.spotify && (
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
