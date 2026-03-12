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
  const neighbors=raw.map(()=>[]);
  for(const[i,j]of edges){neighbors[i].push(j);neighbors[j].push(i);}
  return{baseVerts:raw.map(v=>[...v]),edges,neighbors};
}

export default function SwarmTracer() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
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
      pos: mesh.baseVerts.map(v=>[v[0],v[1],v[2]]),
      vel: Array.from({length:numV},()=>[0,0,0]),
      restLen: mesh.edges.map(([i,j])=>{
        const a=mesh.baseVerts[i],b=mesh.baseVerts[j];
        return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);
      }),
      // TRACER HISTORY — snapshots of vertex positions over time
      tracers: [], // each: { positions: [[x,y,z]...], opacity, age }
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
      progress:0, mesh, tracers:[],
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

    const MAX_TRACERS = 18;
    const CAPTURE_INTERVAL = 4; // every 4th frame

    function draw() {
      if (!running) return;
      const s = stateRef.current;
      const nn = s.n;
      const w = window.innerWidth, h = window.innerHeight;
      const dim = Math.min(w, h);

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

      // ===== SWARM PHYSICS =====
      if (s.amp > .01) {
        const dt = .016;

        for (let vi = 0; vi < numV; vi++) {
          const px=pos[vi][0], py=pos[vi][1], pz=pos[vi][2];
          let fx=0, fy=0, fz=0;

          // Flocking: alignment + separation
          const neighbors = s.mesh.neighbors[vi];
          let avgVx=0,avgVy=0,avgVz=0, sepX=0,sepY=0,sepZ=0;

          for (const ni of neighbors) {
            avgVx+=vel[ni][0]; avgVy+=vel[ni][1]; avgVz+=vel[ni][2];
            const dx=px-pos[ni][0], dy=py-pos[ni][1], dz=pz-pos[ni][2];
            const d=Math.sqrt(dx*dx+dy*dy+dz*dz)||.001;
            if(d<.15){const push=(.15-d)*3;sepX+=(dx/d)*push;sepY+=(dy/d)*push;sepZ+=(dz/d)*push;}
          }

          const nc=neighbors.length||1;
          const alignStr = s.dance * .15 * s.amp;
          fx += (avgVx/nc-vel[vi][0])*alignStr;
          fy += (avgVy/nc-vel[vi][1])*alignStr;
          fz += (avgVz/nc-vel[vi][2])*alignStr;
          fx += sepX*.5; fy += sepY*.5; fz += sepZ*.5;

          // Wander — each vertex drifts on its own noise path
          const wanderStr = (.2 + s.energy * .8) * s.amp;
          fx += nn[0](vi*.1+s.time*.2, py) * wanderStr;
          fy += nn[1](px, vi*.1+s.time*.15) * wanderStr;
          fz += nn[2](vi*.1+s.time*.18, pz) * wanderStr;

          // Centering
          const dist = Math.sqrt(px*px+py*py+pz*pz)||1;
          const centerPull = Math.max(0, dist-1.3) * .4;
          fx -= (px/dist)*centerPull;
          fy -= (py/dist)*centerPull;
          fz -= (pz/dist)*centerPull;

          // Beat: scatter burst
          fx += (px/dist)*beat*2;
          fy += (py/dist)*beat*2;
          fz += (pz/dist)*beat*2;

          // Valence: low = turbulent micro-forces
          fx += nn[3](px*5+s.time*.4, pz*5) * sharp * .15 * s.amp;
          fy += nn[4](py*5+s.time*.3, px*5) * sharp * .1 * s.amp;
          fz += nn[5](pz*5+s.time*.35, py*5) * sharp * .15 * s.amp;

          vel[vi][0]+=fx*dt; vel[vi][1]+=fy*dt; vel[vi][2]+=fz*dt;
        }

        // Spring constraints
        for (let ei=0; ei<s.mesh.edges.length; ei++) {
          const[i,j]=s.mesh.edges[ei];
          const rest=s.restLen[ei];
          const dx=pos[j][0]-pos[i][0], dy=pos[j][1]-pos[i][1], dz=pos[j][2]-pos[i][2];
          const dist=Math.sqrt(dx*dx+dy*dy+dz*dz)||.001;
          const force=(dist-rest)/dist*.8;
          vel[i][0]+=dx*force*.016; vel[i][1]+=dy*force*.016; vel[i][2]+=dz*force*.016;
          vel[j][0]-=dx*force*.016; vel[j][1]-=dy*force*.016; vel[j][2]-=dz*force*.016;
        }

        // Damping
        for(let vi=0;vi<numV;vi++){
          vel[vi][0]*=.95; vel[vi][1]*=.95; vel[vi][2]*=.95;
          pos[vi][0]+=vel[vi][0]*.016;
          pos[vi][1]+=vel[vi][1]*.016;
          pos[vi][2]+=vel[vi][2]*.016;
        }
      } else {
        // Silent: return to sphere
        for(let vi=0;vi<numV;vi++){
          const b=s.mesh.baseVerts[vi];
          pos[vi][0]+=(b[0]-pos[vi][0])*.02;
          pos[vi][1]+=(b[1]-pos[vi][1])*.02;
          pos[vi][2]+=(b[2]-pos[vi][2])*.02;
          vel[vi][0]*=.9;vel[vi][1]*=.9;vel[vi][2]*=.9;
        }
      }

      // ===== CAPTURE TRACER SNAPSHOT =====
      s.frame++;
      if (s.frame % CAPTURE_INTERVAL === 0 && s.amp > .02) {
        const snapshot = pos.map(v=>[v[0],v[1],v[2]]);
        const isHit = beat > .6;
        s.tracers.push({
          positions: snapshot,
          opacity: isHit ? .7 : .4,
          age: 0,
          isHit,
          fadeRate: isHit ? .992 : .985,
        });
        if (s.tracers.length > MAX_TRACERS) s.tracers.shift();
      }

      // Age tracers
      for (const tr of s.tracers) {
        tr.age++;
        tr.opacity *= tr.fadeRate;
      }
      s.tracers = s.tracers.filter(tr => tr.opacity > .01);

      // ===== PROJECT FUNCTION =====
      const cosY=Math.cos(rotY), sinY=Math.sin(rotY);
      const cosX=Math.cos(rotX), sinX=Math.sin(rotX);
      const cx=w/2, cy=h*.47, sc=dim*.35;

      function proj(x3,y3,z3) {
        let rx=x3*cosY-z3*sinY, rz=x3*sinY+z3*cosY;
        let ry=y3*cosX-rz*sinX; rz=y3*sinX+rz*cosX;
        const persp=500, d=persp/(persp+rz+150);
        return{x:cx+rx*sc*d, y:cy+ry*sc*d, d, z:rz};
      }

      // ===== RENDER =====
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#EFEDE8";
      ctx.fillRect(0, 0, w, h);

      const col = "38,36,32";
      const baseAlpha = (.2 + s.energy * .5) * (.5 + loud * .5);

      // --- Render tracer layers (oldest first = back) ---
      for (let ti = 0; ti < s.tracers.length; ti++) {
        const tr = s.tracers[ti];
        const trAlpha = tr.opacity * s.amp * baseAlpha;
        if (trAlpha < .005) continue;

        // Project this snapshot's vertices
        const trProj = tr.positions.map(v => proj(v[0],v[1],v[2]));

        // Draw edges for this tracer layer
        for (const [i,j] of s.mesh.edges) {
          const a=trProj[i], b=trProj[j];
          const avgD=(a.d+b.d)/2;
          const eAlpha = Math.pow(avgD,1.3) * trAlpha * (tr.isHit ? .6 : .35);
          if (eAlpha < .003) continue;

          ctx.beginPath();
          ctx.moveTo(a.x,a.y);
          ctx.lineTo(b.x,b.y);
          ctx.strokeStyle = `rgba(${col},${Math.min(.4,eAlpha)})`;
          ctx.lineWidth = (.2 + s.acoustic*.4) * avgD * (tr.isHit ? 1.2 : .8);
          ctx.stroke();
        }
      }

      // --- Render current mesh (on top, darkest) ---
      const curProj = pos.map(v => proj(v[0],v[1],v[2]));

      // Sort edges back to front
      const sortedE = s.mesh.edges.map((_,i)=>i).sort((a,b)=>{
        const ea=s.mesh.edges[a],eb=s.mesh.edges[b];
        return(curProj[ea[0]].z+curProj[ea[1]].z)-(curProj[eb[0]].z+curProj[eb[1]].z);
      });

      for (const ei of sortedE) {
        const[i,j]=s.mesh.edges[ei];
        const a=curProj[i], b=curProj[j];
        const avgD=(a.d+b.d)/2;

        // Real stretch for visual feedback
        const realDist=Math.sqrt((pos[i][0]-pos[j][0])**2+(pos[i][1]-pos[j][1])**2+(pos[i][2]-pos[j][2])**2);
        const stretch=realDist/s.restLen[ei];

        let eAlpha = Math.pow(avgD,1.3) * s.amp * baseAlpha * (.5 + stretch*.3);
        if(eAlpha<.004) continue;

        ctx.beginPath();
        ctx.moveTo(a.x,a.y);
        ctx.lineTo(b.x,b.y);
        ctx.strokeStyle = `rgba(${col},${Math.min(.75,eAlpha)})`;
        ctx.lineWidth = Math.max(.15, (.3+s.acoustic*.8) * avgD * Math.max(.2, 1.4-stretch*.3));
        ctx.stroke();
      }

      // Vertex dots on current mesh
      for(let vi=0;vi<numV;vi++){
        const p=curProj[vi];
        const speed=Math.sqrt(vel[vi][0]**2+vel[vi][1]**2+vel[vi][2]**2);
        const vAlpha = Math.pow(p.d,1.8) * s.amp * baseAlpha * (.3+speed*3);
        if(vAlpha<.01) continue;

        const dotSz = (.3 + speed*2.5 + s.acoustic*.5) * p.d;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(.2, dotSz), 0, Math.PI*2);
        ctx.fillStyle = `rgba(${col},${Math.min(.6,vAlpha)})`;
        ctx.fill();
      }

      // Beat flash — brief bright dots on fast-moving vertices
      if (beat > .5 && s.playing) {
        for(let vi=0;vi<numV;vi+=2){
          const speed=Math.sqrt(vel[vi][0]**2+vel[vi][1]**2+vel[vi][2]**2);
          if(speed<.3) continue;
          const p=curProj[vi];
          const fAlpha = beat*p.d*s.amp*.35;
          ctx.beginPath();
          ctx.arc(p.x,p.y,(1.5+beat*4+speed*3)*p.d,0,Math.PI*2);
          ctx.fillStyle = `rgba(${col},${Math.min(.25,fAlpha)})`;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return()=>{running=false;cancelAnimationFrame(animRef.current);window.removeEventListener("resize",resize);};
  }, []);

  useEffect(()=>{stateRef.current.playing=isPlaying;},[isPlaying]);
  const track=tracks[trackIdx];

  return(
    <div style={{width:"100vw",height:"100vh",position:"relative",background:"#EFEDE8",overflow:"hidden",fontFamily:"'D-DIN','DIN Alternate',system-ui,sans-serif",userSelect:"none"}}>
      <canvas ref={canvasRef} style={{position:"absolute",inset:0}}/>
      <div style={{position:"absolute",top:24,left:28,display:"flex",alignItems:"center",gap:10,opacity:.5}}>
        <div style={{width:30,height:30,borderRadius:"50%",border:"1.5px solid #2A2826",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#2A2826"}}>ü</div>
        <span style={{fontSize:13,fontWeight:600,color:"#2A2826",letterSpacing:.5,opacity:.7}}>Fülkit</span>
      </div>
      <div style={{position:"absolute",top:22,right:28,opacity:.35,cursor:"pointer",fontSize:22,color:"#2A2826"}}>✕</div>
      <div style={{position:"absolute",bottom:32,left:28}}>
        <div style={{fontSize:20,fontWeight:600,color:"#2A2826",opacity:.6}}>{track.name}</div>
        <div style={{fontSize:13,color:"#2A2826",opacity:.3,marginTop:3}}>{track.artist}</div>
        <div style={{fontSize:10,color:"#2A2826",opacity:.2,marginTop:8,fontFamily:"monospace",letterSpacing:1}}>{track.bpm} BPM</div>
      </div>
      <div style={{position:"absolute",bottom:28,right:28,display:"flex",alignItems:"center",gap:8}}>
        {tracks.map((t,i)=>(
          <div key={i} onClick={()=>switchTrack(i)} style={{
            padding:"5px 12px",borderRadius:12,fontSize:10,fontWeight:600,
            background:i===trackIdx?"#2A2826":"transparent",
            color:i===trackIdx?"#EFEDE8":"rgba(42,40,38,.35)",
            border:`1px solid ${i===trackIdx?"#2A2826":"rgba(42,40,38,.15)"}`,
            cursor:"pointer",
          }}>{t.name.split(" ")[0]}</div>
        ))}
        <div onClick={()=>setIsPlaying(!isPlaying)} style={{
          width:46,height:46,borderRadius:"50%",
          background:isPlaying?"#2A2826":"transparent",
          border:`2px solid ${isPlaying?"#2A2826":"rgba(42,40,38,.25)"}`,
          display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
        }}>
          {isPlaying?(
            <svg width="16" height="16" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" fill="#EFEDE8"/><rect x="14" y="4" width="4" height="16" rx="1" fill="#EFEDE8"/></svg>
          ):(
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z" fill="#2A2826"/></svg>
          )}
        </div>
      </div>
    </div>
  );
}
