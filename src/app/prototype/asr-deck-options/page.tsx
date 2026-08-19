"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  type DateRangePreset,
  filterCompletedJobs,
  calculatePresetCounts,
  formatLiveHeartbeat,
} from "@/lib/asr-deck/date-filters";

// Mock data matching production workstation deck
const MOCK_COMPLETED_JOBS = [
  {
    job_id: 101,
    item_id: "demo-1",
    title: "Andrej Karpathy — Building Neural Networks: Zero to Hero Deep Dive",
    completed_at: Date.now() - 1000 * 60 * 25, // 25 mins ago (today)
    word_count: 14250,
    duration_seconds: 3720,
    origin: "autonomous_sweep",
    sweep_batch_id: "sweep_20260819_1200",
    sweep_timestamp: Date.now() - 1000 * 60 * 25,
  },
  {
    job_id: 102,
    item_id: "demo-2",
    title: "Ilya Sutskever on Next-Gen Scaling Laws and Foundation Model Architecture",
    completed_at: Date.now() - 1000 * 60 * 60 * 3, // 3 hours ago (today)
    word_count: 8920,
    duration_seconds: 2150,
    origin: "user_capture",
    sweep_batch_id: null,
    sweep_timestamp: null,
  },
  {
    job_id: 103,
    item_id: "demo-3",
    title: "Yann LeCun — World Models, Autonomous Machine Intelligence & JEPA",
    completed_at: Date.now() - 1000 * 60 * 60 * 36, // 36 hours ago (this week)
    word_count: 11400,
    duration_seconds: 2840,
    origin: "autonomous_sweep",
    sweep_batch_id: "sweep_20260818_0300",
    sweep_timestamp: Date.now() - 1000 * 60 * 60 * 36,
  },
  {
    job_id: 104,
    item_id: "demo-4",
    title: "Demis Hassabis on AlphaFold 3, Gemini 2.0 & AI in Scientific Discovery",
    completed_at: Date.now() - 1000 * 60 * 60 * 24 * 12, // 12 days ago (this month)
    word_count: 16800,
    duration_seconds: 4120,
    origin: "user_capture",
    sweep_batch_id: null,
    sweep_timestamp: null,
  },
  {
    job_id: 105,
    item_id: "demo-5",
    title: "Geoffrey Hinton on Neural Substrates, Backprop and Biological Plausibility",
    completed_at: Date.now() - 1000 * 60 * 60 * 24 * 42, // 42 days ago (all time)
    word_count: 9400,
    duration_seconds: 2310,
    origin: "user_capture",
    sweep_batch_id: null,
    sweep_timestamp: null,
  },
];

