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

function buildMesh(subdivs) {
  const phi=(1+Math.sqrt(5))/2;
  const raw=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]];
  for(const v of raw){const l=Math.sqrt(v[0]**2+v[1]**2+v[2]**2);v[0]/=l;v[1]/=l;v[2]/=l;}
  let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  for(let s=0;s<subdivs;s++){
    const mc={};
    const gm=(a,b)=>{const k=Math.min(a,b)+'-'+Math.max(a,b);if(mc[k]!==undefined)return mc[k];const va=raw[a],vb=raw[b],m=[(va[0]+vb[0])/2,(va[1]+vb[1])/2,(va[2]+vb[2])/2],l=Math.sqrt(m[0]**2+m[1]**2+m[2]**2);m[0]/=l;m[1]/=l;m[2]/=l;raw.push(m);return mc[k]=raw.length-1;};
    const nf=[];for(const[a,b,c]of faces){const ab=gm(a,b),bc=gm(b,c),ca=gm(c,a);nf.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}faces=nf;
  }
  const es=new Set(),edges=[];
  for(const[a,b,c]of faces){const add=(i,j)=>{const k=Math.min(i,j)+'-'+Math.max(i,j);if(!es.has(k)){es.add(k);edges.push([i,j]);}};add(a,b);add(b,c);add(c,a);}
  // Build neighbor map
  const neighbors = raw.map(()=>[]);
  for(const[i,j]of edges){neighbors[i].push(j);neighbors[j].push(i);}
  return { baseVerts:raw.map(v=>[...v]), edges, neighbors };
}

const MODES = {
  F1: { name:"Current", desc:"3D flow field pushes vertices sideways — mesh drifts like smoke in water" },
  F2: { name:"Breathe", desc:"Surface tension + slow inhale/exhale — organic expansion and contraction" },
  F3: { name:"Swarm", desc:"Vertices flock — local alignment + separation creates schooling behavior" },
  F4: { name:"Erosion", desc:"Gravity pulls vertices down, beat lifts them — sediment settling and stirring" },
};

