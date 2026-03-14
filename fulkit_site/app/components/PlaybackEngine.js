"use client";
import SpotifyEngine from "./engines/SpotifyEngine";

// Polymorphic playback engine — renders provider-specific SDK bridges
// Only connected providers are mounted. Only one plays at a time.
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
      {/* Future engines:
        {connectedProviders?.apple && <AppleEngine ... />}
        {connectedProviders?.soundcloud && <SoundCloudEngine ... />}
      */}
    </>
  );
}
