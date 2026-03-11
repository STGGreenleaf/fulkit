#!/usr/bin/env node
/**
 * Fabric Batch Analyzer — Process pending tracks from the queue
 *
 * Usage:
 *   node scripts/batch-analyze.mjs [--limit 50] [--retry] [--delay 2]
 *
 * What it does:
 *   Pulls tracks with status='pending' from fabric_tracks and runs
 *   the full Fabric pipeline on each: YouTube search → download → FFT → Supabase
 *
 * Flags:
 *   --limit N    Max tracks to process (default: 50)
 *   --retry      Reset failed tracks (retry_count < 3) back to pending first
 *   --delay N    Seconds between tracks (default: 2)
 *
 * Requires: yt-dlp, ffmpeg (brew install yt-dlp ffmpeg)
 */

import { execSync } from "child_process";
import { readFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import FFT from "fft.js";
import { config } from "dotenv";

config({ path: new URL("../.env.local", import.meta.url).pathname });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE env vars in .env.local");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ═══════════════════════════════════════════
// Config (same as analyze-track.mjs)
// ═══════════════════════════════════════════
const SAMPLE_RATE = 22050;
const WINDOW_MS = 500;
const WINDOW_SAMPLES = Math.floor(SAMPLE_RATE * WINDOW_MS / 1000);
const FFT_SIZE = 16384;
const TMP_DIR = "/tmp/fabric-analysis";

const BANDS = {
  sub:      [20, 60],
  bass:     [60, 250],
  low_mid:  [250, 500],
  mid:      [500, 2000],
  high_mid: [2000, 4000],
  high:     [4000, 8000],
  air:      [8000, 11025],
};

function hzToBin(hz) {
  return Math.round(hz * FFT_SIZE / SAMPLE_RATE);
}

// ═══════════════════════════════════════════
// Parse args
// ═══════════════════════════════════════════
const args = process.argv.slice(2);
let limit = 50;
let retry = false;
let delay = 2;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[++i]);
  else if (args[i] === "--retry") retry = true;
  else if (args[i] === "--delay" && args[i + 1]) delay = parseInt(args[++i]);
}

// ═══════════════════════════════════════════
// YouTube search + download
// ═══════════════════════════════════════════
function searchAndDownload(spotifyId, artist, title) {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
  const outPath = `${TMP_DIR}/${spotifyId}.wav`;
  const pcmPath = `${TMP_DIR}/${spotifyId}.pcm`;

  const query = `${artist} ${title} official audio`;
  execSync(
    `yt-dlp -x --audio-format wav -o "${TMP_DIR}/${spotifyId}.%(ext)s" "ytsearch1:${query}"`,
    { stdio: "pipe", timeout: 120000 }
  );

  execSync(
    `ffmpeg -y -i "${outPath}" -ac 1 -ar ${SAMPLE_RATE} -f f32le "${pcmPath}"`,
    { stdio: "pipe", timeout: 60000 }
  );

  if (existsSync(outPath)) unlinkSync(outPath);
  return pcmPath;
}

