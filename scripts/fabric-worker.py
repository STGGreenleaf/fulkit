#!/usr/bin/env python3
"""
Fabric Signal Pipeline Worker

Polls fabric_jobs for pending tracks, streams audio via yt-dlp → ffmpeg
(memory only, never disk), extracts per-500ms spectral snapshots, and
stores the timeline JSON to fabric_timelines.

The audio is buffered in memory and discarded after analysis.
Only the mathematical description (JSON of frequency bands, loudness,
flux, onsets) is persisted. This is accessibility description data —
a visual representation of the sound for anyone who plays the track.

Usage:
  python3 fabric-worker.py

Environment variables (in .env or exported):
  SUPABASE_URL          — Supabase project URL
  SUPABASE_SERVICE_KEY  — Supabase service role key

Requires: yt-dlp, ffmpeg, numpy, scipy, supabase-py
"""

import os
import sys
import json
import time
import struct
import subprocess
import logging
from pathlib import Path

import numpy as np
from scipy.signal import find_peaks
from supabase import create_client

# ── Config ──

RESOLUTION_MS = 100
SAMPLE_RATE = 44100
SAMPLES_PER_WINDOW = int(SAMPLE_RATE * RESOLUTION_MS / 1000)  # 22050
MAX_ATTEMPTS = 3
POLL_INTERVAL = 3  # seconds between polls
DURATION_TOLERANCE = 8  # seconds tolerance for YouTube match

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("fabric-worker")

# ── Supabase client ──

def get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        # Try .env file
        env_path = Path(__file__).parent / ".env"
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()
            url = os.environ.get("SUPABASE_URL")
            key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        log.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        sys.exit(1)
    return create_client(url, key)


# ── FFT Feature Extraction ──

# Frequency band bin ranges at 44.1kHz with FFT size = SAMPLES_PER_WINDOW
# Bin resolution = SAMPLE_RATE / FFT_SIZE ≈ 2 Hz per bin
BANDS = {
    "sub":      (1, 3),       # ~2–6 Hz → 20–60 Hz (scaled)
    "bass":     (3, 12),      # 60–250 Hz
    "low_mid":  (12, 23),     # 250–500 Hz
    "mid":      (23, 93),     # 500–2000 Hz
    "high_mid": (93, 279),    # 2–6 kHz
    "high":     (279, 557),   # 6–12 kHz
    "air":      (557, 927),   # 12–20 kHz
}


def extract_features(pcm_data: bytes) -> list[dict]:
    """Extract per-window spectral features from raw PCM float32 mono data."""
    # Parse raw float32 PCM
    n_samples = len(pcm_data) // 4
    audio = np.frombuffer(pcm_data, dtype=np.float32)[:n_samples]

    # Hanning window
    hann = np.hanning(SAMPLES_PER_WINDOW)
    n_windows = len(audio) // SAMPLES_PER_WINDOW
    if n_windows == 0:
        return []

    timeline = []
    prev_fft = None
    flux_history = []

    for i in range(n_windows):
        start = i * SAMPLES_PER_WINDOW
        window = audio[start:start + SAMPLES_PER_WINDOW]
        if len(window) < SAMPLES_PER_WINDOW:
            break

        # Apply window and FFT
        windowed = window * hann
        fft_mag = np.abs(np.fft.rfft(windowed))

        # Normalize FFT to 0–1 range
        fft_max = fft_mag.max() if fft_mag.max() > 0 else 1.0

        # Frequency bands (mean energy per band, normalized)
        bands = {}
        for name, (lo, hi) in BANDS.items():
            hi = min(hi, len(fft_mag))
            if lo >= hi:
                bands[name] = 0.0
            else:
                bands[name] = float(np.mean(fft_mag[lo:hi]) / fft_max)

        # Loudness (RMS of time domain)
        rms = float(np.sqrt(np.mean(window ** 2)))
        loudness = min(1.0, rms * 5)  # scale up, cap at 1

        # Spectral centroid (weighted average frequency)
        freqs = np.fft.rfftfreq(SAMPLES_PER_WINDOW, 1.0 / SAMPLE_RATE)
        fft_sum = fft_mag.sum()
        if fft_sum > 0:
            centroid = float(np.sum(freqs * fft_mag) / fft_sum) / (SAMPLE_RATE / 2)
        else:
            centroid = 0.0

        # Spectral spread
        if fft_sum > 0:
            spread = float(np.sqrt(np.sum(((freqs - centroid * SAMPLE_RATE / 2) ** 2) * fft_mag) / fft_sum)) / (SAMPLE_RATE / 2)
        else:
            spread = 0.0

        # Spectral rolloff (frequency below which 85% of energy)
        cumsum = np.cumsum(fft_mag)
        rolloff_idx = np.searchsorted(cumsum, 0.85 * fft_sum) if fft_sum > 0 else 0
        rolloff = float(rolloff_idx) / len(fft_mag)

        # Zero crossing rate
        zcr = float(np.sum(np.abs(np.diff(np.sign(window)))) / (2 * len(window)))

        # Spectral flux (half-wave rectified change from previous frame)
        if prev_fft is not None:
            diff = fft_mag - prev_fft
            flux = float(np.sum(np.maximum(0, diff)) / fft_max) if fft_max > 0 else 0.0
        else:
            flux = 0.0
        prev_fft = fft_mag.copy()

        # Onset detection (adaptive threshold on flux)
        flux_history.append(flux)
        if len(flux_history) > 20:
            flux_history = flux_history[-20:]
        adaptive_threshold = np.mean(flux_history) + 1.5 * np.std(flux_history) if len(flux_history) > 3 else 0.5
        onset = flux > adaptive_threshold
        onset_strength = min(1.0, flux / max(adaptive_threshold, 0.01)) if onset else 0.0

        # Dynamic range (max - min in window)
        dynamic_range = float(np.max(window) - np.min(window))

        snapshot = {
            "t": round(i * RESOLUTION_MS / 1000, 2),
            "loudness": round(float(loudness), 4),
            "bands": {k: round(float(v), 4) for k, v in bands.items()},
            "spectral_centroid": round(float(centroid), 4),
            "spectral_spread": round(float(min(1.0, spread)), 4),
            "spectral_rolloff": round(float(rolloff), 4),
            "spectral_flux": round(float(min(1.0, flux)), 4),
            "zero_crossing_rate": round(float(zcr), 4),
            "dynamic_range": round(float(min(1.0, dynamic_range)), 4),
            "flux": round(float(min(1.0, flux)), 4),
            "onset": bool(onset),
            "onset_strength": round(float(onset_strength), 4),
            "beat": False,
            "beat_strength": 0.0,
        }
        timeline.append(snapshot)

    # ── Beat detection pass ──
    if len(timeline) > 10:
        onsets = [s["onset_strength"] for s in timeline]
        onset_arr = np.array(onsets)

        # Find peaks in onset strength
        peaks, properties = find_peaks(onset_arr, height=0.3, distance=2)

        if len(peaks) > 2:
            # Auto-correlate peak intervals to find dominant beat period
            intervals = np.diff(peaks)
            if len(intervals) > 2:
                # Most common interval ± 1
                from collections import Counter
                interval_counts = Counter(intervals)
                dominant = interval_counts.most_common(1)[0][0]

                # Mark beats at detected peaks that are close to the dominant interval
                for j, p in enumerate(peaks):
                    timeline[p]["beat"] = True
                    timeline[p]["beat_strength"] = round(float(min(1.0, onset_arr[p])), 4)

    return timeline


