"use client";

import { useState, useEffect } from "react";

/**
 * useIsMobile() — true on touch devices (phones/tablets) under 768px.
 * Uses pointer:coarse (touch input) + max-width so desktop stays desktop
 * at any window size. SSR-safe: defaults to false.
 */
export function useIsMobile() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse) and (max-width: 768px)");
    setMobile(mq.matches);
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return mobile;
}
