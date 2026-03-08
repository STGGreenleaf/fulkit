"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Perceptual volume curve — low volumes get more slider real estate
const CURVE = 1.8;
function positionToVolume(pos) {
  return Math.round(Math.pow(Math.max(0, Math.min(1, pos)), CURVE) * 100);
}
function volumeToPosition(vol) {
  return Math.pow(Math.max(0, Math.min(100, vol)) / 100, 1 / CURVE);
}

// Dead zone — minimum pointer movement before slider responds (px)
const DEAD_ZONE = 3;

export default function VolumeSlider({ value, onChange, vertical = false, style }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const startPointer = useRef({ x: 0, y: 0 });
  const pastDeadZone = useRef(false);
  const [displayPos, setDisplayPos] = useState(() => volumeToPosition(value));

  // Sync display from prop when not dragging
  useEffect(() => {
    if (!dragging.current) {
      setDisplayPos(volumeToPosition(value));
    }
  }, [value]);

  const posFromEvent = useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    if (vertical) {
      // Bottom = 0, top = 1
      return 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    }
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, [vertical]);

  const handleDown = useCallback((e) => {
    if (e.button !== 0) return; // left click only
    e.preventDefault();
    dragging.current = true;
    pastDeadZone.current = false;
    startPointer.current = { x: e.clientX, y: e.clientY };
    trackRef.current.setPointerCapture(e.pointerId);
  }, []);

  const handleMove = useCallback((e) => {
    if (!dragging.current) return;

    // Check dead zone
    if (!pastDeadZone.current) {
      const dx = e.clientX - startPointer.current.x;
      const dy = e.clientY - startPointer.current.y;
      if (Math.sqrt(dx * dx + dy * dy) < DEAD_ZONE) return;
      pastDeadZone.current = true;
    }

    const pos = posFromEvent(e);
    setDisplayPos(pos);
    onChange(positionToVolume(pos));
  }, [posFromEvent, onChange]);

  const handleUp = useCallback((e) => {
    if (!dragging.current) return;
    dragging.current = false;

    if (pastDeadZone.current) {
      const pos = posFromEvent(e);
      setDisplayPos(pos);
      onChange(positionToVolume(pos));
    }

    try { trackRef.current.releasePointerCapture(e.pointerId); } catch {}
  }, [posFromEvent, onChange]);

  // Thumb position as percentage
  const pct = `${displayPos * 100}%`;

  if (vertical) {
    // Vertical: 14px wide hit area, 3px visible track centered inside, thumb overhangs
    return (
      <div
        ref={trackRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        style={{
          position: "relative",
          width: 14,
          height: "100%",
          flexShrink: 0,
          cursor: "pointer",
          touchAction: "none",
          userSelect: "none",
          ...style,
        }}
      >
        {/* Thin visible track — 3px, centered */}
        <div style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 3,
          height: "100%",
          background: "var(--color-border)",
          transform: "translateX(-50%)",
        }} />
        {/* Thumb — overhangs the thin track */}
        <div style={{
          position: "absolute",
          left: "50%",
          bottom: pct,
          width: 12,
          height: 2,
          background: "var(--color-text)",
          transform: "translate(-50%, 50%)",
          transition: "bottom 100ms cubic-bezier(0.22, 1, 0.36, 1)",
          pointerEvents: "none",
        }} />
      </div>
    );
  }

  // Horizontal: full-width 3px track, thumb overhangs vertically
  return (
    <div
      ref={trackRef}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      style={{
        position: "relative",
        width: "100%",
        height: 3,
        display: "block",
        background: "var(--color-border)",
        cursor: "pointer",
        touchAction: "none",
        userSelect: "none",
        ...style,
      }}
    >
      <div style={{
        position: "absolute",
        top: "50%",
        left: pct,
        width: 2,
        height: 12,
        background: "var(--color-text)",
        transform: "translate(-50%, -50%)",
        transition: "left 100ms cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: "none",
      }} />
    </div>
  );
}
