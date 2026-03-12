import { useState, useRef, useEffect, useCallback } from "react";

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
    const i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2*G2, y2 = y0 - 1 + 2*G2;
    const ii = i & 255, jj = j & 255;
    let n0=0, n1=0, n2=0;
    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 > 0) { t0*=t0; const gi=perm[ii+perm[jj]]%8; n0=t0*t0*(grad2[gi][0]*x0+grad2[gi][1]*y0); }
    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 > 0) { t1*=t1; const gi=perm[ii+i1+perm[jj+j1]]%8; n1=t1*t1*(grad2[gi][0]*x1+grad2[gi][1]*y1); }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 > 0) { t2*=t2; const gi=perm[ii+1+perm[jj+1]]%8; n2=t2*t2*(grad2[gi][0]*x2+grad2[gi][1]*y2); }
    return 70 * (n0 + n1 + n2);
  };
}

function drawSmooth(ctx, pts) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo((pts[0].x + pts[pts.length-1].x)/2, (pts[0].y + pts[pts.length-1].y)/2);
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i];
    const next = pts[(i+1) % pts.length];
    const mx = (curr.x + next.x) / 2;
    const my = (curr.y + next.y) / 2;
    ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
  }
  ctx.closePath();
}

const VARIANTS = {
  A: { name: "Deep Amoeba", desc: "Big lobes, interior tendrils, dark contour" },
  B: { name: "Ink Bloom", desc: "Soft mass, interior fog, bold edge" },
  C: { name: "Nerve", desc: "Asymmetric, interior web, sharp outer" },
};