export default function FluidMesh() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const [mode, setMode] = useState("F1");
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
    const mesh = buildMesh(2);
    const numV = mesh.baseVerts.length;
    return {
      n: Array.from({length:8},(_,i)=>mkN(t.key*100+i+1)),
      time:0, playing:false, amp:0, ampVel:0,
      frame:0, progress:0, duration:480000,
      mesh,
      // Live vertex positions (mutable, start on unit sphere)
      pos: mesh.baseVerts.map(v=>[v[0],v[1],v[2]]),
      // Per-vertex velocity (full 3D)
      vel: Array.from({length:numV},()=>[0,0,0]),
      // Rest lengths for edges
      restLen: mesh.edges.map(([i,j])=>{
        const a=mesh.baseVerts[i],b=mesh.baseVerts[j];
        return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);
      }),
      ...t,
    };
  }, []);

  if (!stateRef.current) stateRef.current = mkState();

  const switchTrack = useCallback((idx) => {
    const t = tracks[idx];
    const s = stateRef.current;
    const mesh = buildMesh(2);
    const numV = mesh.baseVerts.length;
    Object.assign(s, t, {
      progress:0, mesh,
      pos: mesh.baseVerts.map(v=>[v[0],v[1],v[2]]),
      vel: Array.from({length:numV},()=>[0,0,0]),
      restLen: mesh.edges.map(([i,j])=>{
        const a=mesh.baseVerts[i],b=mesh.baseVerts[j];
        return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);
      }),
      n: Array.from({length:8},(_,i)=>mkN(t.key*100+i+1)),
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

    function draw() {
      if (!running) return;
      const s = stateRef.current;
      const nn = s.n;
      const w = window.innerWidth, h = window.innerHeight;
      const dim = Math.min(w, h);
      const m = mode;

      s.time += .016;
      if (s.playing) s.progress += 16;

      const tgt = s.playing ? (.3 + s.energy * .5) : 0;
      s.ampVel += (tgt - s.amp) * .06;
      s.ampVel *= .82;
      s.amp += s.ampVel;
      s.amp = Math.max(0, Math.min(1, s.amp));

      const msPerBeat = 60000 / s.bpm;
      const bPhase = s.playing ? (s.progress % msPerBeat) / msPerBeat : 1;
      const beat = Math.pow(1 - bPhase, 3) * s.dance;
      const loud = Math.max(0, (s.loudness+35)/35);
      const sharp = 1 - s.valence;

      const rotY = s.time * .04 + (s.key/12) * Math.PI;
      const rotX = -.3 + nn[0](s.time*.012, 100) * .12;

      const numV = s.pos.length;
      const pos = s.pos;
      const vel = s.vel;

      // ===== PHYSICS =====
      if (s.amp > .01) {
        const dt = .016;

        // --- EXTERNAL FORCES (mode-specific) ---
        for (let vi = 0; vi < numV; vi++) {
          const px = pos[vi][0], py = pos[vi][1], pz = pos[vi][2];
          let fx = 0, fy = 0, fz = 0;

          if (m === "F1") {
            // 3D FLOW FIELD — curl noise pushes vertices laterally
            const fieldScale = 1.5;
            const speed = (.3 + s.energy * .8) * s.amp;
            // Use pairs of noise to approximate curl (divergence-free flow)
            const nx1 = nn[0](py*fieldScale + s.time*.15, pz*fieldScale);
            const ny1 = nn[1](pz*fieldScale + s.time*.12, px*fieldScale);
            const nz1 = nn[2](px*fieldScale + s.time*.18, py*fieldScale);
            // Second sample offset for curl
            const nx2 = nn[3](py*fieldScale + s.time*.15, (pz+.01)*fieldScale);
            const ny2 = nn[4]((pz+.01)*fieldScale + s.time*.12, px*fieldScale);
            const nz2 = nn[5]((px+.01)*fieldScale + s.time*.18, py*fieldScale);

            // Approximate curl
            fx = (nz2 - nz1) * speed * 40;
            fy = (nx2 - nx1) * speed * 40;
            fz = (ny2 - ny1) * speed * 40;

            // Beat: radial burst
            const dist = Math.sqrt(px*px+py*py+pz*pz) || 1;
            fx += (px/dist) * beat * 2;
            fy += (py/dist) * beat * 2;
            fz += (pz/dist) * beat * 2;
          }

          else if (m === "F2") {
            // BREATHE — surface tension toward sphere + slow breathing scale
            const dist = Math.sqrt(px*px+py*py+pz*pz) || 1;
            const breathCycle = Math.sin(s.time * .4) * .15 * s.amp;
            const targetR = 1 + breathCycle + s.energy * .2 * s.amp;
            // Noise-varied target per vertex for organic shape
            const localTarget = targetR + nn[0](px*2+s.time*.1, pz*2+py) * .2 * s.amp;

            const surfaceForce = (localTarget - dist) * 1.5;
            fx = (px/dist) * surfaceForce;
            fy = (py/dist) * surfaceForce;
            fz = (pz/dist) * surfaceForce;

            // Tangential drift — slow sliding across the surface
            const tangX = nn[1](py*1.5+s.time*.08, pz*1.5) * s.amp * .3;
            const tangZ = nn[2](px*1.5+s.time*.06, py*1.5) * s.amp * .3;
            // Project out radial component to keep it tangential
            const dot = (tangX*px + tangZ*pz) / (dist*dist);
            fx += tangX - dot*px;
            fz += tangZ - dot*pz;

            // Beat: sharp inhale
            fx += (px/dist) * beat * 1.5;
            fy += (py/dist) * beat * 1.5;
            fz += (pz/dist) * beat * 1.5;
          }

          else if (m === "F3") {
            // SWARM — local alignment + separation
            const neighbors = s.mesh.neighbors[vi];
            let avgVx=0, avgVy=0, avgVz=0;
            let sepX=0, sepY=0, sepZ=0;

            for (const ni of neighbors) {
              // Alignment — match neighbor velocity
              avgVx += vel[ni][0];
              avgVy += vel[ni][1];
              avgVz += vel[ni][2];

              // Separation — push away if too close
              const dx = px-pos[ni][0], dy = py-pos[ni][1], dz = pz-pos[ni][2];
              const d = Math.sqrt(dx*dx+dy*dy+dz*dz) || .001;
              if (d < .15) {
                const push = (.15 - d) * 3;
                sepX += (dx/d) * push;
                sepY += (dy/d) * push;
                sepZ += (dz/d) * push;
              }
            }

            const nc = neighbors.length || 1;
            // Alignment force
            const alignStr = s.dance * .15 * s.amp;
            fx += (avgVx/nc - vel[vi][0]) * alignStr;
            fy += (avgVy/nc - vel[vi][1]) * alignStr;
            fz += (avgVz/nc - vel[vi][2]) * alignStr;

            // Separation force
            fx += sepX * .5;
            fy += sepY * .5;
            fz += sepZ * .5;

            // Wander — each vertex has its own noise-driven direction
            const wanderStr = (.2 + s.energy * .6) * s.amp;
            fx += nn[0](vi*.1+s.time*.2, py) * wanderStr;
            fy += nn[1](px, vi*.1+s.time*.15) * wanderStr;
            fz += nn[2](vi*.1+s.time*.18, pz) * wanderStr;

            // Centering — gentle pull to origin
            const dist = Math.sqrt(px*px+py*py+pz*pz) || 1;
            const centerPull = Math.max(0, dist - 1.2) * .3;
            fx -= (px/dist) * centerPull;
            fy -= (py/dist) * centerPull;
            fz -= (pz/dist) * centerPull;

            // Beat: scatter burst
            fx += (px/dist) * beat * 1.8;
            fy += (py/dist) * beat * 1.8;
            fz += (pz/dist) * beat * 1.8;
          }

          else if (m === "F4") {
            // EROSION — gravity + beat lifts + noise currents
            // Gravity (down in world space, but rotated mesh means Y varies)
            fy += .15 * s.amp;

            // Noise currents — horizontal drift like water flow
            const flowStr = s.energy * .5 * s.amp;
            fx += nn[0](py*2+s.time*.1, pz*2) * flowStr;
            fz += nn[1](px*2+s.time*.08, py*2) * flowStr;

            // Beat LIFTS everything upward
            fy -= beat * 3;
            // Stronger lift on lower vertices (sediment stirring)
            if (py > 0) fy -= beat * py * 2;

            // Return force toward unit sphere (prevents collapse)
            const dist = Math.sqrt(px*px+py*py+pz*pz) || 1;
            const restoreStr = Math.max(0, Math.abs(dist - 1) - .3) * .8;
            const dir = dist > 1 ? -1 : 1;
            fx += (px/dist) * restoreStr * dir;
            fy += (py/dist) * restoreStr * dir;
            fz += (pz/dist) * restoreStr * dir;

            // Valence: low = more turbulence
            fx += nn[3](px*4+s.time*.3, pz*4) * sharp * .2 * s.amp;
            fz += nn[4](pz*4+s.time*.25, px*4) * sharp * .2 * s.amp;
          }

          vel[vi][0] += fx * dt;
          vel[vi][1] += fy * dt;
          vel[vi][2] += fz * dt;
        }

        // --- SPRING CONSTRAINTS (keep mesh connected) ---
        const springStiff = m === "F3" ? .8 : m === "F2" ? 1.5 : 1.2;
        for (let ei = 0; ei < s.mesh.edges.length; ei++) {
          const [i, j] = s.mesh.edges[ei];
          const rest = s.restLen[ei];
          const dx = pos[j][0]-pos[i][0];
          const dy = pos[j][1]-pos[i][1];
          const dz = pos[j][2]-pos[i][2];
          const dist = Math.sqrt(dx*dx+dy*dy+dz*dz) || .001;
          const stretch = (dist - rest) / dist;
          const force = stretch * springStiff;

          vel[i][0] += dx * force * dt;
          vel[i][1] += dy * force * dt;
          vel[i][2] += dz * force * dt;
          vel[j][0] -= dx * force * dt;
          vel[j][1] -= dy * force * dt;
          vel[j][2] -= dz * force * dt;
        }

        // --- DAMPING ---
        const damp = m === "F4" ? .94 : m === "F1" ? .96 : .95;
        for (let vi = 0; vi < numV; vi++) {
          vel[vi][0] *= damp;
          vel[vi][1] *= damp;
          vel[vi][2] *= damp;

          pos[vi][0] += vel[vi][0] * dt;
          pos[vi][1] += vel[vi][1] * dt;
          pos[vi][2] += vel[vi][2] * dt;
        }

        // --- SILENT RESET — when music stops, gently return to sphere ---
      } else {
        for (let vi = 0; vi < numV; vi++) {
          const b = s.mesh.baseVerts[vi];
          pos[vi][0] += (b[0] - pos[vi][0]) * .02;
          pos[vi][1] += (b[1] - pos[vi][1]) * .02;
          pos[vi][2] += (b[2] - pos[vi][2]) * .02;
          vel[vi][0] *= .9; vel[vi][1] *= .9; vel[vi][2] *= .9;
        }
      }

      // ===== PROJECT =====
      const cosY=Math.cos(rotY), sinY=Math.sin(rotY);
      const cosX=Math.cos(rotX), sinX=Math.sin(rotX);
      const cx = w/2, cy = h*.47, sc = dim*.35;

      const projected = [];
      for (let vi = 0; vi < numV; vi++) {
        let x3=pos[vi][0], y3=pos[vi][1], z3=pos[vi][2];
        let rx=x3*cosY-z3*sinY, rz=x3*sinY+z3*cosY;
        let ry=y3*cosX-rz*sinX; rz=y3*sinX+rz*cosX;
        const persp=500, d=persp/(persp+rz+150);
        projected.push({x:cx+rx*sc*d, y:cy+ry*sc*d, d, z:rz});
      }

      // ===== RENDER =====
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#EFEDE8";
      ctx.fillRect(0, 0, w, h);

      const col = "42,40,36";
      const alpha0 = s.amp * (.15 + s.energy * .35) * (.5 + loud * .5);

      // Sort edges back to front
      const sortedE = s.mesh.edges.map((e,i)=>i).sort((a,b)=>{
        const ea=s.mesh.edges[a], eb=s.mesh.edges[b];
        return (projected[ea[0]].z+projected[ea[1]].z) - (projected[eb[0]].z+projected[eb[1]].z);
      });

      // Edges
      for (const ei of sortedE) {
        const [i,j] = s.mesh.edges[ei];
        const a=projected[i], b=projected[j];
        const avgD=(a.d+b.d)/2;
        const screenDist = Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);

        // Edge stretch — real 3D distance vs rest length
        const realDist = Math.sqrt(
          (pos[i][0]-pos[j][0])**2+(pos[i][1]-pos[j][1])**2+(pos[i][2]-pos[j][2])**2
        );
        const stretchRatio = realDist / s.restLen[ei];

        let eAlpha = Math.pow(avgD, 1.5) * alpha0;
        // Stretched edges slightly more visible
        eAlpha *= (.6 + Math.min(stretchRatio, 2) * .3);

        if (eAlpha < .004) continue;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${col},${Math.min(.6, eAlpha)})`;
        // Very stretched edges thin out, compressed thicken
        const lw = (.25 + s.acoustic * .6) * avgD * Math.max(.15, 1.5 - stretchRatio * .4);
        ctx.lineWidth = Math.max(.1, lw);
        ctx.stroke();
      }

      // Vertex dots
      for (let vi = 0; vi < numV; vi++) {
        const p = projected[vi];
        const eAlpha = Math.pow(p.d, 2) * alpha0;
        if (eAlpha < .015) continue;

        // Velocity magnitude → visual intensity
        const speed = Math.sqrt(vel[vi][0]**2+vel[vi][1]**2+vel[vi][2]**2);
        const dotSize = (.3 + speed * 2 + s.acoustic * .4) * p.d;

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(.2, dotSize), 0, Math.PI*2);
        ctx.fillStyle = `rgba(${col},${Math.min(.5, eAlpha * (.4 + speed * 2))})`;
        ctx.fill();
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
      <div style={{ position:"absolute", top:24, left:28, display:"flex", alignItems:"center", gap:10, opacity:.5 }}>
        <div style={{ width:30, height:30, borderRadius:"50%", border:"1.5px solid #2A2826", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:"#2A2826" }}>ü</div>
        <span style={{ fontSize:13, fontWeight:600, color:"#2A2826", letterSpacing:.5, opacity:.7 }}>Fülkit</span>
      </div>
      <div style={{ position:"absolute", top:22, right:28, opacity:.35, cursor:"pointer", fontSize:22, color:"#2A2826" }}>✕</div>
      <div style={{ position:"absolute", bottom:32, left:28 }}>
        <div style={{ fontSize:20, fontWeight:600, color:"#2A2826", opacity:.6 }}>{track.name}</div>
        <div style={{ fontSize:13, color:"#2A2826", opacity:.3, marginTop:3 }}>{track.artist}</div>
        <div style={{ fontSize:10, color:"#2A2826", opacity:.2, marginTop:8, fontFamily:"monospace", letterSpacing:1 }}>{track.bpm} BPM</div>
      </div>
      <div style={{ position:"absolute", bottom:28, right:28, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10 }}>
        <div style={{ display:"flex", gap:5 }}>
          {Object.entries(MODES).map(([k,v]) => (
            <div key={k} onClick={() => setMode(k)} style={{
              padding:"5px 12px", borderRadius:14, fontSize:10, fontWeight:700,
              letterSpacing:.6, textTransform:"uppercase",
              background:mode===k?"#2A2826":"transparent",
              color:mode===k?"#EFEDE8":"rgba(42,40,38,.4)",
              border:`1px solid ${mode===k?"#2A2826":"rgba(42,40,38,.15)"}`,
              cursor:"pointer", transition:"all .2s",
            }}>{k}: {v.name}</div>
          ))}
        </div>
        <div style={{ fontSize:10, color:"rgba(42,40,38,.3)", textAlign:"right", maxWidth:280 }}>{MODES[mode].desc}</div>
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
