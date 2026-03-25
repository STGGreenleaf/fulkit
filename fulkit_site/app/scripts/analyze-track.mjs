#!/usr/bin/env node
/**
 * Fabric Pipeline — Analyze a track
 *
 * Usage:
 *   node scripts/analyze-track.mjs <source_id> [--title "Song"] [--artist "Artist"] [--duration 240000]
 *   node scripts/analyze-track.mjs <source_id> --youtube "https://youtube.com/watch?v=..."
 *
 * What it does:
 *   1. Searches YouTube for the track (or uses provided URL)
 *   2. Downloads audio via yt-dlp
 *   3. Converts to raw PCM via ffmpeg
 *   4. Analyzes: RMS, 7 frequency bands, spectral features, beat/onset detection
 *   5. Uploads timeline to Supabase fabric_tracks + fabric_timelines
 *
 * Requires: yt-dlp, ffmpeg (brew install yt-dlp ffmpeg)
 */

import { execSync, execFileSync } from "child_process";
import { readFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import FFT from "fft.js";
import { config } from "dotenv";

// Load .env.local
config({ path: new URL("../.env.local", import.meta.url).pathname });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE env vars in .env.local");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ═══════════════════════════════════════════
// Config
// ═══════════════════════════════════════════
const SAMPLE_RATE = 22050; // downsample for analysis (faster, sufficient)
const WINDOW_MS = 100; // snapshot every 100ms (10 snapshots/sec — high quality)
const WINDOW_SAMPLES = Math.floor(SAMPLE_RATE * WINDOW_MS / 1000); // 2205
const FFT_SIZE = 16384; // zero-padded for high freq resolution
const TMP_DIR = "/tmp/fabric-analysis";

// Frequency band boundaries in Hz → FFT bin indices
const BANDS = {
  sub:      [20, 60],
  bass:     [60, 250],
  low_mid:  [250, 500],
  mid:      [500, 2000],
  high_mid: [2000, 4000],
  high:     [4000, 8000],
  air:      [8000, 11025], // Nyquist at 22050/2
};

function hzToBin(hz) {
  return Math.round(hz * FFT_SIZE / SAMPLE_RATE);
}

// ═══════════════════════════════════════════
// Parse args
// ═══════════════════════════════════════════
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: node scripts/analyze-track.mjs <source_id> [--title \"Song\"] [--artist \"Artist\"] [--duration 240000] [--youtube \"URL\"]");
  process.exit(0);
}

const spotifyId = args[0];
let title = "", artist = "", durationMs = 0, youtubeUrl = "";
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--title" && args[i + 1]) { title = args[++i]; }
  else if (args[i] === "--artist" && args[i + 1]) { artist = args[++i]; }
  else if (args[i] === "--duration" && args[i + 1]) { durationMs = parseInt(args[++i]); }
  else if (args[i] === "--youtube" && args[i + 1]) { youtubeUrl = args[++i]; }
}

// ═══════════════════════════════════════════
// Step 0: Lookup track info from Spotify if not provided
// ═══════════════════════════════════════════
async function lookupSpotifyTrack(spotifyId) {
  // Try to get basic info from ReccoBeats (no auth needed)
  try {
    const res = await fetch(`https://api.reccobeats.com/v1/track?ids=${spotifyId}`);
    const data = await res.json();
    const track = data.content?.[0];
    if (track) {
      return {
        title: track.name || title,
        artist: track.artists?.map(a => a.name).join(", ") || artist,
        durationMs: track.duration_ms || durationMs,
      };
    }
  } catch {}
  return { title, artist, durationMs };
}

// ═══════════════════════════════════════════
// Step 1: YouTube search + download
// ═══════════════════════════════════════════
function searchAndDownload(artist, title, durationSec) {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
  const outPath = `${TMP_DIR}/${spotifyId}.wav`;

  if (youtubeUrl) {
    console.log(`  Downloading from provided URL: ${youtubeUrl}`);
    execSync(
      `yt-dlp -x --audio-format wav -o "${TMP_DIR}/${spotifyId}.%(ext)s" "${youtubeUrl}"`,
      { stdio: "pipe", timeout: 120000 }
    );
  } else {
    const query = `${artist} ${title} official audio`;
    console.log(`  Searching YouTube: "${query}"`);

    // Search and download best match
    execSync(
      `yt-dlp -x --audio-format wav -o "${TMP_DIR}/${spotifyId}.%(ext)s" "ytsearch1:${query}"`,
      { stdio: "pipe", timeout: 120000 }
    );
  }

  // Convert to mono 22050Hz raw PCM for analysis
  const pcmPath = `${TMP_DIR}/${spotifyId}.pcm`;
  execSync(
    `ffmpeg -y -i "${outPath}" -ac 1 -ar ${SAMPLE_RATE} -f f32le "${pcmPath}"`,
    { stdio: "pipe", timeout: 60000 }
  );

  // Clean up wav
  if (existsSync(outPath)) unlinkSync(outPath);

  return pcmPath;
}

