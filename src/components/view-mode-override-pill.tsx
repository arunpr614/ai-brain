"use client";

import React, { useState } from "react";
import { Laptop, RotateCcw, Smartphone, X } from "lucide-react";
import { useViewMode } from "./view-mode-provider";

export function ViewModeOverridePill() {
  const { viewMode, isOverridden, resetToAuto } = useViewMode();
  const [dismissed, setDismissed] = useState(false);

  if (!isOverridden || dismissed) return null;

  const isMobile = viewMode === "mobile";
  const Icon = isMobile ? Smartphone : Laptop;
  const label = isMobile ? "Mobile PWA Mode Enforced" : "Desktop Mode Enforced";

  return (
    <aside
      aria-label="View mode override"
      className="fixed bottom-16 right-4 z-50 flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)]/95 py-1.5 pl-3 pr-2 text-xs font-medium text-[var(--text-primary)] shadow-lg backdrop-blur-md transition-all duration-[var(--duration-fast)]"
    >
      <Icon className="h-3.5 w-3.5 text-[var(--accent-11)] shrink-0" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{isMobile ? "Mobile Mode" : "Desktop Mode"}</span>
      <button
        type="button"
        onClick={resetToAuto}
        className="inline-flex items-center gap-1 rounded-full bg-[var(--action-primary-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--action-primary-fg)] transition-colors hover:bg-[var(--action-primary-bg-hover)]"
        title="Reset to Auto Responsive mode"
      >
        <RotateCcw className="h-3 w-3" />
        <span>Reset</span>
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-full p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        aria-label="Dismiss indicator"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </aside>
  );
}
