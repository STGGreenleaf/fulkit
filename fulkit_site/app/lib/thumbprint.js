"use client";

// Thumbprint — client-side audio analysis for accessibility visualization.
// Captures the FEEL of a song, not the audio. Frequency bands, beats, onsets.
// Builds a per-song timeline as the user listens. No audio stored.

const RESOLUTION_MS = 500;
const BAND_RANGES = {
  sub:      [20, 60],
  bass:     [60, 250],
  low_mid:  [250, 500],
  mid:      [500, 2000],
  high_mid: [2000, 4000],
  high:     [4000, 8000],
  air:      [8000, 20000],
};

export class ThumbprintBuilder {
  constructor(sampleRate = 44100, fftSize = 16384) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.binHz = sampleRate / fftSize;
    this.snapshots = [];
    this.startTime = null;
    this.lastSnapshotTime = 0;
    this.prevSpectrum = null;
    this.maxLoudness = 0.001;
    this.maxFlux = 0.001;
    this.onsetHistory = [];
  }

  // Called every animation frame with analyser data
  capture(analyser, currentTimeMs) {
    if (!this.startTime) this.startTime = currentTimeMs;
    const elapsed = currentTimeMs - this.startTime;

    if (elapsed - this.lastSnapshotTime < RESOLUTION_MS) return false;
    this.lastSnapshotTime = elapsed;

    const frequencyData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(frequencyData);

    // Convert dB to linear
    const linear = new Float32Array(frequencyData.length);
    for (let i = 0; i < frequencyData.length; i++) {
      linear[i] = Math.pow(10, frequencyData[i] / 20);
    }

    // Extract frequency bands
    const bands = {};
    for (const [name, [lo, hi]] of Object.entries(BAND_RANGES)) {
      const loIdx = Math.floor(lo / this.binHz);
      const hiIdx = Math.min(Math.ceil(hi / this.binHz), linear.length - 1);
      let sum = 0, count = 0;
      for (let i = loIdx; i <= hiIdx; i++) { sum += linear[i]; count++; }
      bands[name] = count > 0 ? sum / count : 0;
    }

    // Loudness (RMS)
    let rmsSum = 0;
    for (let i = 0; i < linear.length; i++) rmsSum += linear[i] * linear[i];
    const loudness = Math.sqrt(rmsSum / linear.length);
    if (loudness > this.maxLoudness) this.maxLoudness = loudness;

    // Spectral flux
    let flux = 0;
    if (this.prevSpectrum) {
      for (let i = 0; i < linear.length; i++) {
        const diff = linear[i] - this.prevSpectrum[i];
        if (diff > 0) flux += diff * diff;
      }
      flux = Math.sqrt(flux / linear.length);
    }
    if (flux > this.maxFlux) this.maxFlux = flux;
    this.prevSpectrum = linear.slice();

    // Onset detection
    this.onsetHistory.push(flux);
    if (this.onsetHistory.length > 10) this.onsetHistory.shift();
    const avgFlux = this.onsetHistory.reduce((a, b) => a + b, 0) / this.onsetHistory.length;
    const onset = flux > avgFlux * 1.5 && flux > 0.01;
    const onsetStrength = avgFlux > 0 ? Math.min(flux / avgFlux, 3) / 3 : 0;

    // Beat detection (strong onset in sub+bass)
    const beatEnergy = bands.sub + bands.bass;
    const beat = onset && beatEnergy > 0.05;
    const beatStrength = Math.min(beatEnergy * 10, 1);

    // Spectral centroid
    let centroidNum = 0, centroidDen = 0;
    for (let i = 0; i < linear.length; i++) {
      centroidNum += i * this.binHz * linear[i];
      centroidDen += linear[i];
    }
    const spectralCentroid = centroidDen > 0 ? (centroidNum / centroidDen) / 10000 : 0;

    // Dynamic range
    let maxBand = 0, minBand = Infinity;
    for (const v of Object.values(bands)) {
      if (v > maxBand) maxBand = v;
      if (v < minBand) minBand = v;
    }

    this.snapshots.push({
      t: Math.round(elapsed) / 1000,
      loudness, bands, flux,
      spectral_centroid: spectralCentroid,
      dynamic_range: maxBand > 0 ? (maxBand - minBand) / maxBand : 0,
      beat, beat_strength: beatStrength,
      onset, onset_strength: onsetStrength,
    });

    return true;
  }

  // Normalize and return complete timeline
  finalize() {
    if (this.snapshots.length === 0) return null;

    let maxBands = {};
    for (const name of Object.keys(BAND_RANGES)) maxBands[name] = 0.001;
    for (const s of this.snapshots) {
      for (const [name, val] of Object.entries(s.bands)) {
        if (val > maxBands[name]) maxBands[name] = val;
      }
    }

    const normalized = this.snapshots.map(s => ({
      ...s,
      loudness: Math.min(s.loudness / this.maxLoudness, 1),
      bands: Object.fromEntries(
        Object.entries(s.bands).map(([name, val]) => [name, Math.min(val / maxBands[name], 1)])
      ),
      flux: Math.min(s.flux / this.maxFlux, 1),
    }));

    return {
      timeline: normalized,
      resolution_ms: RESOLUTION_MS,
      snapshot_count: normalized.length,
      duration_s: normalized[normalized.length - 1].t,
    };
  }

  reset() {
    this.snapshots = [];
    this.startTime = null;
    this.lastSnapshotTime = 0;
    this.prevSpectrum = null;
    this.maxLoudness = 0.001;
    this.maxFlux = 0.001;
    this.onsetHistory = [];
  }
}
