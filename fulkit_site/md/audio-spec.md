# Audio Visualization Spec — The Wave

> "The line should feel like it's breathing the same air as you."

---

## Philosophy

The waveform is not a visualizer. It's a living signal. It should feel like the app is *listening* — whether or not it actually is. The system is designed as a layered stack where each tier adds fidelity. Every user gets a beautiful, musically-informed experience regardless of permissions, device, or network. The best experience requires nothing but pressing play.

**Design lineage:** Dieter Rams — "as little design as possible." The wave does not decorate. It responds. No chrome, no gradients, no glow unless earned by real signal. The absence of motion is as intentional as the motion itself.

---

## Architecture: The Layer Stack

Four layers, additive. Each layer enriches the one below it. The system always renders the highest available layer and gracefully degrades downward. No user action is required to reach Layer 2. Layer 3 is opt-in.

```
┌─────────────────────────────────────────────────┐
│  LAYER 3 — LIVE AUDIO (mic or tab capture)      │  Essentia.js via AudioWorklet
│  Real-time spectral, beat, onset, loudness       │  getUserMedia required
├─────────────────────────────────────────────────┤
│  LAYER 2 — AUDIO FEATURES (per-track metadata)  │  ReccoBeats API (free, no auth)
│  BPM, energy, valence, danceability, loudness    │  Lookup by Spotify track ID
├─────────────────────────────────────────────────┤
│  LAYER 1 — PLAYBACK STATE (Spotify metadata)    │  Spotify Web API (basic scope)
│  Play/pause/skip, track position, duration       │  Always available
├─────────────────────────────────────────────────┤
│  LAYER 0 — GENERATIVE AMBIENT (always on)       │  Pure client-side, zero deps
│  Organic noise, breathing rhythm, idle pulse     │  Works offline
└─────────────────────────────────────────────────┘
```

### Degradation behavior

| Condition | Active layers | Experience |
|:---|:---|:---|
| Spotify connected, ReccoBeats available, mic granted | 0 + 1 + 2 + 3 | Full fidelity. Real audio with musical metadata. The best. |
| Spotify connected, ReccoBeats available, no mic | 0 + 1 + 2 | Puppeted to real BPM, energy, mood. Indistinguishable from live for most users. |
| Spotify connected, ReccoBeats down/slow | 0 + 1 | State-driven transitions only. Beautiful but not musically informed between events. |
| No Spotify connection | 0 | Ambient breathing. The wave sleeps. |

---

## Layer 0 — Generative Ambient

**Always running. Zero dependencies. The foundation everything else paints on top of.**

### Idle state
- Perlin noise displacement along a horizontal baseline
- Amplitude: very low (~5-8% of max)
- Frequency: slow, organic undulation — like a sleeping breath
- Rate: ~0.3 Hz base oscillation (one full cycle every ~3 seconds)
- Rendered as a single continuous path, canvas-based
- Color: `var(--color-text-muted)` at reduced opacity

### Design constraints
- Never fully flat. Even at rest, the line has micro-movement
- No looping artifacts — noise seed evolves continuously
- Renders at 60fps via `requestAnimationFrame`, throttled to 30fps on low-power devices
- CPU budget: < 2% on modern hardware when only Layer 0 is active

---

## Layer 1 — Playback State

**Driven by Spotify Web API. No extended quota required.**

### Available data
- `is_playing` — boolean
- `progress_ms` — current position in track
- `duration_ms` — total track length
- `track.id` — Spotify track ID (used to fetch Layer 2)
- `track.name`, `track.artists` — display metadata
- `shuffle_state`, `repeat_state`

### Polling
- Poll `GET /v1/me/player/currently-playing` every 1000ms when active
- Interpolate `progress_ms` between polls using client-side timer for smooth position tracking
- On state change (play/pause/skip), immediately re-poll to sync

### Kinetic signatures

These are the transition animations driven purely by playback state. They define the *personality* of the wave.

#### Play → Active
```
trigger:     is_playing transitions from false to true
behavior:    Amplitude spools up from idle (~5%) to active (~40%)
curve:       ease-out exponential
duration:    600ms
character:   Like a turntable reaching speed. Slow start, confident arrival.
```

#### Active → Pause
```
trigger:     is_playing transitions from true to false
behavior:    Amplitude winds down from active to idle
curve:       ease-in exponential (inverse of play)
duration:    800ms
character:   Like a turntable losing power. Momentum bleeds out.
```