// ═══════════════════════════════════════════
// Step 2: Audio analysis — the real deal
// ═══════════════════════════════════════════
function analyzeAudio(pcmPath) {
  console.log("  Reading PCM data...");
  const rawBuf = readFileSync(pcmPath);
  const samples = new Float32Array(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength / 4);
  const totalSamples = samples.length;
  const durationSec = totalSamples / SAMPLE_RATE;
  console.log(`  Duration: ${durationSec.toFixed(1)}s, ${totalSamples} samples`);

  const fft = new FFT(FFT_SIZE);
  const fftInput = fft.createComplexArray();
  const fftOutput = fft.createComplexArray();

  // Hann window
  const hann = new Float32Array(WINDOW_SAMPLES);
  for (let i = 0; i < WINDOW_SAMPLES; i++) {
    hann[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (WINDOW_SAMPLES - 1)));
  }

  const timeline = [];
  let prevMagnitudes = null;

  // Onset detection accumulator for beat tracking
  const onsetValues = [];
  const fluxValues = [];

  const totalWindows = Math.floor((totalSamples - WINDOW_SAMPLES) / (WINDOW_SAMPLES)) + 1;
  console.log(`  Analyzing ${totalWindows} windows...`);

  for (let w = 0; w < totalWindows; w++) {
    const offset = w * WINDOW_SAMPLES;
    const t = (offset + WINDOW_SAMPLES / 2) / SAMPLE_RATE;

    // ── RMS loudness ──
    let sumSq = 0;
    for (let i = 0; i < WINDOW_SAMPLES; i++) {
      const s = samples[offset + i] || 0;
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / WINDOW_SAMPLES);

    // ── Zero crossing rate ──
    let crossings = 0;
    for (let i = 1; i < WINDOW_SAMPLES; i++) {
      if ((samples[offset + i] >= 0) !== (samples[offset + i - 1] >= 0)) crossings++;
    }
    const zcr = crossings / WINDOW_SAMPLES;

    // ── FFT ──
    // Zero-pad windowed signal into FFT input
    for (let i = 0; i < FFT_SIZE * 2; i++) fftInput[i] = 0;
    for (let i = 0; i < WINDOW_SAMPLES; i++) {
      fftInput[i * 2] = (samples[offset + i] || 0) * hann[i]; // real
      // imag stays 0
    }
    fft.transform(fftOutput, fftInput);

    // Compute magnitudes
    const magnitudes = new Float32Array(FFT_SIZE / 2);
    for (let i = 0; i < FFT_SIZE / 2; i++) {
      const re = fftOutput[i * 2];
      const im = fftOutput[i * 2 + 1];
      magnitudes[i] = Math.sqrt(re * re + im * im);
    }

    // ── Frequency bands ──
    const bands = {};
    for (const [name, [lo, hi]] of Object.entries(BANDS)) {
      const binLo = hzToBin(lo);
      const binHi = Math.min(hzToBin(hi), FFT_SIZE / 2 - 1);
      let sum = 0, count = 0;
      for (let i = binLo; i <= binHi; i++) {
        sum += magnitudes[i];
        count++;
      }
      bands[name] = count > 0 ? sum / count : 0;
    }

    // Normalize bands to 0-1 (relative to max)
    const maxBand = Math.max(...Object.values(bands), 0.0001);
    for (const name of Object.keys(bands)) {
      bands[name] = Math.min(1, bands[name] / maxBand);
    }

    // ── Spectral centroid ──
    let weightedSum = 0, magSum = 0;
    for (let i = 1; i < FFT_SIZE / 2; i++) {
      const freq = i * SAMPLE_RATE / FFT_SIZE;
      weightedSum += freq * magnitudes[i];
      magSum += magnitudes[i];
    }
    const centroidHz = magSum > 0 ? weightedSum / magSum : 0;
    const spectral_centroid = Math.min(1, centroidHz / (SAMPLE_RATE / 2));

    // ── Spectral spread ──
    let spreadSum = 0;
    for (let i = 1; i < FFT_SIZE / 2; i++) {
      const freq = i * SAMPLE_RATE / FFT_SIZE;
      spreadSum += magnitudes[i] * Math.pow(freq - centroidHz, 2);
    }
    const spectral_spread = magSum > 0
      ? Math.min(1, Math.sqrt(spreadSum / magSum) / (SAMPLE_RATE / 4))
      : 0;

    // ── Spectral rolloff (85% energy) ──
    let rolloffSum = 0;
    const totalEnergy = magnitudes.reduce((a, b) => a + b, 0);
    const rolloffThresh = totalEnergy * 0.85;
    let rolloffBin = FFT_SIZE / 2 - 1;
    for (let i = 0; i < FFT_SIZE / 2; i++) {
      rolloffSum += magnitudes[i];
      if (rolloffSum >= rolloffThresh) {
        rolloffBin = i;
        break;
      }
    }
    const spectral_rolloff = rolloffBin / (FFT_SIZE / 2);

    // ── Spectral flux (onset indicator) ──
    let flux = 0;
    if (prevMagnitudes) {
      for (let i = 0; i < FFT_SIZE / 2; i++) {
        const diff = magnitudes[i] - prevMagnitudes[i];
        if (diff > 0) flux += diff; // half-wave rectified
      }
      flux /= (FFT_SIZE / 2);
    }
    prevMagnitudes = magnitudes.slice();
    fluxValues.push(flux);

    // ── Dynamic range within window ──
    let windowMin = Infinity, windowMax = -Infinity;
    for (let i = 0; i < WINDOW_SAMPLES; i++) {
      const s = Math.abs(samples[offset + i] || 0);
      if (s < windowMin) windowMin = s;
      if (s > windowMax) windowMax = s;
    }
    const dynamic_range = windowMax > 0 ? (windowMax - windowMin) / windowMax : 0;

    // Store snapshot
    timeline.push({
      t: Math.round(t * 100) / 100,
      loudness: rms,
      bands,
      flux,
      spectral_centroid,
      spectral_spread,
      spectral_rolloff,
      zero_crossing_rate: zcr,
      dynamic_range,
    });
  }

  // ── Post-processing: normalize loudness globally ──
  const maxLoudness = Math.max(...timeline.map(s => s.loudness), 0.0001);
  for (const snap of timeline) {
    snap.loudness = Math.min(1, snap.loudness / maxLoudness);
  }

  // ── Post-processing: normalize flux globally ──
  const maxFlux = Math.max(...fluxValues.filter(f => f > 0), 0.0001);
  for (let i = 0; i < timeline.length; i++) {
    timeline[i].flux = Math.min(1, timeline[i].flux / maxFlux);
  }

  // ── Beat detection via onset peaks ──
  // Adaptive threshold: local mean + 0.5 * local std
  const ONSET_WINDOW = 8; // ±4 snapshots context
  for (let i = 0; i < timeline.length; i++) {
    const lo = Math.max(0, i - ONSET_WINDOW);
    const hi = Math.min(timeline.length - 1, i + ONSET_WINDOW);
    const localFlux = [];
    for (let j = lo; j <= hi; j++) localFlux.push(timeline[j].flux);
    const mean = localFlux.reduce((a, b) => a + b, 0) / localFlux.length;
    const std = Math.sqrt(localFlux.reduce((a, b) => a + (b - mean) ** 2, 0) / localFlux.length);
    const threshold = mean + 0.5 * std;

    const isOnset = timeline[i].flux > threshold && timeline[i].flux > 0.1;
    timeline[i].onset = isOnset;
    timeline[i].onset_strength = isOnset ? Math.min(1, timeline[i].flux / maxFlux) : 0;
  }

  // ── Simple beat grid estimation from onset autocorrelation ──
  // Find dominant period from onset intervals
  const onsetTimes = timeline.filter(s => s.onset).map(s => s.t);
  if (onsetTimes.length >= 4) {
    const intervals = [];
    for (let i = 1; i < onsetTimes.length; i++) {
      intervals.push(onsetTimes[i] - onsetTimes[i - 1]);
    }
    // Find most common interval (quantized to 50ms)
    const buckets = {};
    for (const iv of intervals) {
      const q = Math.round(iv * 20) / 20; // 50ms quantization
      if (q > 0.2 && q < 2.0) {
        buckets[q] = (buckets[q] || 0) + 1;
      }
    }
    const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const beatPeriod = parseFloat(sorted[0][0]);
      const detectedBpm = Math.round(60 / beatPeriod);
      console.log(`  Detected BPM: ~${detectedBpm} (period: ${beatPeriod}s)`);

      // Mark beat positions
      for (const snap of timeline) {
        const phase = (snap.t % beatPeriod) / beatPeriod;
        snap.beat = phase < 0.15 || phase > 0.85; // near beat boundary
        snap.beat_strength = snap.beat ? (1 - Math.min(phase, 1 - phase) * 6) : 0;
        // Downbeat: every 4 beats
        const barPeriod = beatPeriod * 4;
        const barPhase = (snap.t % barPeriod) / barPeriod;
        snap.downbeat = snap.beat && (barPhase < 0.04 || barPhase > 0.96);
      }
    }
  }

  // Mark any snapshots without beat data
  for (const snap of timeline) {
    if (snap.beat === undefined) {
      snap.beat = false;
      snap.beat_strength = 0;
      snap.downbeat = false;
    }
  }

  console.log(`  Generated ${timeline.length} snapshots (${WINDOW_MS}ms resolution)`);
  return { timeline, durationSec };
}

