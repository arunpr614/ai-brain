"use client";

import { useState, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export type SplitRatio = "50:50" | "60:40" | "40:60";

export interface SplitPaneContainerProps {
  leftPane: ReactNode;
  rightPane: ReactNode;
  defaultRatio?: SplitRatio;
  onRatioChange?: (ratio: SplitRatio) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  className?: string;
  mobileTab?: "left" | "right";
}

export function SplitPaneContainer({
  leftPane,
  rightPane,
  defaultRatio = "60:40",
  onRatioChange,
  isFocusMode = false,
  onToggleFocusMode,
  className = "",
  mobileTab = "left",
}: SplitPaneContainerProps) {
  const [ratio, setRatio] = useState<SplitRatio>(defaultRatio);

  const handleRatioChange = (newRatio: SplitRatio) => {
    setRatio(newRatio);
    onRatioChange?.(newRatio);
  };

  const getLeftSpan = () => {
    if (isFocusMode) return "lg:col-span-12";
    switch (ratio) {
      case "50:50":
        return "lg:col-span-6";
      case "60:40":
        return "lg:col-span-7";
      case "40:60":
        return "lg:col-span-5";
      default:
        return "lg:col-span-7";
    }
  };

  const getRightSpan = () => {
    if (isFocusMode) return "hidden";
    switch (ratio) {
      case "50:50":
        return "lg:col-span-6";
      case "60:40":
        return "lg:col-span-5";
      case "40:60":
        return "lg:col-span-7";
      default:
        return "lg:col-span-5";
    }
  };

  return (
    <div className={`flex flex-col w-full ${className}`}>
      {/* Ratio & Focus Toolbar Controls (Desktop Only) */}
      <div className="hidden lg:flex items-center justify-end gap-2 px-6 py-2 bg-[var(--surface-base)] border-b border-[var(--border)] text-xs text-[var(--text-secondary)]">
        <span className="text-[11px] font-mono text-[var(--text-muted)]">Split Layout:</span>
        <div className="inline-flex rounded-lg bg-[var(--surface)] p-0.5 border border-[var(--border)]">
          {(["50:50", "60:40", "40:60"] as SplitRatio[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRatioChange(r)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium transition-colors ${
                ratio === r
                  ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {onToggleFocusMode && (
          <button
            type="button"
            onClick={onToggleFocusMode}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
              isFocusMode
                ? "bg-indigo-950/40 text-indigo-300 border-indigo-800/60"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {isFocusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>Focus Mode (⌥F)</span>
          </button>
        )}
      </div>

      {/* Main Dual Pane Content Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane (Media / Transcript) */}
        <div
          className={`${getLeftSpan()} flex flex-col gap-4 ${
            mobileTab === "left" ? "flex" : "hidden lg:flex"
          }`}
        >
          {leftPane}
        </div>

        {/* Right Pane (Companion Workbench) */}
        {!isFocusMode && (
          <div
            className={`${getRightSpan()} flex flex-col h-[760px] sticky top-16 ${
              mobileTab === "right" ? "flex" : "hidden lg:flex"
            }`}
          >
            {rightPane}
          </div>
        )}
      </div>
    </div>
  );
}