#### Skip (next/previous)
```
trigger:     track.id changes while is_playing remains true
behavior:    Fast amplitude cut → brief silence → spool up with new track
cut:         200ms sharp decay (ease-in quad)
silence:     100-300ms at idle level
spool:       400ms ease-out into new active state
character:   Abrupt. Intentional. The user made a decision.
```

#### Track end → Next track
```
trigger:     progress_ms approaches duration_ms (within last 5-8 seconds)
behavior:    Gradual amplitude exhale over final seconds
ramp:        Linear decay from current amplitude to idle
gap:         Hold at idle for 500-1000ms (the breath between songs)
next:        Spool up over 800ms into new track's active state
character:   Organic. The song is ending. The wave knows.
```

#### End-of-track detection
```javascript
const EXHALE_WINDOW = 6000; // ms — start winding down 6s before end
const remaining = duration_ms - progress_ms;

if (remaining < EXHALE_WINDOW && remaining > 0) {
  const exhaustion = 1 - (remaining / EXHALE_WINDOW); // 0 → 1 as track ends
  amplitudeMultiplier = 1 - (exhaustion * 0.7); // never fully zero, keep 30% floor
}
```

---

## Layer 2 — Audio Features

**Driven by ReccoBeats API. Free. No OAuth. Lookup by Spotify track ID.**

### Integration

When a new track starts playing (detected via Layer 1 polling), fire a lookup:

```
GET https://api.reccobeats.com/v1/track/audio-features?spotify_id={track_id}
```

### Available features

| Feature | Type | Range | Wave behavior |
|:---|:---|:---|:---|
| `tempo` (BPM) | float | 30–250 | Base oscillation frequency. Wave pulses on the beat grid. |
| `energy` | float | 0.0–1.0 | Overall amplitude ceiling. High energy = taller peaks, more aggressive motion. |
| `valence` | float | 0.0–1.0 | Wave shape character. High valence = rounder, smoother curves. Low = jagged, angular. |
| `danceability` | float | 0.0–1.0 | Rhythmic regularity. High = locked groove, metronomic pulse. Low = looser, more organic. |
| `loudness` | float | -60–0 dB | Amplitude baseline offset. Maps to wave "presence." |
| `acousticness` | float | 0.0–1.0 | Rendering style. High = soft edges, gentle displacement. Low = sharp, digital, precise. |
| `speechiness` | float | 0.0–1.0 | Center-weight bias. Spoken word concentrates energy in mid-frequencies. |
| `instrumentalness` | float | 0.0–1.0 | Spread. Instrumental tracks widen the waveform's spectral distribution. |
| `key` | int | 0–11 | Phase offset seed. Different keys produce subtly different wave shapes (cosmetic). |

### Caching
- Cache audio features per track ID in a client-side Map
- Features don't change per track — fetch once, use forever
- Prefetch: when queue/next track is known, fetch features ahead of playback
- TTL: session-scoped (clear on page reload, not persisted to storage)

### Fallback
- If ReccoBeats is unreachable (timeout: 3s), fall back to Layer 1 only
- No error state shown to user — the wave simply runs without musical metadata
- Retry on next track change
- Log miss rate for monitoring

### Beat grid construction

```javascript
// Convert BPM to milliseconds per beat
const msPerBeat = 60000 / bpm;

// Sync beat pulse to playback position
const beatPhase = (progress_ms % msPerBeat) / msPerBeat; // 0 → 1 per beat cycle

// Pulse shape: sharp attack, smooth decay (like a kick drum envelope)
const beatPulse = Math.pow(1 - beatPhase, 3); // cubic falloff

// Modulate amplitude: base + beat contribution scaled by danceability
const beatAmplitude = baseAmplitude + (beatPulse * danceability * 0.3);
```

### Energy-to-amplitude mapping

```javascript
// Energy drives the ceiling. Loudness offsets the floor.
const normalizedLoudness = Math.max(0, (loudness + 35) / 35); // -35dB → 0, 0dB → 1
const amplitudeCeiling = 0.2 + (energy * 0.6); // range: 0.2 → 0.8
const amplitudeFloor = 0.05 + (normalizedLoudness * 0.15); // range: 0.05 → 0.2
```

### Valence-to-shape mapping

```javascript
// Valence shapes the interpolation curve of the waveform
// High valence = smooth sine-like curves (happy, bright)
// Low valence = more angular, sawtooth-influenced shapes (dark, tense)
const sharpness = 1 - valence; // 0 = smooth, 1 = angular

// Used as an exponent on the noise displacement
// Higher sharpness = more extreme peaks, flatter troughs
const displacementCurve = (noiseValue) => {
  return Math.sign(noiseValue) * Math.pow(Math.abs(noiseValue), 1 + sharpness);
};
```

