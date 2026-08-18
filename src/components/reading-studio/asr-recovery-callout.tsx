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
      className={`rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 sm:p-4 text-xs ${className}`}
      role="region"
      aria-label="Degraded capture recovery callout"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-md bg-rose-500/20 p-1.5 text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-rose-700 dark:text-rose-300">
                Missing Timed Transcript
              </span>
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] uppercase text-rose-700 dark:text-rose-300">
                Degraded Capture
              </span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {diagnosticWarning ||
                "Official YouTube captions were blocked or unavailable. Recover complete timed segments with on-device Apple Silicon Neural Engine (ANE) ASR."}
            </p>
            {errorMessage && (
              <p className="text-rose-600 dark:text-rose-400 font-medium">{errorMessage}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 sm:self-center">
          {queued ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Queued for Mac ASR</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleQueueAsr}
              disabled={isPending}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--action-primary-bg)] px-3.5 text-xs font-semibold text-[var(--action-primary-fg)] shadow-xs transition-all hover:bg-[var(--action-primary-bg-hover)] active:scale-98 disabled:opacity-60"
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
