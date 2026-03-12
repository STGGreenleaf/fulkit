const ORB_POINTS = 200;
const ORB_LAYERS = 48;

function OrbVisualizer({ isPlaying, trackId, trackTitle, trackArtist, progress, duration, features, onClose, toggle, skip, prev }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const phaseRef = useRef(0);
  const noiseRef = useRef(createNoise2D());
  const historyRef = useRef([]);
  const envelopeRef = useRef({ trackId: null, envelope: null });
  const kineticRef = useRef({ amplitude: 0.08, target: 0.08, prevPlaying: false });

  // Generate envelope for this track
  useEffect(() => {
    if (!trackId) return;
    if (envelopeRef.current.trackId === trackId) return;
    const bpm = features?.bpm || 100;
    const energy = features?.energy || 50;
    const dance = features?.danceability || 50;
    const dur = duration > 0 ? duration * 1000 : 210000;
    envelopeRef.current = {
      trackId,
      envelope: generateSongEnvelope(trackId, dur, bpm, energy, dance),
    };
  }, [trackId, features, duration]);

  // New noise on track change
  useEffect(() => {
    noiseRef.current = createNoise2D();
    historyRef.current = [];
  }, [trackId]);

  // Keyboard: ESC to close, Space play/pause, arrows skip
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === " ") { e.preventDefault(); toggle(); }
      else if (e.key === "ArrowRight") skip();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, toggle, skip, prev]);

  // Render loop
  useEffect(() => {
    let running = true;
    const render = (timestamp) => {
      if (!running) return;
      animRef.current = requestAnimationFrame(render);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = Math.min(w, h) * 0.24;
      const noise2D = noiseRef.current;
      const k = kineticRef.current;

      // Kinetic smoothing
      k.target = isPlaying ? 0.55 : 0.08;
      k.amplitude += (k.target - k.amplitude) * 0.06;
      k.prevPlaying = isPlaying;

      // Audio features
      const bpm = features?.bpm || 100;
      const energy = (features?.energy || 50) / 100;
      const valence = (features?.valence || 50) / 100;
      const danceability = (features?.danceability || 50) / 100;
      const acousticness = (features?.acousticness || 30) / 100;
      const keyOffset = (features?.key?.charCodeAt(0) || 0) * 0.1;

      // Envelope
      const env = envelopeRef.current.envelope;
      let envelopeValue = 1;
      if (env && env.length > 0 && isPlaying && progress > 0) {
        const barIndex = Math.min(env.length - 1, Math.floor(progress * env.length));
        envelopeValue = env[barIndex];
      }
      const hasEnvelope = env && env.length > 0 && isPlaying && progress > 0;
      const amplitudeCeiling = hasEnvelope ? 0.2 + envelopeValue * 0.6 : 0.2 + energy * 0.6;

      // Beat pulse
      const progressMs = progress * duration * 1000;
      const msPerBeat = 60000 / bpm;
      const beatPhase = (progressMs % msPerBeat) / msPerBeat;
      const beatPulse = isPlaying ? Math.pow(1 - beatPhase, 3) : 0;

      // Phase advance
      const beatsPerSec = bpm / 60;
      const phaseStep = isPlaying ? (beatsPerSec / 60) * 0.15 : 0.002;
      phaseRef.current += phaseStep;
      const phase = phaseRef.current;

      // Exhale
      let exhaleMultiplier = 1;
      if (isPlaying && duration > 0 && progress > 0) {
        const remaining = duration * (1 - progress);
        if (remaining < 6 && remaining > 0) {
          exhaleMultiplier = 1 - ((1 - remaining / 6) * 0.7);
        }
      }

      // Sharpness
      const sharpness = 1 - valence;

      ctx.clearRect(0, 0, w, h);

      // Get text color from CSS
      const style = getComputedStyle(canvas);
      const textColor = style.getPropertyValue("--color-text-muted").trim() || "#8A8784";
      const tc = textColor.startsWith("#")
        ? [parseInt(textColor.slice(1, 3), 16), parseInt(textColor.slice(3, 5), 16), parseInt(textColor.slice(5, 7), 16)]
        : [138, 135, 132];

      // ── Compute current frame displacements ──
      const noiseScale = 4;
      const displacements = [];
      for (let i = 0; i <= ORB_POINTS; i++) {
        const t = i / ORB_POINTS;
        const angle = t * Math.PI * 2;

        const n1 = noise2D(Math.cos(angle) * noiseScale + keyOffset, Math.sin(angle) * noiseScale + phase * 0.7) * 0.5;
        const n2 = noise2D(Math.cos(angle) * noiseScale * 2 + 100, Math.sin(angle) * noiseScale * 2 + phase) * 0.2;
        const n3 = noise2D(Math.cos(angle) * noiseScale * 4 + 200, Math.sin(angle) * noiseScale * 4 + phase * 1.3) * 0.08;
        let raw = n1 + n2 + n3;

        raw = Math.sign(raw) * Math.pow(Math.abs(raw), 1 + sharpness * 0.5);

        const beatBoost = 1 + beatPulse * danceability * 0.3;
        let amp = Math.abs(raw) * k.amplitude * exhaleMultiplier * beatBoost;
        amp = Math.min(amp, amplitudeCeiling);
        amp *= 1 + (Math.random() - 0.5) * 0.03;

        displacements.push(amp * baseRadius * 1.5);
      }

      historyRef.current.push(displacements);
      if (historyRef.current.length > ORB_LAYERS) historyRef.current.shift();

      // ── Render tracer layers (oldest → newest) ──
      const layers = historyRef.current;
      for (let l = 0; l < layers.length; l++) {
        const age = l / Math.max(1, layers.length - 1);
        const data = layers[l];

        const alpha = 0.015 + age * age * 0.14;
        const baseLw = 0.3 + age * 0.8;
        const lw = baseLw * (0.7 + acousticness * 0.6);
        const radiusShift = (layers.length - 1 - l) * 0.6;

        // Mountains (outward, smooth curves)
        ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha})`;
        ctx.lineWidth = lw;
        ctx.beginPath();

        for (let i = 0; i <= ORB_POINTS; i++) {
          const angle = (i / ORB_POINTS) * Math.PI * 2;
          const r = baseRadius + data[i] - radiusShift;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevAngle = ((i - 1) / ORB_POINTS) * Math.PI * 2;
            const prevR = baseRadius + data[i - 1] - radiusShift;
            const prevX = cx + Math.cos(prevAngle) * prevR;
            const prevY = cy + Math.sin(prevAngle) * prevR;
            ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
          }
        }
        ctx.closePath();
        ctx.stroke();

        // Reflection (inward, smooth curves)
        ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha * 0.55})`;
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        for (let i = 0; i <= ORB_POINTS; i++) {
          const angle = (i / ORB_POINTS) * Math.PI * 2;
          const r = baseRadius - data[i] * 0.5 + (layers.length - 1 - l) * 0.3;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevAngle = ((i - 1) / ORB_POINTS) * Math.PI * 2;
            const prevR = baseRadius - data[i - 1] * 0.5 + (layers.length - 1 - l) * 0.3;
            const prevX = cx + Math.cos(prevAngle) * prevR;
            const prevY = cy + Math.sin(prevAngle) * prevR;
            ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, progress, duration, features]);

  // Resize canvas to viewport
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "var(--color-bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Brand — top left */}
      <div style={{
        position: "absolute", top: 20, left: 28, zIndex: 1,
        display: "flex", alignItems: "center", gap: "var(--space-2)",
      }}>
        <LogoMark size={22} />
        <span style={{
          fontSize: "var(--font-size-base)",
          fontWeight: "var(--font-weight-black)",
          letterSpacing: "var(--letter-spacing-tight)",
          color: "var(--color-text-muted)",
        }}>
          Fülkit
        </span>
      </div>

      {/* Close button — top right */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 20, right: 20,
          background: "transparent", border: "none",
          cursor: "pointer", padding: 8, zIndex: 1,
          color: "var(--color-text-dim)",
          transition: "color 200ms",
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}
        onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-dim)"}
      >
        <X size={20} strokeWidth={1.8} />
      </button>

      {/* Track info — bottom left */}
      <div style={{
        position: "absolute", bottom: 28, left: 28, zIndex: 1,
      }}>
        <div style={{
          fontSize: "var(--font-size-xl)", color: "var(--color-text-muted)",
          fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-bold)",
          letterSpacing: "var(--letter-spacing-tight)",
        }}>
          {trackTitle || ""}
        </div>
        <div style={{
          fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)",
          fontFamily: "var(--font-primary)", opacity: 0.7,
        }}>
          {trackArtist || ""}
        </div>
      </div>
    </div>
  );
}