### Acousticness-to-rendering mapping

```javascript
// Acousticness controls the visual texture of the wave itself
const lineWidth = 1.5 + (acousticness * 1.0); // 1.5px (digital) → 2.5px (warm)
const smoothingFactor = 0.3 + (acousticness * 0.4); // curve interpolation tension
// High acousticness: thicker line, softer curves, slightly lower opacity
// Low acousticness: thin, precise, high contrast
```

---

## Layer 3 — Live Audio

**Real-time analysis via microphone or tab capture. The reveal.**

### The mic permission problem

Browser security requires `getUserMedia()` to prompt the user. There is no workaround — this is a hard platform constraint. But we can make the moment feel intentional rather than intrusive.

#### Strategy: "Turn on the ears"

The mic is **never** requested on page load. Never on first visit. Never automatically.

The user activates it through a deliberate gesture:

1. **The wave is already alive** (Layers 0–2 are running, looking great)
2. User notices a subtle affordance on the waveform — a small ear/listen icon, barely visible, that appears on hover (desktop) or long-press (mobile)
3. Tapping it triggers the permission prompt **once**
4. Browser remembers the grant for the origin — subsequent sessions skip the prompt
5. The wave snaps from puppeted to real. The transition is the reward.

#### Permission UX

```
First activation:
  User taps "ears" affordance
  → Browser permission dialog appears
  → If granted: immediate transition to live audio. Store preference.
  → If denied: no error, no modal, no guilt. Wave continues on Layer 2.
    Affordance disappears. User is never asked again unless they seek it in settings.

Subsequent visits (permission remembered):
  → Auto-activate mic on play if user previously opted in
  → No prompt. No friction. Just alive.

Settings:
  Audio → Live mode: Auto (default) / Mic / Studio / Off
  "Auto" = use mic if previously granted, otherwise Layer 2
  "Mic" = always request mic (re-prompts if denied)
  "Studio" = tab capture (getDisplayMedia — see below)
  "Off" = Layers 0–2 only
```

### Essentia.js integration

Essentia.js runs in the browser via WebAssembly. It connects to the mic stream through an AudioWorklet, keeping analysis off the main thread.

#### Setup

```javascript
// 1. Get mic stream
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// 2. Create audio context and connect
const audioCtx = new AudioContext();
const source = audioCtx.createMediaStreamSource(stream);

// 3. Load Essentia WASM + create AudioWorklet
await audioCtx.audioWorklet.addModule('essentia-worklet-processor.js');
const essentiaNode = new AudioWorkletNode(audioCtx, 'essentia-worklet-processor');

// 4. Connect: mic → essentia worklet → (no output, analysis only)
source.connect(essentiaNode);
// Do NOT connect to audioCtx.destination — we're listening, not playing back
```

#### Real-time features extracted

| Feature | Update rate | Wave behavior |
|:---|:---|:---|
| RMS (loudness) | Every frame | Direct amplitude mapping. The primary "is it alive" signal. |
| Spectral centroid | Every frame | Frequency distribution of the wave. Bright sounds spread wide, dark sounds concentrate center. |
| Spectral flux | Every frame | Rate of spectral change. Drives micro-transient spikes — hi-hats, percussion, consonants. |
| Onset detection | Event-based | Sharp amplitude spikes on detected onsets. The "snap" of a snare or attack of a note. |
| Beat tracking | Event-based | Locks wave pulse to detected beats. Overrides Layer 2 BPM when active. |
| Pitch (f0) | Every frame | Optional: subtle pitch-to-position mapping. Higher pitch = wave shifts upward. |

#### Worklet processor (simplified)

```javascript
// essentia-worklet-processor.js
class EssentiaProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Essentia WASM loaded in worklet scope
  }

  process(inputs) {
    const input = inputs[0][0]; // mono channel
    if (!input) return true;

    // Convert to Essentia vector
    const signal = essentia.arrayToVector(input);

    // Extract features
    const rms = essentia.RMS(signal).rms;
    const spectrum = essentia.Spectrum(signal);
    const centroid = essentia.SpectralCentroidTime(signal).centroid;
    const flux = essentia.Flux(spectrum.spectrum).flux;

    // Post back to main thread
    this.port.postMessage({ rms, centroid, flux });

    return true; // keep processor alive
  }
}
```

#### Main thread feature consumer

