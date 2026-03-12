import { useState, useRef, useEffect, useCallback } from "react";

function createNoise(seed) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed || Math.random() * 65536;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad2 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  return function(x, y) {
    const F2 = 0.5*(Math.sqrt(3)-1), G2 = (3-Math.sqrt(3))/6;
    const ss = (x+y)*F2;
    const i = Math.floor(x+ss), j = Math.floor(y+ss);
    const t = (i+j)*G2;
    const x0 = x-(i-t), y0 = y-(j-t);
    const i1 = x0>y0?1:0, j1 = x0>y0?0:1;
    const x1 = x0-i1+G2, y1 = y0-j1+G2;
    const x2 = x0-1+2*G2, y2 = y0-1+2*G2;
    const ii = i&255, jj = j&255;
    let n0=0,n1=0,n2=0;
    let t0=0.5-x0*x0-y0*y0;
    if(t0>0){t0*=t0;const gi=perm[ii+perm[jj]]%8;n0=t0*t0*(grad2[gi][0]*x0+grad2[gi][1]*y0);}
    let t1=0.5-x1*x1-y1*y1;
    if(t1>0){t1*=t1;const gi=perm[ii+i1+perm[jj+j1]]%8;n1=t1*t1*(grad2[gi][0]*x1+grad2[gi][1]*y1);}
    let t2=0.5-x2*x2-y2*y2;
    if(t2>0){t2*=t2;const gi=perm[ii+1+perm[jj+1]]%8;n2=t2*t2*(grad2[gi][0]*x2+grad2[gi][1]*y2);}
    return 70*(n0+n1+n2);
  };
}

function drawSmooth(ctx, pts) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo((pts[0].x+pts[pts.length-1].x)/2, (pts[0].y+pts[pts.length-1].y)/2);
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i], next = pts[(i+1)%pts.length];
    ctx.quadraticCurveTo(curr.x, curr.y, (curr.x+next.x)/2, (curr.y+next.y)/2);
  }
  ctx.closePath();
}

function smoothArr(arr, passes) {
  const len = arr.length;
  for (let p = 0; p < passes; p++) {
    const tmp = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      tmp[i] = arr[i]*0.5 + arr[(i-1+len)%len]*0.25 + arr[(i+1)%len]*0.25;
    }
    arr.set(tmp);
  }
}

