import { useState, useRef, useEffect, useCallback } from "react";

// Simple 2D simplex-like noise
function createNoise() {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const grad2 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  
  return function noise2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = x - X0, y0 = y - Y0;
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 > 0) {
      t0 *= t0;
      const gi = perm[ii + perm[jj]] % 8;
      n0 = t0 * t0 * (grad2[gi][0]*x0 + grad2[gi][1]*y0);
    }
    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 > 0) {
      t1 *= t1;
      const gi = perm[ii + i1 + perm[jj + j1]] % 8;
      n1 = t1 * t1 * (grad2[gi][0]*x1 + grad2[gi][1]*y1);
    }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 > 0) {
      t2 *= t2;
      const gi = perm[ii + 1 + perm[jj + 1]] % 8;
      n2 = t2 * t2 * (grad2[gi][0]*x2 + grad2[gi][1]*y2);
    }
    return 70 * (n0 + n1 + n2);
  };
}

export default function FullscreenViz() {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    noise: createNoise(),
    time: 0,
    playing: false,
    // Spring physics
    amplitude: 0,
    ampVelocity: 0,
    // Tracers
    tracerHistory: [],
    hitLayers: [],
    frameCount: 0,
    // Simulated music
    bpm: 122,
    energy: 0.7,
    danceability: 0.65,
    valence: 0.4,
    acousticness: 0.3,
    progressMs: 0,
    durationMs: 480000,
    // Center drift
    cx: 0,
    cy: 0,
  });
  const animRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);

  const tracks = [
    { name: "Says", artist: "Nils Frahm", bpm: 150, energy: 0.6, danceability: 0.35, valence: 0.3, acousticness: 0.7, key: "Cm" },
    { name: "Epikur", artist: "David August", bpm: 122, energy: 0.72, danceability: 0.68, valence: 0.45, acousticness: 0.25, key: "Am" },
    { name: "Come Together", artist: "Nox Vahn, Marsh", bpm: 120, energy: 0.8, danceability: 0.75, valence: 0.6, acousticness: 0.15, key: "D" },
    { name: "Singularity", artist: "Stephan Bodzin", bpm: 121, energy: 0.85, danceability: 0.7, valence: 0.25, acousticness: 0.1, key: "Bbm" },
  ];

  const switchTrack = useCallback((idx) => {
    const s = stateRef.current;
    const t = tracks[idx];
    s.bpm = t.bpm;
    s.energy = t.energy;
    s.danceability = t.danceability;
    s.valence = t.valence;
    s.acousticness = t.acousticness;
    s.progressMs = 0;
    s.tracerHistory = [];
    s.hitLayers = [];
    s.noise = createNoise(); // fresh noise seed per track
    setTrackIndex(idx);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const NUM_POINTS = 110;
    const MAX_TRACERS = 28;
    const TRACER_CAPTURE_INTERVAL = 3;
    const MAX_HIT_LAYERS = 8;

    function draw() {
      const s = stateRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dim = Math.min(w, h);
      const baseRadius = dim * 0.24;

      s.time += 0.016;
      if (s.playing) {
        s.progressMs += 16;
      }

      // --- Spring physics for amplitude ---
      const targetAmp = s.playing ? (0.3 + s.energy * 0.4) : 0.0;
      const stiffness = 0.06;
      const damping = 0.82;
      s.ampVelocity += (targetAmp - s.amplitude) * stiffness;
      s.ampVelocity *= damping;
      s.amplitude += s.ampVelocity;
      s.amplitude = Math.max(0, Math.min(1, s.amplitude));

      // --- Center drift ---
      const driftX = s.noise(s.time * 0.15, 100) * dim * 0.02;
      const driftY = s.noise(200, s.time * 0.12) * dim * 0.02;
      const centerX = w / 2 + driftX;
      const centerY = h / 2 + driftY;

      // --- Slow rotation ---
      const rotation = s.time * 0.08; // ~0.7 RPM

      // --- Beat pulse ---
      const msPerBeat = 60000 / s.bpm;
      const beatPhase = s.playing ? (s.progressMs % msPerBeat) / msPerBeat : 1;
      const beatPulse = Math.pow(1 - beatPhase, 3) * s.danceability;

      // --- Exhale (last 6s) ---
      const remaining = s.durationMs - s.progressMs;
      const exhaleWindow = 6000;
      let exhale = 1;
      if (remaining < exhaleWindow && remaining > 0) {
        exhale = 0.3 + 0.7 * (remaining / exhaleWindow);
      }

      // --- Sharpness from valence ---
      const sharpness = 1 - s.valence;

      // --- Build displacement array ---
      const displacement = new Float32Array(NUM_POINTS);
      const localRadii = new Float32Array(NUM_POINTS);

      for (let i = 0; i < NUM_POINTS; i++) {
        const angle = (i / NUM_POINTS) * Math.PI * 2 + rotation;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);

        // B: Amoeba base deformation — music-gated
        const deformNoise = s.noise(nx * 0.4, ny * 0.4 + s.time * 0.003);
        const warpAmount = s.amplitude * 0.2;
        localRadii[i] = baseRadius * (1 + deformNoise * warpAmount);

        // A: Two octaves of noise — tamed peaks
        const n1 = s.noise(nx * 3 + s.time * 0.3, ny * 3 + s.time * 0.2);
        const n2 = s.noise(nx * 7 + s.time * 0.5, ny * 7 + s.time * 0.4);
        let noiseVal = n1 * 0.65 + n2 * 0.15;

        // Apply sharpness
        noiseVal = Math.sign(noiseVal) * Math.pow(Math.abs(noiseVal), 1 + sharpness * 0.5);

        // Scale by amplitude, energy, beat, exhale
        const beatBoost = 1 + beatPulse * 0.35;
        displacement[i] = noiseVal * s.amplitude * s.energy * beatBoost * exhale * baseRadius * 0.5;

        // Jitter
        displacement[i] *= (1 + (Math.random() - 0.5) * 0.06);
      }

      // --- Capture tracers ---
      s.frameCount++;
      if (s.frameCount % TRACER_CAPTURE_INTERVAL === 0 && s.amplitude > 0.01) {
        s.tracerHistory.push({
          displacement: new Float32Array(displacement),
          localRadii: new Float32Array(localRadii),
          opacity: 0.7,
          age: 0,
          isHit: false,
          shadowScale: 1,
        });
        if (s.tracerHistory.length > MAX_TRACERS) {
          s.tracerHistory.shift();
        }
      }

      // --- Hit layers on strong beats ---
      if (beatPulse > 0.7 && s.playing && s.frameCount % TRACER_CAPTURE_INTERVAL === 0) {
        const hitDisp = new Float32Array(NUM_POINTS);
        for (let i = 0; i < NUM_POINTS; i++) {
          hitDisp[i] = displacement[i] * 1.5;
        }
        s.hitLayers.push({
          displacement: hitDisp,
          localRadii: new Float32Array(localRadii),
          opacity: 0.85,
          age: 0,
          isHit: true,
          shadowScale: 2.0,
        });
        if (s.hitLayers.length > MAX_HIT_LAYERS) {
          s.hitLayers.shift();
        }
      }

      // --- Age all layers ---
      for (const layer of s.tracerHistory) {
        layer.age++;
        layer.opacity *= 0.965;
      }
      for (const layer of s.hitLayers) {
        layer.age++;
        layer.opacity *= 0.982; // slower fade
      }
      s.tracerHistory = s.tracerHistory.filter(l => l.opacity > 0.02);
      s.hitLayers = s.hitLayers.filter(l => l.opacity > 0.02);

      // --- RENDER ---
      ctx.clearRect(0, 0, w, h);

      const lineWidth = 1.2 + s.acousticness * 1.2;
      const color = [75, 73, 68]; // warm slate

      // Combine all layers, oldest first
      const allLayers = [
        ...s.tracerHistory.map(l => ({ ...l })),
        ...s.hitLayers.map(l => ({ ...l })),
        // Current frame (newest, on top)
        { displacement, localRadii, opacity: 0.9, age: 0, isHit: false, shadowScale: 1 },
      ].sort((a, b) => b.age - a.age);

      for (const layer of allLayers) {
        const alpha = Math.max(0, Math.min(1, layer.opacity));
        if (alpha < 0.01) continue;

        const radiusShift = layer.age * 0.4;
        const lw = lineWidth * (layer.isHit ? 1.5 : 1) * (1 - layer.age * 0.008);

        // --- Shadow pass (connective tissue) ---
        // Pre-compute all cartesian points to avoid polar wrap-around bug
        const outerPts = [];
        for (let i = 0; i < NUM_POINTS; i++) {
          const angle = (i / NUM_POINTS) * Math.PI * 2 + rotation;
          const r = layer.localRadii[i] + layer.displacement[i] - radiusShift;
          outerPts.push({
            x: centerX + Math.cos(angle) * r,
            y: centerY + Math.sin(angle) * r,
          });
        }

        ctx.beginPath();
        ctx.moveTo(outerPts[0].x, outerPts[0].y);
        for (let i = 1; i <= NUM_POINTS; i++) {
          const curr = outerPts[i % NUM_POINTS];
          const prev = outerPts[i - 1];
          // Control point is cartesian midpoint — no polar averaging
          const cpx = (prev.x + curr.x) / 2;
          const cpy = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
        }
        ctx.closePath();

        const shadowBlur = (8 + s.acousticness * 10) * layer.shadowScale;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.25})`;
        ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.12})`;
        ctx.lineWidth = lw * 3;
        ctx.stroke();

        // --- Sharp pass ---
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.6})`;
        ctx.lineWidth = Math.max(0.4, lw);
        ctx.stroke();

        // --- Reflection (inward, shadow only) ---
        if (alpha > 0.08) {
          ctx.beginPath();
          // Pre-compute inner cartesian points
          const innerPts = [];
          for (let i = 0; i < NUM_POINTS; i++) {
            const angle = (i / NUM_POINTS) * Math.PI * 2 + rotation;
            const r = Math.max(0, layer.localRadii[i] - layer.displacement[i] * 0.4 + radiusShift * 0.5);
            innerPts.push({
              x: centerX + Math.cos(angle) * r,
              y: centerY + Math.sin(angle) * r,
            });
          }

          ctx.moveTo(innerPts[0].x, innerPts[0].y);
          for (let i = 1; i <= NUM_POINTS; i++) {
            const curr = innerPts[i % NUM_POINTS];
            const prev = innerPts[i - 1];
            const cpx = (prev.x + curr.x) / 2;
            const cpy = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
          }
          ctx.closePath();

          // Reflection is ONLY shadow, no hard edge
          ctx.shadowBlur = shadowBlur * 0.7;
          ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.12})`;
          ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.05})`;
          ctx.lineWidth = lw * 2;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Sync play state
  useEffect(() => {
    stateRef.current.playing = isPlaying;
  }, [isPlaying]);

  const track = tracks[trackIndex];

  return (
    <div style={{
      width: "100vw", height: "100vh", position: "relative",
      background: "#EFEDE8",
      overflow: "hidden",
      fontFamily: "'D-DIN', 'DIN Alternate', system-ui, sans-serif",
      cursor: "default",
      userSelect: "none",
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Top-left: logo + wordmark */}
      <div style={{
        position: "absolute", top: 24, left: 28,
        display: "flex", alignItems: "center", gap: 10,
        opacity: 0.5,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "2px solid #2A2826",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, color: "#2A2826",
        }}>ü</div>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#2A2826", letterSpacing: 0.5, opacity: 0.7 }}>Fülkit</span>
      </div>

      {/* Top-right: close */}
      <div style={{
        position: "absolute", top: 24, right: 28,
        opacity: 0.4, cursor: "pointer", fontSize: 24, color: "#2A2826",
        lineHeight: 1,
      }}>✕</div>

      {/* Bottom-left: track info */}
      <div style={{ position: "absolute", bottom: 32, left: 28 }}>
        <div style={{
          fontSize: 20, fontWeight: 600, color: "#2A2826",
          opacity: 0.6, letterSpacing: -0.3,
        }}>{track.name}</div>
        <div style={{
          fontSize: 14, color: "#2A2826", opacity: 0.35,
          marginTop: 2, fontWeight: 400,
        }}>{track.artist}</div>
      </div>

      {/* Controls — test panel (not part of final UI) */}
      <div style={{
        position: "absolute", bottom: 28, right: 28,
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
      }}>
        {/* Play/pause */}
        <div
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            width: 48, height: 48, borderRadius: "50%",
            background: isPlaying ? "#2A2826" : "transparent",
            border: `2px solid ${isPlaying ? "#2A2826" : "rgba(42,40,38,0.3)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.3s",
          }}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="4" width="4" height="16" rx="1" fill="#EFEDE8" />
              <rect x="14" y="4" width="4" height="16" rx="1" fill="#EFEDE8" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M8 5v14l11-7L8 5z" fill="#2A2826" />
            </svg>
          )}
        </div>

        {/* Track switcher */}
        <div style={{ display: "flex", gap: 6 }}>
          {tracks.map((t, i) => (
            <div
              key={i}
              onClick={() => switchTrack(i)}
              style={{
                padding: "4px 10px",
                borderRadius: 12,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 0.5,
                background: i === trackIndex ? "#2A2826" : "transparent",
                color: i === trackIndex ? "#EFEDE8" : "rgba(42,40,38,0.4)",
                border: `1px solid ${i === trackIndex ? "#2A2826" : "rgba(42,40,38,0.2)"}`,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <div style={{
          fontSize: 9, color: "rgba(42,40,38,0.25)", textAlign: "right",
          fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.4,
        }}>
          TEST CONTROLS<br />
          press play · switch tracks
        </div>
      </div>
    </div>
  );
}