export default function AsrDeckPrototypesPage() {
  const [selectedOption, setSelectedOption] = useState<"option1" | "option2" | "option3">("option2");
  const [dateRange, setDateRange] = useState<DateRangePreset>("today");
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [simulatedHeartbeatOffsetSec, setSimulatedHeartbeatOffsetSec] = useState<number>(3);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const simulatedHeartbeatMs = nowMs - simulatedHeartbeatOffsetSec * 1000;
  const heartbeat = formatLiveHeartbeat(simulatedHeartbeatMs, nowMs);

  const presetCounts = calculatePresetCounts(MOCK_COMPLETED_JOBS, nowMs);
  const filteredCompleted = filterCompletedJobs(MOCK_COMPLETED_JOBS, dateRange, nowMs);

  const formatTimestamp = (timestampMs: number) => {
    const diffSec = Math.floor((nowMs - timestampMs) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Prototype Suite Header */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              <span>🎨 Design Prototype Studio</span>
              <span>•</span>
              <span>Phase 6 / Issue #118</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Mac ASR Workstation Telemetry & Date Range Presets: Design Choices
            </h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-3xl">
              Compare 3 distinct visual patterns for integrating real-time worker heartbeat telemetry and Kanban completed stream date filtering. Switch between options to test interactive states.
            </p>
          </div>

          <Link
            href="/settings/asr-deck"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-xs hover:bg-[var(--surface-hover)]"
          >
            ← Back to Production Deck
          </Link>
        </div>

        {/* Option Selector Pills */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <span className="text-xs font-bold text-zinc-500 mr-2">Select Design Option:</span>
          <button
            onClick={() => setSelectedOption("option1")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              selectedOption === "option1"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "border border-[var(--border)] bg-[var(--surface-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Option 1: Top-Bar Integrated
          </button>
          <button
            onClick={() => setSelectedOption("option2")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              selectedOption === "option2"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "border border-[var(--border)] bg-[var(--surface-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Option 2: Dedicated Control Strip (Recommended)
          </button>
          <button
            onClick={() => setSelectedOption("option3")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              selectedOption === "option3"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "border border-[var(--border)] bg-[var(--surface-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Option 3: Column-Level Filter & Pulse
          </button>
        </div>

        {/* Heartbeat State Simulation Slider */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 bg-[var(--surface-base)] p-3 rounded-xl border border-[var(--border)]">
          <span className="font-semibold">Simulate Heartbeat Age:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSimulatedHeartbeatOffsetSec(2)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${simulatedHeartbeatOffsetSec <= 10 ? "bg-emerald-500 text-white" : "border border-[var(--border)]"}`}
            >
              Fresh (2s)
            </button>
            <button
              onClick={() => setSimulatedHeartbeatOffsetSec(28)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${simulatedHeartbeatOffsetSec > 10 && simulatedHeartbeatOffsetSec <= 45 ? "bg-amber-500 text-white" : "border border-[var(--border)]"}`}
            >
              Stale (28s)
            </button>
            <button
              onClick={() => setSimulatedHeartbeatOffsetSec(360)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${simulatedHeartbeatOffsetSec > 45 ? "bg-rose-500 text-white" : "border border-[var(--border)]"}`}
            >
              Offline (6m)
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🌟 OPTION 1: TOP-BAR INTEGRATED                                          */}
      {/* ========================================================================= */}
      {selectedOption === "option1" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-purple-500/30 bg-purple-50/10 p-3 text-xs text-purple-700 dark:text-purple-300">
            <strong>Option 1 Design Rationale:</strong> Combines the date preset selector directly into the top hardware strip. Keeps the whole page compact and maximizes vertical room for Kanban cards.
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Compact Heartbeat Badge */}
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${heartbeat.badgeClass}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${heartbeat.dotColorClass} animate-pulse`}></span>
                  <div className="text-xs font-bold tracking-wide">
                    {heartbeat.label} <span className="font-mono opacity-80">• {heartbeat.sublabel.split("•")[0]}</span>
                  </div>
                </div>

                {/* Model */}
                <div className="flex items-center gap-1.5 rounded-xl border border-purple-500/20 bg-purple-50 px-3 py-1.5 text-xs text-purple-900 dark:bg-purple-950/30 dark:text-purple-300">
                  <span>⚡</span>
                  <span className="font-semibold">Whisper Large v3 Turbo</span>
                </div>

                {/* Speedup */}
                <div className="flex items-center gap-1.5 rounded-xl border border-sky-500/20 bg-sky-50 px-3 py-1.5 text-xs text-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
                  <span>🚀</span>
                  <span className="font-semibold">16.8x Real-Time</span>
                </div>
              </div>

              {/* Integrated Date Filter Segmented Pills in Top Bar */}
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-base)] p-1 text-xs font-semibold">
                  {(["today", "week", "month", "all"] as DateRangePreset[]).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setDateRange(preset)}
                      className={`rounded-lg px-2.5 py-1 text-xs transition-all cursor-pointer ${
                        dateRange === preset
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-zinc-500 hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="capitalize">{preset === "today" ? "Today" : preset === "week" ? "Week" : preset === "month" ? "Month" : "All"}</span>
                      <span className="ml-1 text-[10px] opacity-80">({presetCounts[preset]})</span>
                    </button>
                  ))}
                </div>

                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-base)] text-xs">
                  🔄
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 OPTION 2: DEDICATED CONTROL STRIP (RECOMMENDED)                       */}
      {/* ========================================================================= */}
      {selectedOption === "option2" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
            <strong>Option 2 Design Rationale (Recommended):</strong> Features a balanced dual-tier architecture. The top strip stays dedicated to pure machine hardware telemetry, while a dedicated glassmorphic control strip provides high-visibility date range switching with dynamic counter badges.
          </div>

          {/* Top Hardware Strip */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* 2-Line Worker Presence Badge */}
                <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-2 ${heartbeat.badgeClass}`}>
                  <span className="relative flex h-3 w-3">
                    {heartbeat.isOnline && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex h-3 w-3 rounded-full ${heartbeat.dotColorClass}`}></span>
                  </span>
                  <div>
                    <div className="text-xs font-semibold tracking-wide uppercase">
                      {heartbeat.label}
                    </div>
                    <div className="text-[11px] font-mono opacity-85">
                      {heartbeat.sublabel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-50 px-3.5 py-2 text-purple-900 dark:bg-purple-950/30 dark:text-purple-300">
                  <span className="text-base">⚡</span>
                  <div>
                    <div className="text-xs font-semibold">Whisper Large v3 Turbo</div>
                    <div className="text-[11px] opacity-75">1.5B parameters • In-Memory PyAV</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-50 px-3.5 py-2 text-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
                  <span className="text-base">🚀</span>
                  <div>
                    <div className="text-xs font-semibold">16.8x Real-Time Speedup</div>
                    <div className="text-[11px] opacity-75">Zero Disk I/O Transcode</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-bold">{presetCounts.today} Completed Today</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">0 Queued • {presetCounts.all} Total All-Time</div>
                </div>
                <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-base)] text-zinc-700 dark:text-zinc-200 hover:bg-[var(--surface-hover)] cursor-pointer">
                  🔄
                </button>
              </div>
            </div>
          </div>

          {/* Dedicated Segmented Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 pl-1">
              <span className="text-sm">📅</span>
              <span>Completed Stream Range:</span>
            </div>

            <div role="group" aria-label="Date presets" className="flex flex-wrap items-center gap-1.5">
              {(["today", "week", "month", "all"] as DateRangePreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDateRange(preset)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    dateRange === preset
                      ? "bg-purple-100 text-purple-900 border border-purple-300 shadow-xs dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-800"
                      : "text-zinc-600 hover:bg-[var(--surface-hover)] hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  <span>{preset === "today" ? "Today" : preset === "week" ? "This Week" : preset === "month" ? "This Month" : "All Time"}</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    dateRange === preset
                      ? "bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-200"
                      : "bg-zinc-200/80 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                    {presetCounts[preset]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 OPTION 3: COLUMN-LEVEL FILTER & PULSE                                 */}
      {/* ========================================================================= */}
      {selectedOption === "option3" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-sky-500/30 bg-sky-50/10 p-3 text-xs text-sky-700 dark:text-sky-300">
            <strong>Option 3 Design Rationale:</strong> Places the date range selector directly inside the header of Column 3 (Completed Stream) since date filtering only affects historical completed items, keeping the rest of the workspace untouched.
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* High Density Hardware Card */}
                <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-2 ${heartbeat.badgeClass}`}>
                  <span className="flex h-3 w-3 relative">
                    <span className={`h-3 w-3 rounded-full ${heartbeat.dotColorClass} animate-ping absolute`}></span>
                    <span className={`h-3 w-3 rounded-full ${heartbeat.dotColorClass} relative`}></span>
                  </span>
                  <div>
                    <div className="text-xs font-semibold uppercase flex items-center gap-2">
                      <span>{heartbeat.label}</span>
                      <span className="font-mono text-[10px] bg-black/20 px-1 rounded">2.1 ms daemon ping</span>
                    </div>
                    <div className="text-[11px] font-mono opacity-85">
                      {heartbeat.sublabel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-50 px-3.5 py-2 text-purple-900 dark:bg-purple-950/30 dark:text-purple-300">
                  <span className="text-base">⚡</span>
                  <div>
                    <div className="text-xs font-semibold">Whisper Large v3 Turbo</div>
                    <div className="text-[11px] opacity-75">1.5B parameters • In-Memory PyAV</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-bold">{presetCounts.today} Completed Today</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">0 Queued • {presetCounts.all} Total All-Time</div>
                </div>
                <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-base)] text-zinc-700 dark:text-zinc-200 hover:bg-[var(--surface-hover)]">
                  🔄
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📊 3-COLUMN PREVIEW DEMO                                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 pt-2">
        {/* Column 1: Queue Backlog */}
        <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">Queue Backlog</h2>
              <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-semibold text-zinc-500">
                0
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] p-12 text-center text-xs text-zinc-500">
            <span className="text-2xl mb-1">📭</span>
            <span>Backlog is clear</span>
          </div>
        </div>

        {/* Column 2: Transcribing Now */}
        <div className="flex flex-col rounded-2xl border border-purple-300/40 bg-purple-50/10 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight">Transcribing Now</h2>
            <span className="text-xs text-zinc-400">Worker Idle</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-xs text-zinc-500">
            <span className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 font-bold dark:bg-emerald-950/40">✓</span>
            <span className="font-bold text-[var(--text-primary)]">Worker Standing By</span>
            <span className="text-[11px] text-zinc-400 mt-1">Polling every 5s for audio tasks</span>
          </div>
        </div>

        {/* Column 3: Completed History (Live Filtered) */}
        <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">Completed History</h2>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {filteredCompleted.length}
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                {selectedOption === "option3" ? "Contextual Filter Below" : `Filter: ${dateRange}`}
              </span>
            </div>

            {/* In Option 3: Mini tab switcher directly inside Column 3 header */}
            {selectedOption === "option3" && (
              <div className="grid grid-cols-4 gap-1 bg-[var(--surface-base)] p-1 rounded-lg border border-[var(--border)] text-[11px]">
                {(["today", "week", "month", "all"] as DateRangePreset[]).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setDateRange(preset)}
                    className={`py-1 rounded text-center font-semibold transition cursor-pointer ${
                      dateRange === preset
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-zinc-500 hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {preset === "today" ? "Today" : preset === "week" ? "Week" : preset === "month" ? "Month" : "All"} ({presetCounts[preset]})
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {filteredCompleted.map((job) => (
              <div
                key={job.job_id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-base)] p-3.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="block truncate text-xs font-semibold text-[var(--text-primary)]">
                      {job.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        ✓ {formatTimestamp(job.completed_at)}
                      </span>
                      <span>•</span>
                      <span>{job.word_count.toLocaleString()} words</span>
                      <span>•</span>
                      <span>{formatDuration(job.duration_seconds)} audio</span>
                    </div>
                  </div>

                  <span className="rounded-lg bg-[var(--surface-raised)] px-2 py-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Studio ↗
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
