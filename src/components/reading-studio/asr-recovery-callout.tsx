"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Zap } from "lucide-react";
import { enqueueItemForAsrAction } from "@/app/needs-upgrade/actions";

export interface AsrRecoveryCalloutProps {
  itemId: string;
  diagnosticWarning?: string | null;
  className?: string;
}

export function AsrRecoveryCallout({
  itemId,
  diagnosticWarning,
  className = "",
}: AsrRecoveryCalloutProps) {
  const [isPending, startTransition] = useTransition();
  const [queued, setQueued] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleQueueAsr = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await enqueueItemForAsrAction(itemId);
      if (res.ok) {
        setQueued(true);
      } else {
        setErrorMessage(res.error || "Failed to queue ASR job.");
      }
    });
  };

  return (
    <div
      className={`rounded-xl border border-rose-200 bg-rose-50/80 dark:border-rose-500/30 dark:bg-rose-950/20 p-3.5 sm:p-4 text-xs ${className}`}
      role="region"
      aria-label="Degraded capture recovery callout"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-md bg-rose-100 dark:bg-rose-500/20 p-1.5 text-rose-700 dark:text-rose-400 shrink-0 border border-rose-200 dark:border-rose-500/30">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-rose-950 dark:text-rose-200 text-sm sm:text-xs">
                Missing Timed Transcript
              </span>
              <span className="rounded-md bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                Degraded Capture
              </span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed text-xs">
              {diagnosticWarning ||
                "Official YouTube captions were blocked or unavailable. Recover complete timed segments with on-device Apple Silicon Neural Engine (ANE) ASR."}
            </p>
            {errorMessage && (
              <p className="text-rose-700 dark:text-rose-400 font-semibold">{errorMessage}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 sm:self-center">
          {queued ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-950 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Queued for Mac ASR</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleQueueAsr}
              disabled={isPending}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--action-primary-bg)] px-4 text-xs font-semibold text-[var(--action-primary-fg)] shadow-xs transition-all hover:bg-[var(--action-primary-bg-hover)] active:scale-98 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Enqueuing...</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                  <span>Queue Mac ASR (M5 Pro ANE)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
