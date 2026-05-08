"use client";

import { useEffect } from "react";

/**
 * Client-only scroll-into-view on mount based on `location.hash`.
 *
 * Next's App Router does NOT auto-scroll to hash fragments on server-rendered
 * pages; we need a tiny client hook for it. Used by the item detail page
 * when navigated via an Ask citation chip (T-12).
 *
 * Runs once per pathname change. Smooth-scrolls; no-op if the element
 * doesn't exist yet.
 */
export function ScrollToHash() {
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash) return;
    const id = hash.slice(1);
    // Next may render chunks after initial paint — retry once on the next frame.
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      }
      return false;
    };
    if (!tryScroll()) {
      requestAnimationFrame(() => tryScroll());
    }
  }, []);
  return null;
}
