"use client";

import { useState, useEffect, useCallback } from "react";

export default function DevInspector() {
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);
  const [info, setInfo] = useState(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  // Sync with dev mode localStorage flag
  useEffect(() => {
    setEnabled(localStorage.getItem("fulkit-dev-mode") === "true");
    const onStorage = (e) => {
      if (e.key === "fulkit-dev-mode") setEnabled(e.newValue === "true");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const getSelector = useCallback((el) => {
    if (el.id) return `#${el.id}`;
    const parts = [];
    while (el && el !== document.body) {
      let seg = el.tagName.toLowerCase();
      if (el.className && typeof el.className === "string") {
        const cls = el.className.trim().split(/\s+/).slice(0, 2).join(".");
        if (cls) seg += `.${cls}`;
      }
      parts.unshift(seg);
      el = el.parentElement;
    }
    return parts.join(" > ");
  }, []);

  const getStyles = useCallback((el) => {
    const cs = getComputedStyle(el);
    return {
      font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily.split(",")[0]}`,
      color: cs.color,
      bg: cs.backgroundColor,
      padding: cs.padding,
      margin: cs.margin,
      size: `${Math.round(el.offsetWidth)}x${Math.round(el.offsetHeight)}`,
    };
  }, []);

  useEffect(() => {
    if (!enabled || !active) return;

    let hovered = null;
    let outline = "";

    const onMove = (e) => {
      if (e.target.closest("[data-dev-inspector]")) return;
      setPos({ x: e.clientX, y: e.clientY });
      if (hovered) hovered.style.outline = outline;
      hovered = e.target;
      outline = hovered.style.outline;
      hovered.style.outline = "2px solid rgba(59, 130, 246, 0.7)";
      hovered.style.outlineOffset = "1px";
    };

    const onClick = (e) => {
      if (e.target.closest("[data-dev-inspector]")) return;
      e.preventDefault();
      e.stopPropagation();
      const el = e.target;
      const styles = getStyles(el);
      const data = {
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.slice(0, 60),
        selector: getSelector(el),
        ...styles,
      };
      setInfo(data);
      navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    };

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);

    return () => {
      if (hovered) hovered.style.outline = outline;
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [enabled, active, getSelector, getStyles]);

  // Toggle with Ctrl+Shift+I (only when dev mode enabled)
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        setActive((a) => !a);
        setInfo(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled]);

  // Reset active state when disabled
  useEffect(() => {
    if (!enabled) { setActive(false); setInfo(null); }
  }, [enabled]);

  if (!enabled) return null;

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        style={{
          position: "fixed",
          bottom: 56,
          right: 16,
          zIndex: 99999,
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--color-text)",
          color: "var(--color-bg)",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.4,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.target.style.opacity = 1)}
        onMouseLeave={(e) => (e.target.style.opacity = 0.4)}
        title="Dev Inspector (Ctrl+Shift+I)"
      >
        +
      </button>
    );
  }

  return (
    <>
      {/* Crosshair cursor override */}
      <style>{`* { cursor: crosshair !important; }`}</style>

      {/* Close button */}
      <button
        data-dev-inspector
        onClick={() => { setActive(false); setInfo(null); }}
        style={{
          position: "fixed",
          bottom: 56,
          right: 16,
          zIndex: 99999,
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "#e53e3e",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: 16,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Close inspector"
      >
        x
      </button>

      {/* Info panel */}
      {info && (
        <div
          data-dev-inspector
          style={{
            position: "fixed",
            bottom: 96,
            right: 16,
            zIndex: 99999,
            background: "#1a1a1a",
            color: "#e0e0e0",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 11,
            fontFamily: "var(--font-mono, monospace)",
            lineHeight: 1.6,
            maxWidth: 380,
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          {copied && (
            <div style={{ color: "#68d391", marginBottom: 4, fontSize: 10 }}>
              Copied to clipboard
            </div>
          )}
          <div><span style={{ color: "#90cdf4" }}>{info.tag}</span> <span style={{ color: "#666" }}>{info.size}</span></div>
          <div style={{ color: "#a0aec0", fontSize: 10, marginBottom: 4, wordBreak: "break-all" }}>{info.selector}</div>
          <div>font: <span style={{ color: "#fbd38d" }}>{info.font}</span></div>
          <div>color: <span style={{ color: "#fc8181" }}>{info.color}</span></div>
          <div>bg: <span style={{ color: "#9ae6b4" }}>{info.bg}</span></div>
          <div>padding: {info.padding}</div>
          <div>margin: {info.margin}</div>
          {info.text && <div style={{ color: "#666", marginTop: 4, fontSize: 10 }}>"{info.text.trim()}"</div>}
        </div>
      )}
    </>
  );
}