export default function DeepAmoebaV3() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);

  const tracks = [
    { name:"Says", artist:"Nils Frahm", bpm:150, energy:0.6, dance:0.35, valence:0.3, acoustic:0.7, speech:0.04, instrumental:0.92, key:0, loudness:-12 },
    { name:"Epikur", artist:"David August", bpm:122, energy:0.72, dance:0.68, valence:0.45, acoustic:0.25, speech:0.05, instrumental:0.85, key:9, loudness:-8 },
    { name:"Come Together", artist:"Nox Vahn", bpm:120, energy:0.8, dance:0.75, valence:0.6, acoustic:0.15, speech:0.06, instrumental:0.78, key:2, loudness:-6 },
    { name:"Singularity", artist:"Stephan Bodzin", bpm:121, energy:0.85, dance:0.7, valence:0.25, acoustic:0.1, speech:0.03, instrumental:0.95, key:10, loudness:-5 },
  ];

  const mkState = useCallback(() => {
    const t = tracks[0];
    return {
      noise: createNoise(t.key*100+1), noise2: createNoise(t.key*100+2),
      noise3: createNoise(t.key*100+3), noise4: createNoise(t.key*100+4),
      noise5: createNoise(t.key*100+5),
      time: 0, playing: false, amp: 0, ampVel: 0,
      tracers: [], hits: [], frame: 0,
      progress: 0, duration: 480000,
      ...t,
    };
  }, []);

  if (!stateRef.current) stateRef.current = mkState();

  const switchTrack = useCallback((idx) => {
    const t = tracks[idx];
    const s = stateRef.current;
    Object.assign(s, t, {
      progress: 0, tracers: [], hits: [],
      noise: createNoise(t.key*100+1), noise2: createNoise(t.key*100+2),
      noise3: createNoise(t.key*100+3), noise4: createNoise(t.key*100+4),
      noise5: createNoise(t.key*100+5),
    });
    setTrackIdx(idx);
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

    const N = 72;
    const MAX_TRACE = 22;
    const MAX_HITS = 6;

    function draw() {
      if (!running) return;
      const s = stateRef.current;
      const w = window.innerWidth, h = window.innerHeight;
      const dim = Math.min(w, h);
      const baseR = dim * 0.22;

      s.time += 0.016;
      if (s.playing) s.progress += 16;

      const tgt = s.playing ? (0.35 + s.energy * 0.45) : 0.0;
      s.ampVel += (tgt - s.amp) * 0.055;
      s.ampVel *= 0.83;
      s.amp += s.ampVel;
      s.amp = Math.max(0, Math.min(1, s.amp));

      const cx = w/2 + s.noise(s.time*0.12, 50) * dim * 0.018;
      const cy = h/2 + s.noise(80, s.time*0.1) * dim * 0.018;
      const rot = s.time * 0.04;

      const msPerBeat = 60000 / s.bpm;
      const bPhase = s.playing ? (s.progress % msPerBeat) / msPerBeat : 1;
      const beat = Math.pow(1 - bPhase, 3) * s.dance;

      const rem = s.duration - s.progress;
      const exhale = rem < 6000 && rem > 0 ? 0.3 + 0.7*(rem/6000) : 1;

      const sharp = 1 - s.valence;
      const loud = Math.max(0, (s.loudness + 35) / 35);

      // Zone axis slowly rotates — features migrate around the form
      const zoneRot = s.time * 0.008 + (s.key / 12) * Math.PI * 2;

      const disp = new Float32Array(N);
      const radii = new Float32Array(N);
      const pointWeight = new Float32Array(N);

      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + rot;
        const nx = Math.cos(a), ny = Math.sin(a);

        // Zone weights — soft cosine blend, 4 zones at 90° intervals
        const za = a - zoneRot;
        const zBass    = Math.max(0, Math.cos(za)) ** 1.5;
        const zRhythm  = Math.max(0, Math.cos(za - Math.PI*0.5)) ** 1.5;
        const zVocal   = Math.max(0, Math.cos(za - Math.PI)) ** 1.5;
        const zTexture = Math.max(0, Math.cos(za - Math.PI*1.5)) ** 1.5;

        // Base warp
        const d1 = s.noise(nx*0.3, ny*0.3 + s.time*0.002);
        const d2 = s.noise2(nx*0.6+10, ny*0.6 + s.time*0.005);
        const d3 = s.noise3(nx*1.2+30, ny*1.2 + s.time*0.008);
        const irregularity = 0.4 + s.energy * 0.6;
        radii[i] = baseR * (1 + (d1*0.5 + d2*0.25 + d3*0.25*irregularity) * s.amp * 0.55);

        // BASS: low freq, big slow, energy × loudness
        const bassN = s.noise(nx*0.8 + s.time*0.12, ny*0.8 + s.time*0.1);
        const bassD = bassN * s.energy * loud * 1.2;

        // RHYTHM: mid freq, beat-pulsed, dance
        const rhythmN = s.noise2(nx*2.5 + s.time*0.3, ny*2.5 + s.time*0.25);
        const rhythmD = rhythmN * (0.5 + beat * 1.5) * s.dance * 0.9;

        // VOCAL: high freq when speech present, flatter when instrumental
        const vocalF = 4 + s.speech * 8;
        const vocalN = s.noise3(nx*vocalF + s.time*0.5, ny*vocalF + s.time*0.4);
        const vocalD = vocalN * (s.speech * 3 + 0.15) * 0.6;

        // TEXTURE: acoustic=smooth wide, digital=tight sharp
        const texF = 1.5 + (1-s.acoustic) * 4;
        const texN = s.noise4(nx*texF + s.time*0.2, ny*texF + s.time*0.18);
        const texD = texN * (0.4 + s.acoustic * 0.4) * 0.8;

        // Blend by zone weights
        let totalD = bassD*zBass + rhythmD*zRhythm + vocalD*zVocal + texD*zTexture;
        const zSum = zBass + zRhythm + zVocal + zTexture;
        if (zSum > 0) totalD /= (zSum * 0.7 + 0.3);

        totalD = Math.sign(totalD) * Math.pow(Math.abs(totalD), 1 + sharp * 0.5);

        disp[i] = totalD * s.amp * (1 + beat*0.7) * exhale * baseR * 0.85;
        disp[i] *= (1 + (Math.random()-0.5)*0.04);

        // Per-point weight — bass/acoustic zones thicker
        pointWeight[i] = 0.7 + zBass*s.acoustic*0.8 + zTexture*s.acoustic*0.6 - zVocal*0.2;
      }

      smoothArr(disp, 2);
      smoothArr(radii, 2);

      // Tracers
      s.frame++;
      if (s.frame % 3 === 0 && s.amp > 0.01) {
        s.tracers.push({ d: new Float32Array(disp), r: new Float32Array(radii), w: new Float32Array(pointWeight), op: 0.6, age: 0, hit: false });
        if (s.tracers.length > MAX_TRACE) s.tracers.shift();
      }

      // Hits
      if (beat > 0.6 && s.playing && s.frame % 3 === 0) {
        const hd = new Float32Array(N);
        for (let i = 0; i < N; i++) hd[i] = disp[i] * 2.0;
        smoothArr(hd, 1);
        s.hits.push({ d: hd, r: new Float32Array(radii), w: new Float32Array(pointWeight), op: 0.85, age: 0, hit: true });
        if (s.hits.length > MAX_HITS) s.hits.shift();
      }

      for (const l of s.tracers) { l.age++; l.op *= 0.96; }
      for (const l of s.hits) { l.age++; l.op *= 0.984; }
      s.tracers = s.tracers.filter(l => l.op > 0.015);
      s.hits = s.hits.filter(l => l.op > 0.015);

      // ===== RENDER =====
      ctx.clearRect(0, 0, w, h);

      const baseLw = 1.0 + s.acoustic * 1.2;
      const col = [78, 75, 68]; // softer warm grey — less black

      // Silent: light circle
      if (s.amp < 0.03) {
        ctx.beginPath();
        ctx.arc(cx, cy, baseR, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.1 + s.amp*2})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const layers = [
        ...s.tracers, ...s.hits,
        { d: disp, r: radii, w: pointWeight, op: 1.0, age: 0, hit: false },
      ].sort((a, b) => b.age - a.age);

      // Interior tendrils
      if (s.amp > 0.02) {
        const iA = s.amp * 0.1;
        for (let i = 0; i < N; i += 6) {
          const opp = (i + Math.floor(N/2)) % N;
          const a1 = (i/N)*Math.PI*2+rot, a2 = (opp/N)*Math.PI*2+rot;
          const r1 = radii[i]*0.6 + disp[i]*0.3;
          const r2 = radii[opp]*0.6 + disp[opp]*0.3;
          const x1 = cx+Math.cos(a1)*r1, y1 = cy+Math.sin(a1)*r1;
          const x2 = cx+Math.cos(a2)*r2, y2 = cy+Math.sin(a2)*r2;
          const rawOff = s.noise(i*0.5, s.time*0.3);
          const minOff = 0.4 * (rawOff >= 0 ? 1 : -1);
          const cpNoise = Math.abs(rawOff) < 0.4 ? minOff : rawOff;
          const cpDist = cpNoise * baseR * 0.35 * s.amp;
          const midX = (x1+x2)/2, midY = (y1+y2)/2;
          const perpX = -(y2-y1), perpY = (x2-x1);
          const perpLen = Math.sqrt(perpX*perpX + perpY*perpY) || 1;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo(midX + (perpX/perpLen)*cpDist, midY + (perpY/perpLen)*cpDist, x2, y2);
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${iA * (0.2 + Math.abs(disp[i])/baseR + pointWeight[i]*0.15)})`;
          ctx.lineWidth = 0.4 + pointWeight[i] * 0.4;
          ctx.stroke();
        }
      }

      // Outer rings
      for (const layer of layers) {
        const alpha = Math.max(0, Math.min(1, layer.op));
        if (alpha < 0.01) continue;

        const rShift = layer.age * 0.35;
        const ageFade = Math.max(0, 1 - layer.age * 0.012);

        const pts = [];
        for (let i = 0; i < N; i++) {
          const a = (i/N)*Math.PI*2+rot;
          pts.push({ x: cx+Math.cos(a)*(layer.r[i]+layer.d[i]-rShift), y: cy+Math.sin(a)*(layer.r[i]+layer.d[i]-rShift) });
        }

        const edgeAlpha = alpha * 0.8 * (0.4 + s.amp*0.6);

        // Inward bleed
        drawSmooth(ctx, pts);
        ctx.save(); ctx.clip();
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${edgeAlpha * 0.12})`;
        ctx.lineWidth = baseLw * (layer.hit ? 1.6 : 1) * ageFade * 4;
        ctx.stroke(); ctx.restore();

        // Variable-weight contour — per-segment
        for (let i = 0; i < N; i++) {
          const i2 = (i+1) % N;
          const p1 = pts[i], p2 = pts[i2];
          const segW = (layer.w[i] + layer.w[i2]) / 2;

          const segAlpha = edgeAlpha * (layer.age === 0 ?
            (0.5 + s.amp*0.45) : 0.35 + segW*0.15);

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${segAlpha})`;
          ctx.lineWidth = Math.max(0.2, baseLw * (layer.hit?1.5:1) * ageFade *
            (layer.age===0 ? (0.8+segW*0.7) : (0.5+segW*0.4)));
          ctx.stroke();
        }

        // Inward reflection
        if (alpha > 0.06) {
          const iPts = [];
          for (let i = 0; i < N; i++) {
            const a = (i/N)*Math.PI*2+rot;
            const r = Math.max(0, layer.r[i] - layer.d[i]*0.35 + rShift*0.3);
            iPts.push({ x: cx+Math.cos(a)*r, y: cy+Math.sin(a)*r });
          }
          drawSmooth(ctx, iPts);
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha*0.04})`;
          ctx.lineWidth = baseLw * ageFade * 2.5;
          ctx.stroke();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { running=false; cancelAnimationFrame(animRef.current); window.removeEventListener("resize",resize); };
  }, []);

  useEffect(() => { stateRef.current.playing = isPlaying; }, [isPlaying]);
  const track = tracks[trackIdx];

  return (
    <div style={{ width:"100vw", height:"100vh", position:"relative", background:"#EFEDE8", overflow:"hidden", fontFamily:"'D-DIN','DIN Alternate',system-ui,sans-serif", userSelect:"none" }}>
      <canvas ref={canvasRef} style={{ position:"absolute", inset:0 }} />
      <div style={{ position:"absolute", top:24, left:28, display:"flex", alignItems:"center", gap:10, opacity:0.5 }}>
        <div style={{ width:30, height:30, borderRadius:"50%", border:"1.5px solid #2A2826", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:"#2A2826" }}>ü</div>
        <span style={{ fontSize:13, fontWeight:600, color:"#2A2826", letterSpacing:0.5, opacity:0.7 }}>Fülkit</span>
      </div>
      <div style={{ position:"absolute", top:22, right:28, opacity:0.35, cursor:"pointer", fontSize:22, color:"#2A2826" }}>✕</div>
      <div style={{ position:"absolute", bottom:32, left:28 }}>
        <div style={{ fontSize:20, fontWeight:600, color:"#2A2826", opacity:0.6 }}>{track.name}</div>
        <div style={{ fontSize:13, color:"#2A2826", opacity:0.3, marginTop:3 }}>{track.artist}</div>
        <div style={{ fontSize:10, color:"#2A2826", opacity:0.2, marginTop:8, fontFamily:"monospace", letterSpacing:1 }}>{track.bpm} BPM</div>
      </div>
      <div style={{ position:"absolute", bottom:28, right:28, display:"flex", alignItems:"center", gap:8 }}>
        {tracks.map((t,i) => (
          <div key={i} onClick={() => switchTrack(i)} style={{
            padding:"5px 12px", borderRadius:12, fontSize:10, fontWeight:600,
            background:i===trackIdx?"#2A2826":"transparent",
            color:i===trackIdx?"#EFEDE8":"rgba(42,40,38,0.35)",
            border:`1px solid ${i===trackIdx?"#2A2826":"rgba(42,40,38,0.15)"}`,
            cursor:"pointer",
          }}>{t.name.split(" ")[0]}</div>
        ))}
        <div onClick={() => setIsPlaying(!isPlaying)} style={{
          width:46, height:46, borderRadius:"50%",
          background:isPlaying?"#2A2826":"transparent",
          border:`2px solid ${isPlaying?"#2A2826":"rgba(42,40,38,0.25)"}`,
          display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
        }}>
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" fill="#EFEDE8"/><rect x="14" y="4" width="4" height="16" rx="1" fill="#EFEDE8"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z" fill="#2A2826"/></svg>
          )}
        </div>
      </div>
    </div>
  );
}