```javascript
essentiaNode.port.onmessage = (event) => {
  const { rms, centroid, flux } = event.data;

  // Smooth features to avoid jitter (EMA filter)
  smoothedRMS = smoothedRMS * 0.7 + rms * 0.3;
  smoothedCentroid = smoothedCentroid * 0.8 + centroid * 0.2;
  smoothedFlux = smoothedFlux * 0.6 + flux * 0.4;

  // Feed to renderer
  waveRenderer.setLiveFeatures({
    amplitude: smoothedRMS,
    spread: smoothedCentroid,
    transience: smoothedFlux
  });
};
```

### Tab capture (Studio Mode)

Available in settings as an alternative to mic. Clean digital signal, no room noise.

```javascript
const stream = await navigator.mediaDevices.getDisplayMedia({
  audio: true,
  video: false // we only want audio
});
// Same Essentia pipeline from here
```

**Tradeoff:** `getDisplayMedia` shows Chrome's share dialog every session. There's no "remember this choice" for tab capture. This is why it lives in settings as "Studio Mode" — it's for users who want the pristine signal and don't mind the extra click.

---

## The Transition: Layer 2 → Layer 3

This is the signature moment. The wave goes from *performing* to *listening*.

### Crossfade behavior

```
Layer 2 (puppeted):     ████████████████░░░░░░░░░░
Layer 3 (live):         ░░░░░░░░░░░░░░░░████████████
                        ←— 800ms crossfade —→

- Layer 2 amplitude fades out over 800ms (ease-in)
- Layer 3 amplitude fades in over 800ms (ease-out)
- Overlapping blend during transition
- No hard cut. The wave "wakes up."
```

### What changes perceptually

| Aspect | Layer 2 (puppeted) | Layer 3 (live) |
|:---|:---|:---|
| Amplitude source | BPM grid + energy ceiling | Real RMS from audio signal |
| Rhythm | Mathematically perfect beat grid | Actual beat positions (slightly human) |
| Transients | None — smooth interpolation | Real onset spikes (hi-hats, snares, consonants) |
| Spectral shape | Static per-track (acousticness, valence) | Dynamic per-frame (spectral centroid) |
| Texture | Consistent, predictable | Micro-variations, room artifacts, breath |

The gap is *resolution*. Layer 2 gives you the forest. Layer 3 gives you every leaf.

---

## Rendering

### Canvas setup

```javascript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// Match device pixel ratio for crisp lines
const dpr = window.devicePixelRatio || 1;
canvas.width = containerWidth * dpr;
canvas.height = containerHeight * dpr;
ctx.scale(dpr, dpr);
canvas.style.width = containerWidth + 'px';
canvas.style.height = containerHeight + 'px';
```

### Wave rendering (per frame)

```javascript
function renderWave(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerY = containerHeight / 2;
  const points = 200; // number of sample points across width

  ctx.beginPath();
  ctx.moveTo(0, centerY);

  for (let i = 0; i < points; i++) {
    const x = (i / points) * containerWidth;
    const t = i / points; // 0 → 1 across width

    // Layer 0: base noise
    let displacement = noise2D(t * noiseScale, timestamp * noiseSpeed) * idleAmplitude;

    // Layer 1: playback state multiplier
    displacement *= stateMultiplier; // 0.1 (paused) → 1.0 (playing)

    // Layer 2: beat pulse + energy ceiling (if available)
    if (audioFeatures) {
      const beat = getBeatPulse(progress_ms, audioFeatures.tempo, audioFeatures.danceability);
      displacement *= (1 + beat * 0.3);
      displacement *= audioFeatures.energy;
      displacement = applyValenceShape(displacement, audioFeatures.valence);
    }

    // Layer 3: live audio override (if active)
    if (liveFeatures) {
      const liveDisplacement = liveFeatures.amplitude * maxAmplitude;
      const spread = liveFeatures.spread;
      const transient = liveFeatures.transience;

      // Blend: crossfade weight during transition, 100% live when settled
      displacement = lerp(displacement, liveDisplacement, liveBlendWeight);

      // Transient spikes
      displacement += transient * transientScale * Math.random(); // micro-jitter on onsets
    }

    // Apply displacement symmetrically (mirrored waveform)
    const y = centerY + displacement * (containerHeight * 0.4);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  // Mirror: draw bottom half
  // (reverse iterate for the bottom reflection)

  // Style
  ctx.strokeStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-text-muted').trim();
  ctx.lineWidth = currentLineWidth;
  ctx.stroke();

  requestAnimationFrame(renderWave);
}
```

