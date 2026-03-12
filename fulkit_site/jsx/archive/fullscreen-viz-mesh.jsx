import { useState, useRef, useEffect, useCallback } from "react";

function mkN(seed) {
  const perm=new Uint8Array(512),p=new Uint8Array(256);
  for(let i=0;i<256;i++)p[i]=i;
  let s=seed||1;
  for(let i=255;i>0;i--){s=(s*16807)%2147483647;[p[i],p[s%(i+1)]]=[p[s%(i+1)],p[i]];}
  for(let i=0;i<512;i++)perm[i]=p[i&255];
  const g=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  return(x,y)=>{const F=.5*(Math.sqrt(3)-1),G=(3-Math.sqrt(3))/6,ss=(x+y)*F,i=Math.floor(x+ss),j=Math.floor(y+ss),t=(i+j)*G,x0=x-(i-t),y0=y-(j-t),i1=x0>y0?1:0,j1=x0>y0?0:1,x1=x0-i1+G,y1=y0-j1+G,x2=x0-1+2*G,y2=y0-1+2*G,ii=i&255,jj=j&255;let n0=0,n1=0,n2=0,t0=.5-x0*x0-y0*y0;if(t0>0){t0*=t0;const gi=perm[ii+perm[jj]]%8;n0=t0*t0*(g[gi][0]*x0+g[gi][1]*y0);}let t1=.5-x1*x1-y1*y1;if(t1>0){t1*=t1;const gi=perm[ii+i1+perm[jj+j1]]%8;n1=t1*t1*(g[gi][0]*x1+g[gi][1]*y1);}let t2=.5-x2*x2-y2*y2;if(t2>0){t2*=t2;const gi=perm[ii+1+perm[jj+1]]%8;n2=t2*t2*(g[gi][0]*x2+g[gi][1]*y2);}return 70*(n0+n1+n2);};
}

const MODES = {
  A: { name:"Terrain", desc:"Grid mountain — energy lifts peaks, valence shapes ridges" },
  B: { name:"Iceberg", desc:"Above and below — current moment rises, history sinks" },
  C: { name:"Veil", desc:"Draped cloth mesh over invisible audio form" },
  D: { name:"Crystal", desc:"Faceted gem — key sets structure, energy scales" },
  E: { name:"Spire", desc:"Vertical column — song builds upward over time" },
};

