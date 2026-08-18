"use client";

import { useEffect } from "react";
import { Loader2, X } from "lucide-react";

export interface FloatingBulkDockAction {
  id: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void | Promise<void>;
}

export interface FloatingBulkProgress {
  current: number;
  total: number;
  percent: number;
  label?: string;
}

export interface FloatingBulkDockProps {
  selectedCount: number;
  totalCount?: number;
  actions: FloatingBulkDockAction[];
  onDeselectAll: () => void;
  onSelectAll?: () => void;
  isProcessing?: boolean;
  progress?: FloatingBulkProgress;
  className?: string;
}

export function FloatingBulkDock({
  selectedCount,
  totalCount,
  actions,
  onDeselectAll,
  onSelectAll,
  isProcessing = false,
  progress,
  className = "",
}: FloatingBulkDockProps) {
  // Dismiss on Escape key
  useEffect(() => {
    if (selectedCount === 0 || isProcessing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDeselectAll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCount, onDeselectAll, isProcessing]);

  if (selectedCount === 0) return null;

  return (
    <div
      className={`fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-in slide-in-from-bottom-4 duration-200 ${className}`}
      role="region"
      aria-label="Bulk action dock"
    >
      <div className="pointer-events-auto flex flex-col gap-2.5 max-w-3xl w-full sm:w-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)]/95 backdrop-blur-md px-4 sm:px-6 py-3.5 shadow-2xl">
        {/* Main Dock Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Selection Badge & Details */}
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300">
              {selectedCount} selected
            </span>

            {totalCount != null && totalCount > selectedCount && onSelectAll && (
              <button
                type="button"
                onClick={onSelectAll}
                disabled={isProcessing}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline transition-colors"
              >
                Select all {totalCount}
              </button>
            )}
          </div>

          <div className="hidden sm:block h-5 w-px bg-[var(--border)]" />

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              const isPrimary = action.variant === "primary" || !action.variant;
              const isDanger = action.variant === "danger";

              let btnClass = "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-base)]";
              if (isPrimary) {
                btnClass = "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] shadow-xs";
              } else if (isDanger) {
                btnClass = "border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20";
              }

              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled || isProcessing}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${btnClass}`}
                >
                  {action.loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : Icon ? (
                    <Icon className="h-3.5 w-3.5" />
                  ) : null}
                  <span>
                    {action.label}
                    {action.count != null ? ` (${action.count})` : ""}
                  </span>
                </button>
              );
            })}

            {/* Deselect Action */}
            <button
              type="button"
              onClick={onDeselectAll}
              disabled={isProcessing}
              aria-label="Deselect all (Escape)"
              className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 transition-colors disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* In-Flight Processing Progress Bar */}
        {(isProcessing || progress) && (
          <div className="space-y-1 pt-1 border-t border-[var(--border)]">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
              <span>{progress?.label || "Processing batch jobs..."}</span>
              <span>{progress ? `${Math.round(progress.percent)}%` : "In flight..."}</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--surface-base)] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progress?.percent ?? 50}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