### Performance targets

| Device tier | Target FPS | Allowed CPU | Strategy |
|:---|:---|:---|:---|
| Desktop (modern) | 60fps | < 5% | Full resolution, all layers |
| Desktop (older) | 30fps | < 5% | Reduce point count to 100, skip spectral spread |
| Mobile (modern) | 30fps | < 8% | Reduce point count to 80, simplify noise |
| Mobile (older) | 20fps | < 8% | Layer 0 + 1 only, minimal point count |

### Adaptive performance

```javascript
// Monitor frame time and auto-downgrade
let frameTimeBudget = 16.67; // 60fps target
let consecutiveSlowFrames = 0;

function onFrame(elapsed) {
  if (elapsed > frameTimeBudget * 1.5) {
    consecutiveSlowFrames++;
    if (consecutiveSlowFrames > 10) {
      reduceQuality(); // fewer points, skip expensive features
      consecutiveSlowFrames = 0;
    }
  } else {
    consecutiveSlowFrames = 0;
  }
}
```

---

## Randomness Layer

A 5% noise floor applied on top of all layers. Prevents any two moments from looking identical, even when Layer 2 data would repeat (e.g., looped sections). This is the "it's alive" insurance.

```javascript
const JITTER_AMOUNT = 0.05; // 5% of current amplitude
const jitter = (Math.random() - 0.5) * 2 * JITTER_AMOUNT;
finalDisplacement *= (1 + jitter);
```

---

## Color & Style

Inherits from design.md tokens. The wave is achromatic.

```
idle:       var(--color-text-dim) at 40% opacity
active:     var(--color-text-muted) at 70% opacity
live:       var(--color-text-secondary) at 85% opacity
line-width: 1.5px (digital) → 2.5px (acoustic) — driven by acousticness
```

No gradients. No glow. No color shifts. The motion *is* the color. If the wave needs visual effects to look alive, the motion isn't good enough.

**Exception:** The transition moment (Layer 2 → 3) may include a brief, subtle opacity bloom — 70% → 90% → 85% over 800ms — as the wave "wakes up." This is the only flourish.

---

## Data Flow Summary

```
Spotify Web API ──────────────┐
  (currently playing,          │
   track ID, progress,         │
   play state)                 │
                               ▼
                        ┌─────────────┐
ReccoBeats API ────────▶│  WAVE STATE  │◀──── Essentia.js
  (BPM, energy,         │   MANAGER    │      (real-time RMS,
   valence,              │             │       spectral centroid,
   danceability,         │  Merges all │       flux, onsets,
   loudness,             │  layers     │       beat positions)
   acousticness)         └──────┬──────┘
                                │              ▲
                                │              │
                                ▼              │
                        ┌──────────────┐    getUserMedia
                        │   RENDERER   │    (mic or tab)
                        │  (Canvas 2D) │
                        └──────────────┘
```

---

## Implementation Order

1. **Layer 0** — Generative ambient. Get the idle wave looking beautiful. This is the foundation.
2. **Layer 1** — Connect Spotify playback state. Implement all kinetic signatures (play/pause/skip/track end). The wave responds to user actions.
3. **Layer 2** — Integrate ReccoBeats. On each new track, fetch features and puppet the wave to BPM + energy + valence. This is where it starts to feel real.
4. **Renderer polish** — Adaptive performance, DPR scaling, mobile optimization.
5. **Layer 3** — Essentia.js mic integration. The reveal. Ship this as a v1.1 feature drop after launch — gives you a marketing moment.
6. **Studio Mode** — Tab capture in settings. Low priority, high-signal for power users.

---

## Open Questions

- [ ] ReccoBeats coverage: what percentage of Spotify's catalog does it cover? Need to test with obscure tracks and handle misses gracefully.
- [ ] Essentia.js bundle size: WASM module is ~1.5MB. Lazy-load only when Layer 3 is activated? Or preload after initial paint?
- [ ] Mobile mic behavior: does keeping the mic open drain battery noticeably? May need auto-sleep after N minutes of inactivity.
- [ ] The "ears" affordance: icon exploration needed. Should be nearly invisible until you know to look for it. Discoverable through delight, not onboarding.
- [ ] Should Layer 3 persist across tracks or re-initialize on each track change? (Recommendation: persist — the mic is already open, don't interrupt.)
- [ ] Meyda as lightweight fallback if Essentia.js WASM is too heavy for low-end devices? Meyda is pure JS, smaller, fewer features, but covers RMS + spectral basics.