export default function FullscreenVizVariants() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const [variant, setVariant] = useState("A");
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);

  const tracks = [
    { name: "Says", artist: "Nils Frahm", bpm: 150, energy: 0.6, dance: 0.35, valence: 0.3, acoustic: 0.7, key: "Cm" },
    { name: "Epikur", artist: "David August", bpm: 122, energy: 0.72, dance: 0.68, valence: 0.45, acoustic: 0.25, key: "Am" },
    { name: "Come Together", artist: "Nox Vahn, Marsh", bpm: 120, energy: 0.8, dance: 0.75, valence: 0.6, acoustic: 0.15, key: "D" },
    { name: "Singularity", artist: "Stephan Bodzin", bpm: 121, energy: 0.85, dance: 0.7, valence: 0.25, acoustic: 0.1, key: "Bbm" },
  ];

  const initState = useCallback(() => ({
    noise: createNoise(),
    noise2: createNoise(),
    time: 0,
    playing: false,
    amp: 0,
    ampVel: 0,
    tracers: [],
    hits: [],
    frame: 0,
    bpm: tracks[0].bpm,
    energy: tracks[0].energy,
    dance: tracks[0].dance,
    valence: tracks[0].valence,
    acoustic: tracks[0].acoustic,
    progress: 0,
    duration: 480000,
  }), []);

  if (!stateRef.current) stateRef.current = initState();

  const switchTrack = useCallback((idx) => {
    const s = stateRef.current;
    const t = tracks[idx];
    Object.assign(s, {
      bpm: t.bpm, energy: t.energy, dance: t.dance,
      valence: t.valence, acoustic: t.acoustic,
      progress: 0, tracers: [], hits: [],
      noise: createNoise(), noise2: createNoise(),
    });
    setTrackIndex(idx);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let running = true;

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

    const N = 72; // fewer = bigger, more dramatic lobes
    const MAX_TRACE = 24;
    const MAX_HITS = 6;
    const CAP_INTERVAL = 3;

    function draw() {
      if (!running) return;
      const s = stateRef.current;
      const w = window.innerWidth, h = window.innerHeight;
      const dim = Math.min(w, h);
      const baseR = dim * 0.22;
      const v = variant;

      s.time += 0.016;
      if (s.playing) s.progress += 16;

      // Spring amplitude
      const tgt = s.playing ? (0.35 + s.energy * 0.45) : 0.0;
      const stiff = v === "C" ? 0.09 : 0.055;
      const damp = v === "C" ? 0.78 : 0.83;
      s.ampVel += (tgt - s.amp) * stiff;
      s.ampVel *= damp;
      s.amp += s.ampVel;
      s.amp = Math.max(0, Math.min(1, s.amp));

      // Center drift
      const cx = w/2 + s.noise(s.time * 0.12, 50) * dim * 0.018;
      const cy = h/2 + s.noise(80, s.time * 0.1) * dim * 0.018;

      // Rotation
      const rot = s.time * (v === "C" ? 0.06 : 0.04);

      // Beat
      const msPerBeat = 60000 / s.bpm;
      const bPhase = s.playing ? (s.progress % msPerBeat) / msPerBeat : 1;
      const beat = Math.pow(1 - bPhase, 3) * s.dance;

      // Exhale
      const rem = s.duration - s.progress;
      const exhale = rem < 6000 && rem > 0 ? 0.3 + 0.7 * (rem / 6000) : 1;

      const sharp = 1 - s.valence;

      // Variant-specific params — A pushed HARD for v2
      // Lower frequency = bigger lobes, more irregular perimeter
      const warpScale = v === "A" ? 0.55 : v === "B" ? 0.28 : 0.42;
      const noiseFreq1 = v === "A" ? 1.2 : v === "B" ? 1.6 : 2.5;
      const noiseFreq2 = v === "A" ? 3.5 : v === "B" ? 4.0 : 7.0;
      const noiseW1 = v === "A" ? 0.9 : v === "B" ? 0.8 : 0.6;
      const noiseW2 = v === "A" ? 0.2 : v === "B" ? 0.08 : 0.18;
      const dispScale = v === "A" ? 0.85 : v === "B" ? 0.45 : 0.65;

      // Build displacement
      const disp = new Float32Array(N);
      const radii = new Float32Array(N);

      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + rot;
        const nx = Math.cos(a), ny = Math.sin(a);

        // Amoeba base warp — music-gated, volume-linked
        const d1 = s.noise(nx * 0.3, ny * 0.3 + s.time * 0.002);
        const d2 = s.noise2(nx * 0.6 + 10, ny * 0.6 + s.time * 0.005);
        // Third octave — mid-frequency lobe detail, makes it more irregular
        const d3 = s.noise(nx * 1.2 + 30, ny * 1.2 + s.time * 0.008);
        const warp = s.amp * warpScale;
        // Volume/energy drives HOW irregular — quiet passages stay rounder
        const irregularity = 0.5 + s.energy * 0.5; // 0.5 calm → 1.0 full energy
        radii[i] = baseR * (1 + (d1 * 0.5 + d2 * 0.25 + d3 * 0.25 * irregularity) * warp);

        // Displacement
        const n1 = s.noise(nx * noiseFreq1 + s.time * 0.25, ny * noiseFreq1 + s.time * 0.18);
        const n2 = s.noise(nx * noiseFreq2 + s.time * 0.45, ny * noiseFreq2 + s.time * 0.35);
        let nv = n1 * noiseW1 + n2 * noiseW2;
        nv = Math.sign(nv) * Math.pow(Math.abs(nv), 1 + sharp * 0.6);

        const beatBoost = 1 + beat * (v === "A" ? 0.7 : 0.4);
        disp[i] = nv * s.amp * s.energy * beatBoost * exhale * baseR * dispScale;
        disp[i] *= (1 + (Math.random() - 0.5) * 0.05);
      }

      // Neighbor-smooth — fewer passes for A so taller peaks survive
      const smoothPasses = v === "A" ? 2 : 3;
      for (let pass = 0; pass < smoothPasses; pass++) {
        const tmpD = new Float32Array(N);
        const tmpR = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          const p = (i - 1 + N) % N;
          const n = (i + 1) % N;
          tmpD[i] = disp[i] * 0.5 + disp[p] * 0.25 + disp[n] * 0.25;
          tmpR[i] = radii[i] * 0.5 + radii[p] * 0.25 + radii[n] * 0.25;
        }
        disp.set(tmpD);
        radii.set(tmpR);
      }

      // Capture tracers
      s.frame++;
      if (s.frame % CAP_INTERVAL === 0 && s.amp > 0.01) {
        s.tracers.push({ d: new Float32Array(disp), r: new Float32Array(radii), op: 0.6, age: 0, hit: false });
        if (s.tracers.length > MAX_TRACE) s.tracers.shift();
      }

      // Hit layers
      if (beat > 0.65 && s.playing && s.frame % CAP_INTERVAL === 0) {
        const hd = new Float32Array(N);
        for (let i = 0; i < N; i++) hd[i] = disp[i] * (v === "C" ? 1.8 : v === "A" ? 2.0 : 1.5);
        // Smooth hits too — amplified displacement can spike
        for (let pass = 0; pass < 2; pass++) {
          const tmp = new Float32Array(N);
          for (let i = 0; i < N; i++) {
            tmp[i] = hd[i] * 0.5 + hd[(i-1+N)%N] * 0.25 + hd[(i+1)%N] * 0.25;
          }
          hd.set(tmp);
        }
        s.hits.push({ d: hd, r: new Float32Array(radii), op: 0.8, age: 0, hit: true });
        if (s.hits.length > MAX_HITS) s.hits.shift();
      }

      // Age
      for (const l of s.tracers) { l.age++; l.op *= 0.96; }
      for (const l of s.hits) { l.age++; l.op *= 0.984; }
      s.tracers = s.tracers.filter(l => l.op > 0.015);
      s.hits = s.hits.filter(l => l.op > 0.015);

      // ===== RENDER =====
      ctx.clearRect(0, 0, w, h);
      ctx.shadowBlur = 0;

      const lw = 1.0 + s.acoustic * 1.3;
      const col = [62, 60, 56]; // deep warm slate

      // --- SILENT STATE: thin, light circle ---
      if (s.amp < 0.03) {
        const silentAlpha = 0.12 + s.amp * 2; // 0.12 at rest, ramps up
        ctx.beginPath();
        ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${silentAlpha})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // All layers, oldest first
      const layers = [
        ...s.tracers, ...s.hits,
        { d: disp, r: radii, op: 1.0, age: 0, hit: false },
      ].sort((a, b) => b.age - a.age);

      // --- INTERIOR ARTIFACTS ---
      if (s.amp > 0.02) {
        const interiorAlpha = s.amp * 0.12;

        if (v === "A") {
          // Tendrils — lines from opposing points through center
          for (let i = 0; i < N; i += 7) {
            const opp = (i + Math.floor(N/2)) % N;
            const a1 = (i / N) * Math.PI * 2 + rot;
            const a2 = (opp / N) * Math.PI * 2 + rot;
            const r1 = radii[i] * 0.6 + disp[i] * 0.3;
            const r2 = radii[opp] * 0.6 + disp[opp] * 0.3;
            const x1 = cx + Math.cos(a1) * r1;
            const y1 = cy + Math.sin(a1) * r1;
            const x2 = cx + Math.cos(a2) * r2;
            const y2 = cy + Math.sin(a2) * r2;
            // Curved tendril through offset center
            const cpOff = s.noise(i * 0.5, s.time * 0.3) * baseR * 0.3 * s.amp;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(cx + cpOff, cy + cpOff * 0.7, x2, y2);
            ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${interiorAlpha * (0.3 + Math.abs(disp[i]) / baseR)})`;
            ctx.lineWidth = 0.5 + s.acoustic * 0.5;
            ctx.stroke();
          }
        }

        if (v === "B") {
          // Interior fog — concentric soft rings at smaller radii
          for (let ring = 3; ring > 0; ring--) {
            const fogScale = 0.2 + ring * 0.15;
            const fogPts = [];
            for (let i = 0; i < N; i++) {
              const a = (i / N) * Math.PI * 2 + rot;
              const nr = radii[i] * fogScale + disp[i] * fogScale * 0.5;
              fogPts.push({ x: cx + Math.cos(a) * nr, y: cy + Math.sin(a) * nr });
            }
            drawSmooth(ctx, fogPts);
            ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${interiorAlpha * (0.4 / ring)})`;
            ctx.lineWidth = lw * (3 - ring) + 1;
            ctx.stroke();
          }
        }

        if (v === "C") {
          // Interior web — connecting every Nth point to create a net
          const webN = 5;
          for (let i = 0; i < N; i += webN) {
            for (let j = i + webN * 2; j < N; j += webN * 3) {
              const a1 = (i / N) * Math.PI * 2 + rot;
              const a2 = (j / N) * Math.PI * 2 + rot;
              const r1 = radii[i] * 0.5 + disp[i] * 0.2;
              const r2 = radii[j] * 0.5 + disp[j] * 0.2;
              ctx.beginPath();
              ctx.moveTo(cx + Math.cos(a1)*r1, cy + Math.sin(a1)*r1);
              ctx.lineTo(cx + Math.cos(a2)*r2, cy + Math.sin(a2)*r2);
              ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${interiorAlpha * 0.5})`;
              ctx.lineWidth = 0.3;
              ctx.stroke();
            }
          }
          // Center mass dot
          const cmSize = baseR * 0.04 * s.amp * (1 + beat * 0.5);
          const cmGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cmSize);
          cmGrad.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${interiorAlpha * 2})`);
          cmGrad.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
          ctx.fillStyle = cmGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, cmSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- OUTER RINGS ---
      for (const layer of layers) {
        const alpha = Math.max(0, Math.min(1, layer.op));
        if (alpha < 0.01) continue;

        const rShift = layer.age * (v === "C" ? 0.5 : 0.35);
        const ageFade = Math.max(0, 1 - layer.age * 0.01);
        const thisLw = lw * (layer.hit ? 1.6 : 1) * ageFade;

        // Outer path points
        const pts = [];
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2 + rot;
          const r = layer.r[i] + layer.d[i] - rShift;
          pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }

        // --- Dark outer edge — darkness scales with amplitude ---
        const edgeAlpha = alpha * (v === "B" ? 0.7 : 0.8) * (0.4 + s.amp * 0.6);

        // Wide soft inner-bleed pass (connective tissue — NO outward halo)
        drawSmooth(ctx, pts);
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${edgeAlpha * 0.12})`;
        ctx.lineWidth = thisLw * (v === "B" ? 5 : 4);
        ctx.stroke();
        ctx.restore();

        // Sharp contour — bolder when louder
        drawSmooth(ctx, pts);
        const contourPeak = 0.5 + s.amp * 0.45; // 0.5 at low amp → 0.95 at full
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${edgeAlpha * (layer.age === 0 ? contourPeak : 0.45)})`;
        ctx.lineWidth = Math.max(0.3, thisLw * (layer.age === 0 ? 1.0 + s.amp * 0.5 : 0.7));
        ctx.stroke();

        // Inward reflection — soft shadow only, tighter
        if (alpha > 0.06 && v !== "C") {
          const iPts = [];
          for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2 + rot;
            const r = Math.max(0, layer.r[i] - layer.d[i] * (v === "B" ? 0.3 : 0.35) + rShift * 0.3);
            iPts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
          }
          drawSmooth(ctx, iPts);
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.04})`;
          ctx.lineWidth = thisLw * 2.5;
          ctx.stroke();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, [variant]);

  useEffect(() => { stateRef.current.playing = isPlaying; }, [isPlaying]);

  const track = tracks[trackIndex];

  return (
    <div style={{
      width: "100vw", height: "100vh", position: "relative",
      background: "#EFEDE8", overflow: "hidden",
      fontFamily: "'D-DIN', 'DIN Alternate', system-ui, sans-serif",
      userSelect: "none",
    }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      {/* Logo */}
      <div style={{ position: "absolute", top: 24, left: 28, display: "flex", alignItems: "center", gap: 10, opacity: 0.45 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #2A2826", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#2A2826" }}>ü</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#2A2826", letterSpacing: 0.5, opacity: 0.7 }}>Fülkit</span>
      </div>

      {/* Close */}
      <div style={{ position: "absolute", top: 22, right: 28, opacity: 0.35, cursor: "pointer", fontSize: 22, color: "#2A2826" }}>✕</div>

      {/* Track info */}
      <div style={{ position: "absolute", bottom: 32, left: 28 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#2A2826", opacity: 0.55 }}>{track.name}</div>
        <div style={{ fontSize: 13, color: "#2A2826", opacity: 0.3, marginTop: 2 }}>{track.artist}</div>
      </div>

      {/* Test controls */}
      <div style={{ position: "absolute", bottom: 28, right: 28, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {/* Variant pills */}
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(VARIANTS).map(([k, v]) => (
            <div
              key={k}
              onClick={() => setVariant(k)}
              style={{
                padding: "5px 12px", borderRadius: 14, fontSize: 10, fontWeight: 700,
                letterSpacing: 0.8, textTransform: "uppercase",
                background: variant === k ? "#2A2826" : "transparent",
                color: variant === k ? "#EFEDE8" : "rgba(42,40,38,0.4)",
                border: `1px solid ${variant === k ? "#2A2826" : "rgba(42,40,38,0.15)"}`,
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              {k}: {v.name}
            </div>
          ))}
        </div>

        {/* Play + tracks */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {tracks.map((t, i) => (
              <div key={i} onClick={() => switchTrack(i)} style={{
                padding: "3px 9px", borderRadius: 10, fontSize: 9, fontWeight: 600,
                background: i === trackIndex ? "#2A2826" : "transparent",
                color: i === trackIndex ? "#EFEDE8" : "rgba(42,40,38,0.35)",
                border: `1px solid ${i === trackIndex ? "#2A2826" : "rgba(42,40,38,0.15)"}`,
                cursor: "pointer",
              }}>{i+1}</div>
            ))}
          </div>
          <div onClick={() => setIsPlaying(!isPlaying)} style={{
            width: 44, height: 44, borderRadius: "50%",
            background: isPlaying ? "#2A2826" : "transparent",
            border: `2px solid ${isPlaying ? "#2A2826" : "rgba(42,40,38,0.25)"}`,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="4" height="16" rx="1" fill="#EFEDE8"/><rect x="14" y="4" width="4" height="16" rx="1" fill="#EFEDE8"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7L8 5z" fill="#2A2826"/></svg>
            )}
          </div>
        </div>

        <div style={{ fontSize: 8, color: "rgba(42,40,38,0.2)", textAlign: "right", letterSpacing: 0.5, lineHeight: 1.4, fontWeight: 500 }}>
          SWITCH VARIANTS · TRACKS · PLAY
        </div>
      </div>
    </div>
  );
}
