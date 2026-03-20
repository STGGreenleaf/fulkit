"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export default function Tooltip({ label, children, delay = 200, align = "center" }) {
  const [visible, setVisible] = useState(false);
  const timeout = useRef(null);

  // Reset when label changes (e.g. compact toggle flips label to null)
  useEffect(() => {
    if (!label) {
      clearTimeout(timeout.current);
      setVisible(false);
    }
  }, [label]);

  const show = useCallback(() => {
    timeout.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    clearTimeout(timeout.current);
    setVisible(false);
  }, []);

  if (!label) return children;

  return (
    <div
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ position: "relative", display: "inline-flex", width: "100%" }}
    >
      {children}
      {visible && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            ...(align === "center" && { left: "50%", transform: "translateX(-50%)" }),
            ...(align === "left" && { left: 0 }),
            ...(align === "right" && { right: 0 }),
            padding: "3px 8px",
            background: "var(--color-text)",
            color: "var(--color-bg)",
            fontSize: "var(--font-size-2xs)",
            fontFamily: "var(--font-primary)",
            fontWeight: "var(--font-weight-medium)",
            borderRadius: "var(--radius-sm)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 50,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
