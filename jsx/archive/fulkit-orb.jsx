import { useState, useRef, useEffect, useCallback } from "react";

export default function VoiceOrb() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [mode, setMode] = useState("idle"); // idle, listening, thinking, speaking
  const [showHint, setShowHint] = useState(true);
  const noiseOffsetRef = useRef(0);
  const transitionRef = useRef({ intensity: 0, target: 0 });
  const hueRef = useRef(0);

  const getConfig = useCallback(() => {
    switch (mode) {
      case "listening":
        return { intensity: 0.7, speed: 0.02, baseRadius: 0.28, color: [240, 240, 235], pulseSpeed: 0.03, noiseScale: 3.5 };
      case "thinking":
        return { intensity: 0.4, speed: 0.008, baseRadius: 0.25, color: [200, 200, 195], pulseSpeed: 0.015, noiseScale: 2.0 };
      case "speaking":
        return { intensity: 0.55, speed: 0.015, baseRadius: 0.27, color: [250, 250, 245], pulseSpeed: 0.025, noiseScale: 3.0 };
      default:
        return { intensity: 0.15, speed: 0.005, baseRadius: 0.22, color: [180, 180, 175], pulseSpeed: 0.008, noiseScale: 1.2 };
    }
  }, [mode]);

  // Simple noise function
  const noise = useCallback((x, y, z) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }, []);

  const smoothNoise = useCallback((x, y, z) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const sz = fz * fz * (3 - 2 * fz);

    const n000 = noise(ix, iy, iz);
    const n100 = noise(ix + 1, iy, iz);
    const n010 = noise(ix, iy + 1, iz);
    const n110 = noise(ix + 1, iy + 1, iz);
    const n001 = noise(ix, iy, iz + 1);
    const n101 = noise(ix + 1, iy, iz + 1);
    const n011 = noise(ix, iy + 1, iz + 1);
    const n111 = noise(ix + 1, iy + 1, iz + 1);

    const nx00 = n000 + sx * (n100 - n000);
    const nx10 = n010 + sx * (n110 - n010);
    const nx01 = n001 + sx * (n101 - n001);
    const nx11 = n011 + sx * (n111 - n011);
    const nxy0 = nx00 + sy * (nx10 - nx00);
    const nxy1 = nx01 + sy * (nx11 - nx01);
    return nxy0 + sz * (nxy1 - nxy0);
  }, [noise]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const size = 500;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;

    const draw = () => {
      const config = getConfig();
      const t = transitionRef.current;
      t.target = config.intensity;
      t.intensity += (t.target - t.intensity) * 0.03;

      noiseOffsetRef.current += config.speed;
      hueRef.current += 0.1;
      const time = noiseOffsetRef.current;
      const intensity = t.intensity;

      ctx.clearRect(0, 0, size, size);

      // Ambient glow
      const glowSize = size * (config.baseRadius + 0.15 + intensity * 0.1);
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
      const alpha = 0.03 + intensity * 0.04;
      glowGrad.addColorStop(0, `rgba(${config.color[0]}, ${config.color[1]}, ${config.color[2]}, ${alpha})`);
      glowGrad.addColorStop(0.5, `rgba(${config.color[0]}, ${config.color[1]}, ${config.color[2]}, ${alpha * 0.3})`);
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Outer particles / dust
      const particleCount = 40 + Math.floor(intensity * 60);
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + time * 0.3;
        const dist = size * (config.baseRadius + 0.05 + 
          smoothNoise(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, time * 0.5) * 0.08 * intensity +
          Math.sin(time * 2 + i * 0.7) * 0.02 * intensity);
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        const pSize = 1 + intensity * 1.5 + Math.sin(time * 3 + i) * 0.5;
        const pAlpha = 0.1 + intensity * 0.2 + Math.sin(time * 2 + i * 0.5) * 0.05;

        ctx.fillStyle = `rgba(${config.color[0]}, ${config.color[1]}, ${config.color[2]}, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Main orb layers (back to front)
      const layers = 3;
      for (let l = layers - 1; l >= 0; l--) {
        const layerOffset = l * 0.02;
        const layerAlpha = l === 0 ? 0.9 : (l === 1 ? 0.3 : 0.15);
        const points = 180;
        const baseR = size * (config.baseRadius - layerOffset);

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const nx = Math.cos(angle) * config.noiseScale;
          const ny = Math.sin(angle) * config.noiseScale;

          const n1 = smoothNoise(nx, ny, time + l * 10) * intensity;
          const n2 = smoothNoise(nx * 2.5, ny * 2.5, time * 1.5 + l * 5) * intensity * 0.3;
          const pulse = Math.sin(time * config.pulseSpeed * 60 + angle * 2) * 0.015 * intensity;

          const r = baseR + (n1 + n2 + pulse) * size * 0.12;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        if (l === 0) {
          // Core orb - gradient fill
          const orbGrad = ctx.createRadialGradient(
            cx - baseR * 0.2, cy - baseR * 0.2, 0,
            cx, cy, baseR * 1.3
          );
          const c = config.color;
          orbGrad.addColorStop(0, `rgba(${Math.min(c[0] + 30, 255)}, ${Math.min(c[1] + 30, 255)}, ${Math.min(c[2] + 25, 255)}, ${layerAlpha})`);
          orbGrad.addColorStop(0.5, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${layerAlpha * 0.8})`);
          orbGrad.addColorStop(1, `rgba(${c[0] - 40}, ${c[1] - 40}, ${c[2] - 45}, ${layerAlpha * 0.6})`);
          ctx.fillStyle = orbGrad;
          ctx.fill();
        } else {
          // Outer layers - stroke only
          ctx.strokeStyle = `rgba(${config.color[0]}, ${config.color[1]}, ${config.color[2]}, ${layerAlpha * (0.3 + intensity * 0.4)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Inner highlight
      const hlSize = size * config.baseRadius * 0.4;
      const hlGrad = ctx.createRadialGradient(
        cx - hlSize * 0.3, cy - hlSize * 0.4, 0,
        cx, cy, hlSize
      );
      hlGrad.addColorStop(0, `rgba(255, 255, 250, ${0.08 + intensity * 0.06})`);
      hlGrad.addColorStop(1, "rgba(255, 255, 250, 0)");
      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.arc(cx - hlSize * 0.15, cy - hlSize * 0.2, hlSize, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [getConfig, smoothNoise]);

  const cycleMode = () => {
    setShowHint(false);
    if (mode === "idle") setMode("listening");
    else if (mode === "listening") setMode("thinking");
    else if (mode === "thinking") setMode("speaking");
    else setMode("idle");
  };

  const modeLabels = {
    idle: "Tap to talk",
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
  };

  return (
    <div style={{
      width: "100%", height: "100vh",
      background: "#F0EEEB",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      overflow: "hidden",
      position: "relative",
      userSelect: "none",
    }}>
      <style>{`
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInSlow { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>

      {/* Fulkit branding - minimal top corner */}
      <div style={{
        position: "absolute", top: 24, left: 28,
        display: "flex", alignItems: "center", gap: 8,
        animation: "fadeInSlow 1s 0.5s both",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: "#2A2A28",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#F0EEEB", fontSize: 10, fontWeight: 800,
        }}>F</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#2A2A28", letterSpacing: -0.3 }}>Fülkit</span>
      </div>

      {/* Mode switcher - dev tools */}
      <div style={{
        position: "absolute", top: 24, right: 28,
        display: "flex", gap: 4,
        animation: "fadeInSlow 1s 0.5s both",
      }}>
        {["idle", "listening", "thinking", "speaking"].map(m => (
          <div key={m} onClick={() => { setMode(m); setShowHint(false); }} style={{
            padding: "5px 10px", borderRadius: 6, cursor: "pointer",
            background: mode === m ? "#2A2A28" : "transparent",
            color: mode === m ? "#F0EEEB" : "#8A8884",
            fontSize: 11, fontWeight: 600,
            border: `1px solid ${mode === m ? "#2A2A28" : "#D4D2CE"}`,
            transition: "all 0.2s",
          }}>{m}</div>
        ))}
      </div>

      {/* The Orb */}
      <div
        onClick={cycleMode}
        style={{
          cursor: "pointer",
          position: "relative",
          animation: "fadeIn 1.2s ease both",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: 500, height: 500,
            filter: "contrast(1.05)",
          }}
        />
      </div>

      {/* Status text */}
      <div style={{
        marginTop: -40,
        textAlign: "center",
        animation: "fadeIn 0.8s 0.3s both",
      }}>
        <div style={{
          fontSize: 15,
          fontWeight: 500,
          color: "#5A5854",
          letterSpacing: 0.5,
          transition: "all 0.3s",
        }}>
          {modeLabels[mode]}
        </div>

        {showHint && (
          <div style={{
            marginTop: 12,
            fontSize: 12,
            color: "#A3A19C",
            animation: "pulse 3s infinite",
          }}>
            tap the orb
          </div>
        )}

        {mode === "listening" && (
          <div style={{
            marginTop: 16, display: "flex", gap: 4, justifyContent: "center",
            animation: "fadeIn 0.4s ease both",
          }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                width: 3, height: 12 + Math.random() * 16,
                borderRadius: 2,
                background: "#5A5854",
                opacity: 0.4,
                animation: `pulse ${0.6 + i * 0.15}s ${i * 0.1}s infinite`,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div style={{
        position: "absolute", bottom: 48,
        display: "flex", gap: 16, alignItems: "center",
        animation: "fadeIn 0.6s 0.8s both",
      }}>
        <div
          onClick={() => setMode("idle")}
          style={{
            width: 52, height: 52, borderRadius: "50%",
            background: mode === "idle" ? "#D4D2CE" : "#2A2A28",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.3s",
            border: `1.5px solid ${mode === "idle" ? "#B0AEA9" : "#3A3A38"}`,
          }}
          title="End session"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke={mode === "idle" ? "#8A8884" : "#F0EEEB"} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <div
          onClick={cycleMode}
          style={{
            width: 68, height: 68, borderRadius: "50%",
            background: mode === "listening" ? "#C44" : mode === "idle" ? "#2A2A28" : "#3A3A38",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.3s",
            border: "2px solid rgba(255,255,255,0.1)",
            boxShadow: mode === "listening" ? "0 0 20px rgba(204,68,68,0.3)" : "none",
          }}
          title={mode === "idle" ? "Start talking" : mode === "listening" ? "Stop" : "Tap"}
        >
          {mode === "idle" ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="#F0EEEB"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="#F0EEEB" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 19v4M8 23h8" stroke="#F0EEEB" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : mode === "listening" ? (
            <div style={{
              width: 20, height: 20, borderRadius: 3,
              background: "#F0EEEB",
            }} />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="#F0EEEB"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="#F0EEEB" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 19v4M8 23h8" stroke="#F0EEEB" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </div>

        <div
          onClick={() => {
            if (mode === "speaking") setMode("listening");
            else if (mode === "thinking") setMode("listening");
            else if (mode === "listening") setMode("idle");
          }}
          style={{
            width: 52, height: 52, borderRadius: "50%",
            background: mode === "idle" ? "#D4D2CE" : "#2A2A28",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.3s",
            border: `1.5px solid ${mode === "idle" ? "#B0AEA9" : "#3A3A38"}`,
            opacity: mode === "idle" ? 0.4 : 1,
          }}
          title="Go back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke={mode === "idle" ? "#8A8884" : "#F0EEEB"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Bottom tagline */}
      <div style={{
        position: "absolute", bottom: 32,
        textAlign: "center",
        animation: "fadeInSlow 1s 1s both",
      }}>
        <div style={{
          fontSize: 12, color: "#B0AEA9", fontWeight: 500,
          letterSpacing: 0.3,
        }}>
          your bestie is listening — no transcript, just vibes
        </div>
      </div>
    </div>
  );
}