export default function MeshForm() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const [mode, setMode] = useState("A");
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);

  const tracks = [
    { name:"Says", artist:"Nils Frahm", bpm:150, energy:.6, dance:.35, valence:.3, acoustic:.7, instrumental:.92, key:0, loudness:-12 },
    { name:"Epikur", artist:"David August", bpm:122, energy:.72, dance:.68, valence:.45, acoustic:.25, instrumental:.85, key:9, loudness:-8 },
    { name:"Come Together", artist:"Nox Vahn", bpm:120, energy:.8, dance:.75, valence:.6, acoustic:.15, instrumental:.78, key:2, loudness:-6 },
    { name:"Singularity", artist:"Stephan Bodzin", bpm:121, energy:.85, dance:.7, valence:.25, acoustic:.1, instrumental:.95, key:10, loudness:-5 },
  ];

  const mkState = useCallback(() => {
    const t = tracks[0];
    return {
      n: Array.from({length:6},(_,i)=>mkN(t.key*100+i+1)),
      time:0, playing:false, amp:0, ampVel:0,
      frame:0, progress:0, duration:480000,
      spireHistory: [], // for mode E
      ...t,
    };
  }, []);

  if (!stateRef.current) stateRef.current = mkState();

  const switchTrack = useCallback((idx) => {
    const t = tracks[idx];
    Object.assign(stateRef.current, t, {
      progress:0, spireHistory:[],
      n: Array.from({length:6},(_,i)=>mkN(t.key*100+i+1)),
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

    // 3D → 2D projection with perspective
    function project(x3, y3, z3, cx, cy, scale, rotY, rotX) {
      // Rotate around Y axis
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      let rx = x3 * cosY - z3 * sinY;
      let rz = x3 * sinY + z3 * cosY;
      // Rotate around X axis
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      let ry = y3 * cosX - rz * sinX;
      rz = y3 * sinX + rz * cosX;
      // Perspective
      const perspective = 600;
      const depth = perspective / (perspective + rz + 200);
      return {
        x: cx + rx * scale * depth,
        y: cy + ry * scale * depth,
        depth,
        z: rz,
      };
    }

    function draw() {
      if (!running) return;
      const s = stateRef.current;
      const [n1,n2,n3,n4,n5,n6] = s.n;
      const w = window.innerWidth, h = window.innerHeight;
      const dim = Math.min(w, h);
      const m = mode;

      s.time += .016;
      if (s.playing) s.progress += 16;

      // Spring
      const tgt = s.playing ? (.3 + s.energy * .5) : 0;
      s.ampVel += (tgt - s.amp) * .06;
      s.ampVel *= .82;
      s.amp += s.ampVel;
      s.amp = Math.max(0, Math.min(1, s.amp));

      const beat = s.playing ? Math.pow(1-(s.progress%(60000/s.bpm))/(60000/s.bpm), 3) * s.dance : 0;
      const loud = Math.max(0, (s.loudness+35)/35);
      const sharp = 1 - s.valence;

      // Slow rotation
      const rotY = s.time * .08 + (s.key/12) * Math.PI;
      const rotX = -.45 + n1(s.time*.02, 100) * .1; // slight tilt variation

      const cx = w/2, cy = h * .48;
      const sc = dim * .4;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#EFEDE8";
      ctx.fillRect(0, 0, w, h);

      if (s.amp < .005) { animRef.current = requestAnimationFrame(draw); return; }

      // ===== GENERATE 3D MESH BASED ON MODE =====
      let vertices = []; // {x3,y3,z3}
      let edges = [];    // [idx1, idx2]
      let gridW, gridH;

      if (m === "A") {
        // TERRAIN — rectangular grid, Y displaced by noise
        gridW = 28; gridH = 28;
        for (let gz = 0; gz < gridH; gz++) {
          for (let gx = 0; gx < gridW; gx++) {
            const nx = (gx/(gridW-1) - .5) * 2; // -1 to 1
            const nz = (gz/(gridH-1) - .5) * 2;
            // Height from multiple noise octaves + audio features
            const h1 = n1(nx*2 + s.time*.1, nz*2 + s.time*.08) * s.energy;
            const h2 = n2(nx*4 + s.time*.2, nz*4 + s.time*.15) * s.energy * .4;
            const h3 = n3(nx*8 + s.time*.35, nz*8) * s.energy * .15 * (1-s.valence);
            // Center peak bias
            const centerDist = Math.sqrt(nx*nx + nz*nz);
            const peak = Math.max(0, 1 - centerDist * 1.2);
            const height = (h1 + h2 + h3) * peak * s.amp * (1 + beat * .5);
            vertices.push({ x3: nx, y3: -height, z3: nz });

            const idx = gz * gridW + gx;
            if (gx < gridW-1) edges.push([idx, idx+1]);
            if (gz < gridH-1) edges.push([idx, idx+gridW]);
          }
        }
      }

      else if (m === "B") {
        // ICEBERG — grid above AND below a horizon plane
        gridW = 24; gridH = 24;
        // Top half
        for (let gz = 0; gz < gridH; gz++) {
          for (let gx = 0; gx < gridW; gx++) {
            const nx = (gx/(gridW-1)-.5)*2, nz = (gz/(gridH-1)-.5)*2;
            const cDist = Math.sqrt(nx*nx+nz*nz);
            const peak = Math.max(0, 1-cDist*1.1);
            const h1 = n1(nx*2.5+s.time*.12, nz*2.5+s.time*.09);
            const height = Math.abs(h1) * peak * s.amp * s.energy * (1+beat*.4);
            vertices.push({ x3:nx, y3:-height, z3:nz });
          }
        }
        // Bottom half (mirrored, dampened)
        const topCount = vertices.length;
        for (let gz = 0; gz < gridH; gz++) {
          for (let gx = 0; gx < gridW; gx++) {
            const nx = (gx/(gridW-1)-.5)*2, nz = (gz/(gridH-1)-.5)*2;
            const cDist = Math.sqrt(nx*nx+nz*nz);
            const peak = Math.max(0, 1-cDist*1.3);
            const h1 = n2(nx*2+s.time*.08, nz*2+s.time*.06);
            const height = Math.abs(h1) * peak * s.amp * s.energy * .6;
            vertices.push({ x3:nx*.95, y3:height*.8+.05, z3:nz*.95 });
          }
        }
        // Edges for both grids
        for (let half = 0; half < 2; half++) {
          const off = half * topCount;
          const gw = gridW;
          for (let gz = 0; gz < gridH; gz++) {
            for (let gx = 0; gx < gw; gx++) {
              const idx = off + gz*gw + gx;
              if (gx < gw-1) edges.push([idx, idx+1]);
              if (gz < gridH-1) edges.push([idx, idx+gw]);
            }
          }
        }
        // Vertical connections between top and bottom at sparse points
        for (let i = 0; i < topCount; i += 5) {
          edges.push([i, topCount + i]);
        }
      }

      else if (m === "C") {
        // VEIL — cloth mesh that drapes over an invisible form
        gridW = 30; gridH = 30;
        for (let gz = 0; gz < gridH; gz++) {
          for (let gx = 0; gx < gridW; gx++) {
            const nx = (gx/(gridW-1)-.5)*2, nz = (gz/(gridH-1)-.5)*2;
            // Invisible form underneath — blob shape
            const formR = .6 + n3(nx*.8, nz*.8) * .2 * s.amp;
            const cDist = Math.sqrt(nx*nx + nz*nz);
            // Cloth drapes: where it's over the form, it sits on top. Where it's not, it hangs
            let height;
            if (cDist < formR) {
              // On the form — follows its surface
              const surface = n1(nx*3+s.time*.1, nz*3+s.time*.08) * s.energy * .6;
              const formHeight = (formR - cDist) * 1.5 * s.amp;
              height = formHeight + surface * s.amp * (1+beat*.3);
            } else {
              // Hanging — gravity pulls down, further = lower
              const hangDist = cDist - formR;
              height = -hangDist * .8 * s.amp;
              // Acoustic = more drape, digital = stiffer
              height *= (.5 + s.acoustic * .5);
            }
            // Cloth ripple
            height += n4(nx*6+s.time*.3, nz*6+s.time*.25) * .05 * s.amp;
            vertices.push({ x3:nx, y3:-height, z3:nz });

            const idx = gz*gridW+gx;
            if (gx<gridW-1) edges.push([idx, idx+1]);
            if (gz<gridH-1) edges.push([idx, idx+gridW]);
          }
        }
      }

      else if (m === "D") {
        // CRYSTAL — icosahedron-inspired mesh, subdivided
        // Base icosahedron vertices
        const phi = (1+Math.sqrt(5))/2;
        const icoVerts = [
          [-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],
          [0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],
          [phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1],
        ];
        // Normalize and scale
        for (const v of icoVerts) {
          const len = Math.sqrt(v[0]**2+v[1]**2+v[2]**2);
          v[0]/=len; v[1]/=len; v[2]/=len;
        }
        // Icosahedron faces (triangles)
        const icoFaces = [
          [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
          [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
          [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
          [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
        ];

        // Subdivide each face once
        const midCache = {};
        function getMid(a, b) {
          const key = Math.min(a,b)+'-'+Math.max(a,b);
          if (midCache[key] !== undefined) return midCache[key];
          const va = icoVerts[a], vb = icoVerts[b];
          const mid = [(va[0]+vb[0])/2, (va[1]+vb[1])/2, (va[2]+vb[2])/2];
          const len = Math.sqrt(mid[0]**2+mid[1]**2+mid[2]**2);
          mid[0]/=len; mid[1]/=len; mid[2]/=len;
          icoVerts.push(mid);
          midCache[key] = icoVerts.length-1;
          return midCache[key];
        }

        const newFaces = [];
        for (const [a,b,c] of icoFaces) {
          const ab=getMid(a,b), bc=getMid(b,c), ca=getMid(c,a);
          newFaces.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);
        }

        // Deform vertices by noise + audio
        for (const v of icoVerts) {
          const nx=v[0], ny=v[1], nz=v[2];
          const deform = 1 + n1(nx*3+s.time*.15, nz*3+ny*2) * s.energy * .4 * s.amp;
          const beatPush = 1 + beat * .15 * Math.abs(n2(nx*5, nz*5+s.time*.3));
          // Sharp crystals for low valence, rounded for high
          const facet = 1 + (1-s.valence) * n3(nx*8, nz*8+s.time*.2) * .15 * s.amp;
          const r = deform * beatPush * facet;
          vertices.push({ x3: v[0]*r, y3: v[1]*r, z3: v[2]*r });
        }
        // Edges from faces
        const edgeSet = new Set();
        for (const [a,b,c] of newFaces) {
          const add = (i,j) => { const k=Math.min(i,j)+'-'+Math.max(i,j); if(!edgeSet.has(k)){edgeSet.add(k);edges.push([i,j]);}};
          add(a,b); add(b,c); add(c,a);
        }
      }

      else if (m === "E") {
        // SPIRE — stacked cross-section rings that build upward
        const rings = 35;
        const ptsPerRing = 20;

        // Accumulate spire history
        if (s.playing && s.frame % 3 === 0 && s.spireHistory.length < rings) {
          const ringData = [];
          for (let i = 0; i < ptsPerRing; i++) {
            const a = (i/ptsPerRing) * Math.PI * 2;
            const r = .3 + n1(Math.cos(a)*2+s.time*.3, Math.sin(a)*2+s.time*.25) * .25 * s.amp * s.energy;
            ringData.push(r + beat * .08);
          }
          s.spireHistory.push(ringData);
        }

        const totalRings = s.spireHistory.length;
        for (let ring = 0; ring < totalRings; ring++) {
          const rd = s.spireHistory[ring];
          const yPos = (ring / rings - .5) * 2; // -1 to 1 bottom to top
          for (let i = 0; i < ptsPerRing; i++) {
            const a = (i/ptsPerRing)*Math.PI*2 + ring*.05; // slight twist per layer
            const r = rd[i];
            vertices.push({
              x3: Math.cos(a) * r,
              y3: -yPos,
              z3: Math.sin(a) * r,
            });
            const idx = ring * ptsPerRing + i;
            // Horizontal edge (around ring)
            if (i < ptsPerRing-1) edges.push([idx, idx+1]);
            else edges.push([idx, idx-ptsPerRing+1]); // close ring
            // Vertical edge (between rings)
            if (ring > 0) edges.push([idx, idx-ptsPerRing]);
          }
        }
      }

      // ===== PROJECT AND RENDER =====
      const projected = vertices.map(v => project(v.x3, v.y3, v.z3, cx, cy, sc, rotY, rotX));

      // Sort edges by average depth (back to front)
      edges.sort((a, b) => {
        const za = (projected[a[0]].z + projected[a[1]].z) / 2;
        const zb = (projected[b[0]].z + projected[b[1]].z) / 2;
        return za - zb;
      });

      // Draw edges
      for (const [i, j] of edges) {
        const a = projected[i], b = projected[j];
        if (!a || !b) continue;

        // Depth-based alpha — closer = brighter
        const avgDepth = (a.depth + b.depth) / 2;
        const depthAlpha = Math.pow(avgDepth, 1.5);
        const alpha = depthAlpha * s.amp * (.15 + s.energy * .4) * (.5 + loud * .5);

        if (alpha < .005) continue;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(42,40,36,${Math.min(.7, alpha)})`;
        ctx.lineWidth = (.3 + s.acoustic * .8) * avgDepth;
        ctx.stroke();
      }

      // Draw vertex dots (only the brighter ones)
      for (const p of projected) {
        const alpha = Math.pow(p.depth, 2) * s.amp * (.1 + s.energy * .3);
        if (alpha < .03) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (.5 + s.acoustic) * p.depth, 0, Math.PI*2);
        ctx.fillStyle = `rgba(42,40,36,${Math.min(.6, alpha)})`;
        ctx.fill();
      }

      // Highlight bright vertices on beat
      if (beat > .5 && s.playing) {
        for (let i = 0; i < projected.length; i += Math.max(1, Math.floor(projected.length/20))) {
          const p = projected[i];
          const alpha = beat * p.depth * s.amp * .4;
          if (alpha < .02) continue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (1.5 + beat * 3) * p.depth, 0, Math.PI*2);
          ctx.fillStyle = `rgba(42,40,36,${Math.min(.5, alpha)})`;
          ctx.fill();
        }
      }

      // ===== HORIZON LINE for Iceberg mode =====
      if (m === "B") {
        const hy = project(0, 0, 0, cx, cy, sc, rotY, rotX).y;
        ctx.beginPath();
        ctx.moveTo(0, hy);
        ctx.lineTo(w, hy);
        ctx.strokeStyle = `rgba(42,40,36,${s.amp * .08})`;
        ctx.lineWidth = .5;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      s.frame++;
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { running=false; cancelAnimationFrame(animRef.current); window.removeEventListener("resize",resize); };
  }, [mode]);

  useEffect(() => { stateRef.current.playing = isPlaying; }, [isPlaying]);
  const track = tracks[trackIdx];

  return (
    <div style={{ width:"100vw", height:"100vh", position:"relative", background:"#EFEDE8", overflow:"hidden", fontFamily:"'D-DIN','DIN Alternate',system-ui,sans-serif", userSelect:"none" }}>
      <canvas ref={canvasRef} style={{ position:"absolute", inset:0 }} />

      {/* Logo */}
      <div style={{ position:"absolute", top:24, left:28, display:"flex", alignItems:"center", gap:10, opacity:.5 }}>
        <div style={{ width:30, height:30, borderRadius:"50%", border:"1.5px solid #2A2826", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:"#2A2826" }}>ü</div>
        <span style={{ fontSize:13, fontWeight:600, color:"#2A2826", letterSpacing:.5, opacity:.7 }}>Fülkit</span>
      </div>

      <div style={{ position:"absolute", top:22, right:28, opacity:.35, cursor:"pointer", fontSize:22, color:"#2A2826" }}>✕</div>

      {/* Track info */}
      <div style={{ position:"absolute", bottom:32, left:28 }}>
        <div style={{ fontSize:20, fontWeight:600, color:"#2A2826", opacity:.6, letterSpacing:-.3 }}>{track.name}</div>
        <div style={{ fontSize:13, color:"#2A2826", opacity:.3, marginTop:3 }}>{track.artist}</div>
        <div style={{ fontSize:10, color:"#2A2826", opacity:.2, marginTop:8, fontFamily:"monospace", letterSpacing:1 }}>
          {track.bpm} BPM
        </div>
      </div>

      {/* Controls */}
      <div style={{ position:"absolute", bottom:28, right:28, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10 }}>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent:"flex-end" }}>
          {Object.entries(MODES).map(([k,v]) => (
            <div key={k} onClick={() => setMode(k)} style={{
              padding:"5px 12px", borderRadius:14, fontSize:10, fontWeight:700,
              letterSpacing:.6, textTransform:"uppercase",
              background:mode===k?"#2A2826":"transparent",
              color:mode===k?"#EFEDE8":"rgba(42,40,38,.4)",
              border:`1px solid ${mode===k?"#2A2826":"rgba(42,40,38,.15)"}`,
              cursor:"pointer", transition:"all .2s",
            }}>{k}</div>
          ))}
        </div>
        <div style={{ fontSize:10, color:"rgba(42,40,38,.3)", textAlign:"right", maxWidth:250 }}>{MODES[mode].desc}</div>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {tracks.map((t,i) => (
            <div key={i} onClick={() => switchTrack(i)} style={{
              padding:"4px 10px", borderRadius:10, fontSize:10, fontWeight:600,
              background:i===trackIdx?"#2A2826":"transparent",
              color:i===trackIdx?"#EFEDE8":"rgba(42,40,38,.35)",
              border:`1px solid ${i===trackIdx?"#2A2826":"rgba(42,40,38,.15)"}`,
              cursor:"pointer",
            }}>{t.name.split(" ")[0]}</div>
          ))}
          <div onClick={() => setIsPlaying(!isPlaying)} style={{
            width:46, height:46, borderRadius:"50%",
            background:isPlaying?"#2A2826":"transparent",
            border:`2px solid ${isPlaying?"#2A2826":"rgba(42,40,38,.25)"}`,
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
    </div>
  );
}
