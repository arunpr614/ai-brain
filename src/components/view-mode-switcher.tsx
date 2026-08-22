"use client";

import React from "react";
import { Laptop, Smartphone, Sparkles } from "lucide-react";
import { useViewMode } from "./view-mode-provider";
import { cn } from "@/lib/cn";
import type { ViewMode } from "@/lib/view-mode";

interface ViewModeSwitcherProps {
  variant?: "sidebar" | "expanded";
  className?: string;
}

const MODES: Array<{
  value: ViewMode;
  label: string;
  shortLabel: string;
  icon: typeof Sparkles;
  description: string;
}> = [
  {
    value: "auto",
    label: "Auto Responsive",
    shortLabel: "Auto",
    icon: Sparkles,
    description: "Adapts to screen width and standalone PWA mode",
  },
  {
    value: "mobile",
    label: "Mobile PWA",
    shortLabel: "Mobile",
    icon: Smartphone,
    description: "Bottom navigation, 1-tap capture & Reading Studio",
  },
  {
    value: "desktop",
    label: "Desktop Workbench",
    shortLabel: "Desktop",
    icon: Laptop,
    description: "Sidebar rail, metadata panels & keyboard navigation",
  },
];

export function ViewModeSwitcher({
  variant = "sidebar",
  className,
}: ViewModeSwitcherProps) {
  const { viewMode, setViewMode } = useViewMode();

  if (variant === "expanded") {
    return (
      <div className={cn("space-y-2", className)}>
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Experience Mode Posture
        </label>
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const active = viewMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => setViewMode(mode.value)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 rounded-lg py-2.5 px-2 text-center transition-all duration-[var(--duration-fast)]",
                  active
                    ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]/50"
                )}
                aria-pressed={active}
              >
                <Icon className={cn("h-4 w-4", active ? "text-[var(--accent-11)]" : "opacity-70")} />
                <span className="text-xs">{mode.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[var(--text-secondary)]">
          {MODES.find((m) => m.value === viewMode)?.description}
        </p>
      </div>
    );
  }

  // Sidebar compact variant
  return (
    <div className={cn("flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-0.5", className)}>
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const active = viewMode === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => setViewMode(mode.value)}
            title={`${mode.label}: ${mode.description}`}
            aria-label={mode.label}
            aria-pressed={active}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md py-1 px-1.5 text-[11px] font-medium transition-all duration-[var(--duration-fast)]",
              active
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-75 hover:opacity-100"
            )}
          >
            <Icon className={cn("h-3 w-3", active ? "text-[var(--accent-11)]" : "")} />
            <span>{mode.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
