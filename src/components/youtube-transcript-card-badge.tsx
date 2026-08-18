"use client";

import { useState } from "react";
import { Sparkles, Loader2, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export type CardTranscriptState =
  | "attached"
  | "transcribing"
  | "queued_online"
  | "queued_offline"
  | "needs_transcript"
  | "error";

export interface YouTubeTranscriptCardBadgeProps {
  itemId: string;
  isYouTube: boolean;
  hasTranscript: boolean;
  jobState?: "pending" | "running" | "retryable_error" | "manual_needed" | "done" | null;
  isMacOnline?: boolean;
  onEnqueueSuccess?: () => void;
}

export function computeTranscriptCardState(props: {
  isYouTube: boolean;
  hasTranscript: boolean;
  jobState?: string | null;
  isMacOnline?: boolean;
}): CardTranscriptState | null {
  if (!props.isYouTube) return null;
  if (props.hasTranscript) return "attached";

  if (props.jobState === "running") {
    return "transcribing";
  }
  if (props.jobState === "pending") {
    return props.isMacOnline ? "queued_online" : "queued_offline";
  }
  if (props.jobState === "retryable_error" || props.jobState === "manual_needed") {
    return "error";
  }
  return "needs_transcript";
}

export function YouTubeTranscriptCardBadge({
  itemId,
  isYouTube,
  hasTranscript,
  jobState,
  isMacOnline = false,
  onEnqueueSuccess,
}: YouTubeTranscriptCardBadgeProps) {
  const [loading, setLoading] = useState(false);
  const [currentJobState, setCurrentJobState] = useState(jobState);

  const state = computeTranscriptCardState({
    isYouTube,
    hasTranscript,
    jobState: currentJobState,
    isMacOnline,
  });

  if (!state) return null;

  const handleEnqueue = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/worker/transcript-jobs/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, priority: 100 }),
      });
      if (res.ok) {
        setCurrentJobState("pending");
        if (onEnqueueSuccess) onEnqueueSuccess();
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  if (state === "attached") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        Transcript Attached
      </span>
    );
  }

  if (state === "transcribing") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin" />
        M5 Pro Transcribing...
      </span>
    );
  }

  if (state === "queued_online") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
        <Clock className="h-3 w-3" />
        Queued for Mac
      </span>
    );
  }

  if (state === "queued_offline") {
    return (
      <div className="inline-flex items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          title="Queued. Transcription will start automatically when your Mac connects."
        >
          <Clock className="h-3 w-3" />
          Queued (Mac Offline)
        </span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <button
        onClick={handleEnqueue}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900 transition-colors"
      >
        <AlertCircle className="h-3 w-3" />
        {loading ? "Retrying..." : "Retry on Mac"}
      </button>
    );
  }

  // Default: needs_transcript
  return (
    <button
      onClick={handleEnqueue}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 transition-colors shadow-xs"
    >
      <Sparkles className="h-3 w-3" />
      {loading ? "Queueing..." : "⚡ Transcribe with Mac"}
    </button>
  );
}