// ═══════════════════════════════════════════
// Audio analysis (same as analyze-track.mjs)
// ═══════════════════════════════════════════
function analyzeAudio(pcmPath) {
  const rawBuf = readFileSync(pcmPath);
  const samples = new Float32Array(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength / 4);
  const totalSamples = samples.length;

  const fft = new FFT(FFT_SIZE);
  const fftInput = fft.createComplexArray();
  const fftOutput = fft.createComplexArray();

  const hann = new Float32Array(WINDOW_SAMPLES);
  for (let i = 0; i < WINDOW_SAMPLES; i++) {
    hann[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (WINDOW_SAMPLES - 1)));
  }

  const timeline = [];
  let prevMagnitudes = null;
  const fluxValues = [];
  const totalWindows = Math.floor((totalSamples - WINDOW_SAMPLES) / WINDOW_SAMPLES) + 1;

  for (let w = 0; w < totalWindows; w++) {
    const offset = w * WINDOW_SAMPLES;
    const t = (offset + WINDOW_SAMPLES / 2) / SAMPLE_RATE;

    // RMS
    let sumSq = 0;
    for (let i = 0; i < WINDOW_SAMPLES; i++) {
      const s = samples[offset + i] || 0;
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / WINDOW_SAMPLES);

    // ZCR
    let crossings = 0;
    for (let i = 1; i < WINDOW_SAMPLES; i++) {
      if ((samples[offset + i] >= 0) !== (samples[offset + i - 1] >= 0)) crossings++;
    }
    const zcr = crossings / WINDOW_SAMPLES;

    // FFT
    for (let i = 0; i < FFT_SIZE * 2; i++) fftInput[i] = 0;
    for (let i = 0; i < WINDOW_SAMPLES; i++) {
      fftInput[i * 2] = (samples[offset + i] || 0) * hann[i];
    }
    fft.transform(fftOutput, fftInput);

    const magnitudes = new Float32Array(FFT_SIZE / 2);
    for (let i = 0; i < FFT_SIZE / 2; i++) {
      const re = fftOutput[i * 2];
      const im = fftOutput[i * 2 + 1];
      magnitudes[i] = Math.sqrt(re * re + im * im);
    }

    // Bands
    const bands = {};
    for (const [name, [lo, hi]] of Object.entries(BANDS)) {
      const binLo = hzToBin(lo);
      const binHi = Math.min(hzToBin(hi), FFT_SIZE / 2 - 1);
      let sum = 0, count = 0;
      for (let i = binLo; i <= binHi; i++) { sum += magnitudes[i]; count++; }
      bands[name] = count > 0 ? sum / count : 0;
    }
    const maxBand = Math.max(...Object.values(bands), 0.0001);
    for (const name of Object.keys(bands)) bands[name] = Math.min(1, bands[name] / maxBand);

    // Spectral centroid
    let weightedSum = 0, magSum = 0;
    for (let i = 1; i < FFT_SIZE / 2; i++) {
      const freq = i * SAMPLE_RATE / FFT_SIZE;
      weightedSum += freq * magnitudes[i];
      magSum += magnitudes[i];
    }
    const centroidHz = magSum > 0 ? weightedSum / magSum : 0;
    const spectral_centroid = Math.min(1, centroidHz / (SAMPLE_RATE / 2));

    // Spectral spread
    let spreadSum = 0;
    for (let i = 1; i < FFT_SIZE / 2; i++) {
      const freq = i * SAMPLE_RATE / FFT_SIZE;
      spreadSum += magnitudes[i] * Math.pow(freq - centroidHz, 2);
    }
    const spectral_spread = magSum > 0 ? Math.min(1, Math.sqrt(spreadSum / magSum) / (SAMPLE_RATE / 4)) : 0;

    // Spectral rolloff (85%)
    let rolloffSum = 0;
    const totalEnergy = magnitudes.reduce((a, b) => a + b, 0);
    const rolloffThresh = totalEnergy * 0.85;
    let rolloffBin = FFT_SIZE / 2 - 1;
    for (let i = 0; i < FFT_SIZE / 2; i++) {
      rolloffSum += magnitudes[i];
      if (rolloffSum >= rolloffThresh) { rolloffBin = i; break; }
    }
    const spectral_rolloff = rolloffBin / (FFT_SIZE / 2);

    // Flux
    let flux = 0;
    if (prevMagnitudes) {
      for (let i = 0; i < FFT_SIZE / 2; i++) {
        const diff = magnitudes[i] - prevMagnitudes[i];
        if (diff > 0) flux += diff;
      }
      flux /= (FFT_SIZE / 2);
    }
    prevMagnitudes = magnitudes.slice();
    fluxValues.push(flux);

    // Dynamic range
    let windowMin = Infinity, windowMax = -Infinity;
    for (let i = 0; i < WINDOW_SAMPLES; i++) {
      const s = Math.abs(samples[offset + i] || 0);
      if (s < windowMin) windowMin = s;
      if (s > windowMax) windowMax = s;
    }
    const dynamic_range = windowMax > 0 ? (windowMax - windowMin) / windowMax : 0;

    timeline.push({
      t: Math.round(t * 100) / 100,
      loudness: rms, bands, flux,
      spectral_centroid, spectral_spread, spectral_rolloff,
      zero_crossing_rate: zcr, dynamic_range,
    });
  }

  // Normalize loudness
  const maxLoudness = Math.max(...timeline.map(s => s.loudness), 0.0001);
  for (const snap of timeline) snap.loudness = Math.min(1, snap.loudness / maxLoudness);

  // Normalize flux
  const maxFlux = Math.max(...fluxValues.filter(f => f > 0), 0.0001);
  for (let i = 0; i < timeline.length; i++) timeline[i].flux = Math.min(1, timeline[i].flux / maxFlux);

  // Beat detection
  const ONSET_WINDOW = 8;
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

  // Beat grid
  const onsetTimes = timeline.filter(s => s.onset).map(s => s.t);
  if (onsetTimes.length >= 4) {
    const intervals = [];
    for (let i = 1; i < onsetTimes.length; i++) intervals.push(onsetTimes[i] - onsetTimes[i - 1]);
    const buckets = {};
    for (const iv of intervals) {
      const q = Math.round(iv * 20) / 20;
      if (q > 0.2 && q < 2.0) buckets[q] = (buckets[q] || 0) + 1;
    }
    const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const beatPeriod = parseFloat(sorted[0][0]);
      for (const snap of timeline) {
        const phase = (snap.t % beatPeriod) / beatPeriod;
        snap.beat = phase < 0.15 || phase > 0.85;
        snap.beat_strength = snap.beat ? (1 - Math.min(phase, 1 - phase) * 6) : 0;
        const barPeriod = beatPeriod * 4;
        const barPhase = (snap.t % barPeriod) / barPeriod;
        snap.downbeat = snap.beat && (barPhase < 0.04 || barPhase > 0.96);
      }
    }
  }
  for (const snap of timeline) {
    if (snap.beat === undefined) {
      snap.beat = false;
      snap.beat_strength = 0;
      snap.downbeat = false;
    }
  }

  return { timeline, durationSec: totalSamples / SAMPLE_RATE };
}