// ═══════════════════════════════════════════
// Step 3: Upload to Supabase
// ═══════════════════════════════════════════
async function uploadToSupabase(spotifyId, title, artist, durationMs, timeline) {
  console.log("  Uploading to Supabase...");

  // Compute summary from timeline
  const avgLoudness = timeline.reduce((a, s) => a + s.loudness, 0) / timeline.length;
  const avgBands = {};
  for (const band of Object.keys(BANDS)) {
    avgBands[band] = timeline.reduce((a, s) => a + (s.bands[band] || 0), 0) / timeline.length;
  }

  // Upsert track
  const compositeKey = `${artist.toLowerCase().trim()}|${title.toLowerCase().trim()}|${Math.round(durationMs / 5000) * 5}`;

  const { data: track, error: trackErr } = await supabase
    .from("fabric_tracks")
    .upsert({
      source_id: spotifyId,
      composite_key: compositeKey,
      title,
      artist,
      duration_ms: durationMs,
      status: "complete",
      analyzed_at: new Date().toISOString(),
      analysis_version: 1,
    }, { onConflict: "source_id" })
    .select("id")
    .single();

  if (trackErr) {
    // Try without composite_key conflict
    const { data: track2, error: trackErr2 } = await supabase
      .from("fabric_tracks")
      .upsert({
        source_id: spotifyId,
        composite_key: compositeKey,
        title,
        artist,
        duration_ms: durationMs,
        status: "complete",
        analyzed_at: new Date().toISOString(),
        analysis_version: 1,
      }, { onConflict: "composite_key", ignoreDuplicates: false })
      .select("id")
      .single();

    if (trackErr2) {
      console.error("  Track upsert failed:", trackErr, trackErr2);
      return false;
    }
    var trackId = track2.id;
  } else {
    var trackId = track.id;
  }

  // Upsert timeline
  const timelineJson = JSON.stringify(timeline);
  const { error: tlErr } = await supabase
    .from("fabric_timelines")
    .upsert({
      track_id: trackId,
      resolution_ms: WINDOW_MS,
      timeline: timeline,
      size_bytes: timelineJson.length,
    }, { onConflict: "track_id,resolution_ms" });

  if (tlErr) {
    console.error("  Timeline upsert failed:", tlErr);
    return false;
  }

  console.log(`  ✓ Uploaded: ${trackId} (${timeline.length} snapshots, ${(timelineJson.length / 1024).toFixed(1)}KB)`);
  return true;
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════
async function main() {
  console.log(`\nFabric Analysis: ${spotifyId}`);

  // Step 0: Get track info
  if (!title || !artist) {
    console.log("Step 0: Looking up track info...");
    const info = await lookupSpotifyTrack(spotifyId);
    title = title || info.title || "Unknown";
    artist = artist || info.artist || "Unknown";
    durationMs = durationMs || info.durationMs || 0;
  }
  console.log(`  Track: ${artist} — ${title} (${Math.round(durationMs / 1000)}s)`);

  // Step 1: Download
  console.log("Step 1: YouTube search + download...");
  let pcmPath;
  try {
    pcmPath = searchAndDownload(artist, title, durationMs / 1000);
  } catch (e) {
    console.error("  Download failed:", e.message);
    process.exit(1);
  }

  // Step 2: Analyze
  console.log("Step 2: Audio analysis...");
  const { timeline, durationSec } = analyzeAudio(pcmPath);

  // Update duration if we didn't have it
  if (!durationMs) durationMs = Math.round(durationSec * 1000);

  // Step 3: Upload
  console.log("Step 3: Upload to Supabase...");
  const ok = await uploadToSupabase(spotifyId, title, artist, durationMs, timeline);

  // Cleanup
  if (existsSync(pcmPath)) unlinkSync(pcmPath);

  if (ok) {
    console.log(`\n✓ Done! ${timeline.length} snapshots stored for "${artist} — ${title}"\n`);
  } else {
    console.log("\n✗ Upload failed\n");
    process.exit(1);
  }
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