# ── YouTube Audio Streaming ──

def stream_youtube_audio(query: str, duration_hint: int = None) -> bytes | None:
    """
    Search YouTube, stream audio to memory via yt-dlp + ffmpeg.
    Returns raw PCM float32 mono bytes. Never writes to disk.
    """
    # Step 1: Search YouTube and get best audio URL
    log.info(f"Searching YouTube: {query}")
    try:
        search_result = subprocess.run(
            [
                "yt-dlp",
                "--no-download",
                "--print", "%(id)s %(duration)s %(title)s",
                f"ytsearch5:{query}",
            ],
            capture_output=True, text=True, timeout=30,
        )
        if search_result.returncode != 0:
            log.error(f"yt-dlp search failed: {search_result.stderr[:200]}")
            return None

        # Parse results and pick best match
        candidates = []
        for line in search_result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split(None, 2)
            if len(parts) < 2:
                continue
            vid_id = parts[0]
            try:
                vid_duration = int(float(parts[1]))
            except (ValueError, IndexError):
                continue
            vid_title = parts[2] if len(parts) > 2 else ""
            candidates.append((vid_id, vid_duration, vid_title))

        if not candidates:
            log.error("No YouTube results found")
            return None

        # Score candidates: prefer duration match
        best = candidates[0]
        if duration_hint:
            for c in candidates:
                if abs(c[1] - duration_hint) < abs(best[1] - duration_hint):
                    best = c
            if abs(best[1] - duration_hint) > DURATION_TOLERANCE:
                log.warning(f"Best match duration {best[1]}s vs hint {duration_hint}s (>{DURATION_TOLERANCE}s off)")

        vid_id, vid_duration, vid_title = best
        log.info(f"Selected: {vid_title} ({vid_id}, {vid_duration}s)")

    except subprocess.TimeoutExpired:
        log.error("yt-dlp search timed out")
        return None

    # Step 2: Stream audio through yt-dlp → ffmpeg → raw PCM (all in memory)
    log.info(f"Streaming audio for analysis...")
    try:
        # yt-dlp outputs to stdout, ffmpeg reads from stdin
        yt_proc = subprocess.Popen(
            [
                "yt-dlp",
                "-f", "bestaudio",
                "-o", "-",
                f"https://www.youtube.com/watch?v={vid_id}",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )

        ff_proc = subprocess.Popen(
            [
                "ffmpeg",
                "-i", "pipe:0",
                "-f", "f32le",
                "-acodec", "pcm_f32le",
                "-ar", str(SAMPLE_RATE),
                "-ac", "1",
                "pipe:1",
            ],
            stdin=yt_proc.stdout,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )

        # Let yt-dlp's stdout flow directly to ffmpeg
        yt_proc.stdout.close()

        # Read all PCM data into memory
        pcm_data, _ = ff_proc.communicate(timeout=300)  # 5 min max

        yt_proc.wait(timeout=10)

        if ff_proc.returncode != 0:
            log.error(f"ffmpeg failed with code {ff_proc.returncode}")
            return None

        log.info(f"Captured {len(pcm_data)} bytes ({len(pcm_data) / 4 / SAMPLE_RATE:.1f}s of audio)")
        return pcm_data

    except subprocess.TimeoutExpired:
        log.error("Audio streaming timed out")
        try:
            yt_proc.kill()
            ff_proc.kill()
        except:
            pass
        return None
    except Exception as e:
        log.error(f"Stream error: {e}")
        return None


# ── Main Worker Loop ──

def process_job(sb, job: dict) -> bool:
    """Process a single fabric_jobs entry. Returns True on success."""
    track_id = job["track_id"]
    query = job["youtube_query"]
    duration_hint = job.get("duration_hint")

    log.info(f"Processing: {query} (track_id={track_id})")

    # Mark as processing
    sb.table("fabric_jobs").update({
        "status": "processing",
        "attempts": job["attempts"] + 1,
        "updated_at": "now()",
    }).eq("id", job["id"]).execute()

    # Stream and analyze
    pcm_data = stream_youtube_audio(query, duration_hint)
    if not pcm_data:
        sb.table("fabric_jobs").update({
            "status": "failed",
            "error": "no audio data",
            "updated_at": "now()",
        }).eq("id", job["id"]).execute()
        return False

    # Extract features
    timeline = extract_features(pcm_data)
    del pcm_data  # free memory immediately

    if not timeline or len(timeline) < 5:
        sb.table("fabric_jobs").update({
            "status": "failed",
            "error": f"too few snapshots ({len(timeline)})",
            "updated_at": "now()",
        }).eq("id", job["id"]).execute()
        return False

    # Store timeline
    timeline_json = json.dumps(timeline)
    size_bytes = len(timeline_json.encode("utf-8"))

    log.info(f"Storing timeline: {len(timeline)} snapshots, {size_bytes / 1024:.1f} KB")

    # Look up or create fabric_tracks row (track_id here is a source_id like Spotify ID)
    duration_ms = int(len(timeline) * RESOLUTION_MS)
    result = sb.table("fabric_tracks").select("id").eq("source_id", track_id).limit(1).execute()
    if result.data:
        fabric_track_uuid = result.data[0]["id"]
    else:
        # Create minimal track entry
        parts = query.split(" - ", 1)
        insert_result = sb.table("fabric_tracks").insert({
            "source_id": track_id,
            "title": parts[1] if len(parts) > 1 else query,
            "artist": parts[0] if len(parts) > 1 else "",
            "duration_ms": duration_ms,
            "provider": "spotify",
            "status": "complete",
            "analysis_version": 3,
        }).execute()
        fabric_track_uuid = insert_result.data[0]["id"]

    sb.table("fabric_timelines").upsert({
        "track_id": fabric_track_uuid,
        "resolution_ms": RESOLUTION_MS,
        "timeline": timeline,
        "size_bytes": size_bytes,
    }).execute()

    # Mark fabric_tracks as complete
    sb.table("fabric_tracks").update({
        "status": "complete",
        "analysis_version": 3,
    }).eq("id", fabric_track_uuid).execute()

    # Mark job complete
    sb.table("fabric_jobs").update({
        "status": "complete",
        "updated_at": "now()",
    }).eq("id", job["id"]).execute()

    log.info(f"Done: {query} ({len(timeline)} snapshots)")
    return True


def main():
    log.info("Fabric Signal Pipeline Worker starting...")
    sb = get_supabase()

    # Verify connection
    try:
        result = sb.table("fabric_jobs").select("id").limit(1).execute()
        log.info("Connected to Supabase")
    except Exception as e:
        log.error(f"Failed to connect to Supabase: {e}")
        sys.exit(1)

    while True:
        try:
            # Poll for pending jobs (oldest first)
            result = sb.table("fabric_jobs") \
                .select("*") \
                .eq("status", "pending") \
                .lt("attempts", MAX_ATTEMPTS) \
                .order("created_at") \
                .limit(1) \
                .execute()

            if result.data:
                job = result.data[0]
                try:
                    process_job(sb, job)
                except Exception as e:
                    log.error(f"Job failed: {e}")
                    sb.table("fabric_jobs").update({
                        "status": "failed",
                        "error": str(e)[:500],
                        "updated_at": "now()",
                    }).eq("id", job["id"]).execute()

            # Also retry failed jobs that haven't exceeded max attempts
            result = sb.table("fabric_jobs") \
                .select("*") \
                .eq("status", "failed") \
                .lt("attempts", MAX_ATTEMPTS) \
                .order("created_at") \
                .limit(1) \
                .execute()

            if result.data:
                job = result.data[0]
                sb.table("fabric_jobs").update({
                    "status": "pending",
                    "updated_at": "now()",
                }).eq("id", job["id"]).execute()

        except Exception as e:
            log.error(f"Poll error: {e}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
