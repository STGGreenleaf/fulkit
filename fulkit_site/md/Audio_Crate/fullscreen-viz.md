# Fullscreen Visualization — Working Doc v3

> "The line should feel like it's breathing the same air as you."

---

## Decision: Deep Amoeba with Zoned Perimeter

Single renderer. No variants. The form is the Fülkit visual signature.

**Prototype file:** `fullscreen-viz-v3.jsx` — this is the reference for Claude Code.

---

## Architecture

### Silent State
- Perfect circle at 10% opacity, thin stroke (0.5px)
- As amplitude ramps via spring physics, circle dissolves into amoeba
- The transition from geometric to organic IS the moment

### Zoned Perimeter
Four angular regions around the form, each driven by different audio features. Zones blend softly at boundaries via cosine crossfade (power 1.5). The zone axis slowly rotates (~13 min full cycle) so features migrate around the form.

| Zone | Position | Feature | Noise Freq | Character |
|:---|:---|:---|:---|:---|
| Bass | 0° | energy × loudness | 0.8x | Wide rolling hills. Loud = pushes far out. |
| Rhythm | 90° | danceability × beat | 2.5x | Snaps with kick drum. High dance = regular bumps. |
| Vocal | 180° | speechiness | 4x + speech×8 | Jittery when vocals present. Flat when instrumental. |
| Texture | 270° | acousticness | 1.5x (acoustic) → 5.5x (digital) | Smooth wide waves vs tight sharp teeth. |

### Variable-Weight Contour
Each segment of the contour is drawn individually with weight varying by zone. Bass/acoustic zones render thicker. Vocal zones render thinner. You can see the weight shift as your eye moves around.

### Base Warp (Music-Gated)
Three noise octaves for the base radius deformation:
- 0.3x scale (slow drift) — weight 0.5
- 0.6x scale (lobe shape) — weight 0.25
- 1.2x scale (irregularity detail) — weight 0.25 × energy

Perfect circle when silent. Irregularity increases with energy/volume.

### Displacement
- dispScale: 0.85 (tall peaks)
- Primary noise: 1.2x freq, weight 0.9 (big lobes)
- Secondary noise: 3.5x freq, weight 0.2 (detail)
- Valence shapes peaks: low valence = angular, high = rounded
- Beat boost: 0.7 multiplier
- Hit layers: 2.0× displacement on strong beats

### Tracer System
- Capture every 3rd frame, max 22 tracers
- Older tracers shift inward (rShift = age × 0.35)
- Fade rate: 0.96 per frame (normal), 0.984 (hit)
- Hit layers captured when beat > 0.6, higher initial opacity (0.85)

### Interior Tendrils
- Every 6th point connected to its opposite through center
- Control points perpendicular to tendril axis (guaranteed minimum offset ±0.4)
- No straight lines through center
- Alpha varies by zone — bass tendrils bolder
- Line weight varies by zone pointWeight

### Rendering Stack (per layer, back to front)
1. Inward bleed — clipped to path interior, no outward halo
2. Variable-weight contour segments — per-segment stroke
3. Inward reflection — soft shadow, no hard edge

### Color
- `[78, 75, 68]` — warm grey, NOT black. Matches linear waveform tone.
- Darkness scales with amplitude (0.4 + amp × 0.6)
- Current contour darkest, tracers fade lighter with age

---

## Overlay — Minimal (Locked)
- Fülkit ü + wordmark — top-left, 50% opacity
- ✕ close — top-right, 35% opacity
- Track name + artist — bottom-left
- BPM in monospace — bottom-left below artist

Nothing else. No meters, no progress bar, no transport controls.

---

## What the Prototype Doesn't Have (Claude Code adds)

### Temporal Smoothing
Prototype computes each frame independently. Real renderer needs per-point frame-to-frame interpolation (EMA or spring) so displacement eases between values. The `Math.random()` jitter should be replaced with noise-based jitter that's deterministic and smooth.

### Real Audio Data
Prototype uses static feature values per track. Real system:
- Layer 1: Spotify playback state (progress_ms interpolated between 1s polls)
- Layer 2: ReccoBeats audio features (BPM, energy, valence, danceability, loudness, acousticness, speechiness, instrumentalness, key)
- Layer 3 (future): Essentia.js real-time RMS, spectral centroid, flux, onsets

### Kinetic Signatures
From audio-spec.md — play/pause/skip/track-end transitions with specific curves and durations. The spring amplitude in the prototype approximates this but the real system should match the spec exactly.

### Song Envelope
Deterministic from track ID. Shapes amplitude across duration (intro builds, chorus peaks, outro fades). Prototype has a simple sine envelope.

### Performance
This is the ONLY thing on screen. Full resources. Full layer count. No competing UI.

### Poster/Capture Mode
Still TBD — capture current frame as PNG for export. Metadata overlay for poster version.

---

## Key Learnings from This Session

1. **The orb is the brand.** 3D mesh experiments were interesting but don't belong to the same visual family as the horizontal waveform. The 2D tracer-based amoeba does.

2. **Zones are the breakthrough.** Different parts of the perimeter should show different aspects of the song. Not uniform pulsing.

3. **Less is more on smoothing.** 2 passes, not 3+. Let the peaks be tall.

4. **72 points, not 90+.** Fewer points = bigger, more dramatic lobes.

5. **Color should be warm grey, not black.** Match the linear waveform's tone.

6. **Silent = perfect circle.** Light, thin, geometric. Music earns the organic form.

7. **No hairs/daggers.** Neighbor-smoothing catches isolated spikes. Guaranteed minimum control point offset on tendrils prevents straight lines.

8. **Boundary matters.** The form should never escape its visual zone.

---

## Files from This Session
- `fullscreen-viz-v3.jsx` — **THE reference prototype** (zoned perimeter, Deep Amoeba only)
- `fullscreen-viz-v2.jsx` — previous A/B/C variant build (archived)
- `fullscreen-viz.md` — this document

---

## Changelog
- v0.1 — Initial working doc
- v1.0 — Six proposed changes (tame peaks, amoeba base, shadow spread, hit-and-fade, organic movement)
- v2.0 — Deep Amoeba selected. A1–A4 sub-variants explored. Smoothing fix. Leak tendrils removed.
- v2.5 — 3D mesh detour (Crystal, Swarm, Flow). Abandoned — doesn't match brand.
- v3.0 — **Final direction.** Zoned perimeter. Variable-weight contour. Deep Amoeba only. Warm grey palette. Ready for Claude Code.

---

## Ideas to Explore

(Parking lot — things that came up but aren't decided yet)

- [ ] Album art as subtle background texture (blurred, ultra-low opacity) behind the circle
- [ ] Ring progress — thin arc around the circle showing track position
- [ ] Pulse the Fülkit logo mark to the beat (very subtle)
- [ ] Different circle sizes based on energy (high energy = larger radius)
- [ ] "Freeze frame" — tap to pause the animation and capture a still
- [ ] History mode — scrub through past frames like a timeline
- [ ] Dual circle — stereo L/R rendered as two concentric circles
- [ ] Gravity — displacement affected by device orientation (mobile accelerometer)

---

## Changelog
- v0.1 — Initial working doc. Captured current state from screenshots + Collin's technical breakdown. Open questions framed for discussion.