// ═══════════════════════════════════════════
// Upload timeline to Supabase
// ═══════════════════════════════════════════
async function uploadTimeline(trackId, timeline) {
  const timelineJson = JSON.stringify(timeline);
  const { error } = await supabase
    .from("fabric_timelines")
    .upsert({
      track_id: trackId,
      resolution_ms: WINDOW_MS,
      timeline,
      size_bytes: timelineJson.length,
    }, { onConflict: "track_id,resolution_ms" });
  if (error) throw new Error(`Timeline upload failed: ${error.message}`);
}

// ═══════════════════════════════════════════
// Process one track
// ═══════════════════════════════════════════
async function processTrack(track) {
  const startTime = Date.now();

  // Mark as analyzing
  await supabase
    .from("fabric_tracks")
    .update({ status: "analyzing" })
    .eq("id", track.id);

  let pcmPath = null;
  try {
    // Download
    pcmPath = searchAndDownload(track.spotify_id, track.artist, track.title);

    // Analyze
    const { timeline, durationSec } = analyzeAudio(pcmPath);

    // Update duration if missing
    const actualDurationMs = track.duration_ms || Math.round(durationSec * 1000);

    // Upload timeline
    await uploadTimeline(track.id, timeline);

    // Mark complete
    await supabase
      .from("fabric_tracks")
      .update({
        status: "complete",
        analyzed_at: new Date().toISOString(),
        duration_ms: actualDurationMs,
      })
      .eq("id", track.id);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    return { ok: true, snapshots: timeline.length, elapsed };

  } catch (e) {
    // Mark failed
    await supabase
      .from("fabric_tracks")
      .update({
        status: "failed",
        error: e.message?.substring(0, 500),
        retry_count: (track.retry_count || 0) + 1,
      })
      .eq("id", track.id);

    return { ok: false, error: e.message };

  } finally {
    // Always cleanup
    if (pcmPath && existsSync(pcmPath)) unlinkSync(pcmPath);
    // Also clean up any stray wav files
    const wavPath = `${TMP_DIR}/${track.spotify_id}.wav`;
    if (existsSync(wavPath)) unlinkSync(wavPath);
  }
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════
async function main() {
  console.log("\n════════════════════════════════════════════");
  console.log("  Fabric Batch Analyzer");
  console.log(`  Limit: ${limit} | Delay: ${delay}s | Retry: ${retry}`);
  console.log("════════════════════════════════════════════\n");

  // Retry mode: reset failed tracks
  if (retry) {
    const { data: failed, error } = await supabase
      .from("fabric_tracks")
      .update({ status: "pending", error: null })
      .eq("status", "failed")
      .lt("retry_count", 3)
      .select("id");

    const count = failed?.length || 0;
    console.log(`Reset ${count} failed tracks to pending.\n`);
  }

  // Fetch pending tracks
  const { data: tracks, error } = await supabase
    .from("fabric_tracks")
    .select("id, spotify_id, title, artist, duration_ms, retry_count")
    .eq("status", "pending")
    .lt("retry_count", 3)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Query error:", error);
    process.exit(1);
  }

  if (!tracks?.length) {
    console.log("No pending tracks to process.");
    return;
  }

  console.log(`Processing ${tracks.length} tracks...\n`);

  let success = 0, fail = 0;
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const label = `[${i + 1}/${tracks.length}]`;

    const result = await processTrack(track);

    if (result.ok) {
      console.log(`${label} ✓ ${track.artist} — ${track.title} (${result.snapshots} snapshots, ${result.elapsed}s)`);
      success++;
    } else {
      console.log(`${label} ✗ ${track.artist} — ${track.title}: ${result.error}`);
      fail++;
    }

    // Delay between tracks
    if (i < tracks.length - 1 && delay > 0) {
      await new Promise(r => setTimeout(r, delay * 1000));
    }
  }

  console.log(`\n════════════════════════════════════════════`);
  console.log(`  Done: ${success} complete, ${fail} failed`);
  console.log("════════════════════════════════════════════\n");
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
