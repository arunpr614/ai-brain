"use client";

import { useState, useId, useMemo, useCallback, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  Sparkles,
  Download,
  Pencil,
  Tag,
  Hash,
  MessageSquare,
  ArrowRight,
  Clock,
  Pin,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Quote,
} from "lucide-react";
import { ManualNoteEditor } from "@/components/manual-note-editor";
import type { ItemRow } from "@/db/client";
import type { ItemTopicRow } from "@/db/topics";
import type { TagRow } from "@/db/tags";
import {
  useNoteEventListener,
  dispatchAppendNoteText,
} from "@/lib/reading-studio/note-event-bus";
import {
  parseRecallMemory,
  type RecallParsedTakeaway,
} from "@/lib/reading-studio/recall-parser";
import {
  matchQuoteToTranscript,
  type TimestampedSegment,
} from "@/lib/reading-studio/quote-matcher";

export interface MultiLayerCompanionTabsProps {
  item: ItemRow;
  topics: ItemTopicRow[];
  tags: TagRow[];
  parsedQuotes: string[];
  segments?: TimestampedSegment[];
  onSeek?: (timestampMs: number) => void;
}

export function MultiLayerCompanionTabs({
  item,
  topics,
  tags,
  parsedQuotes,
  segments = [],
  onSeek,
}: MultiLayerCompanionTabsProps) {
  const isRecallImport = item.capture_source === "recall";
  const [activeTab, setActiveTab] = useState<"notes" | "ai" | "ask" | "recall">("notes");
  const [pinnedTakeawayIds, setPinnedTakeawayIds] = useState<Set<string>>(new Set());
  const [pinnedQuoteIndices, setPinnedQuoteIndices] = useState<Set<number>>(new Set());
  const [pinnedSummary, setPinnedSummary] = useState(false);
  const [showRawRecall, setShowRawRecall] = useState(false);
  const [contextualAskQuery, setContextualAskQuery] = useState("");
  const id = useId();

  // Parse Recall memory from body and summary
  const recallMemory = useMemo(() => {
    return parseRecallMemory(item.body, item.summary);
  }, [item.body, item.summary]);

  // Pre-calculate timestamp matches for all quotes
  const quoteMatches = useMemo(() => {
    return parsedQuotes.map((q) => matchQuoteToTranscript(q, segments));
  }, [parsedQuotes, segments]);

  const handleAppendEvent = useCallback(() => {
    setActiveTab("notes");
  }, []);

  // Listen for pinned quote events to auto-switch to Notes tab
  useNoteEventListener(item.id, handleAppendEvent);

  const handlePinTakeaway = useCallback((takeaway: RecallParsedTakeaway) => {
    const formattedQuote = takeaway.timestampLabel && takeaway.timestampSeconds !== null
      ? `> "${takeaway.text}" [${takeaway.timestampLabel}](?t=${takeaway.timestampSeconds})\n\n`
      : `> "${takeaway.text}"\n\n`;

    dispatchAppendNoteText({
      itemId: item.id,
      text: formattedQuote,
      timestampMs: takeaway.timestampMs || undefined,
    });

    setPinnedTakeawayIds((prev) => new Set(prev).add(takeaway.id));
    setActiveTab("notes");
  }, [item.id]);

  const handlePinQuote = useCallback((quote: string, index: number, timestampLabel?: string | null, timestampMs?: number | null) => {
    const citation = timestampLabel
      ? `> "${quote.trim()}"\n> — *[${item.title || "Source"} (${timestampLabel})](?t=${Math.floor((timestampMs || 0) / 1000)})*\n\n`
      : `> "${quote.trim()}"\n> — *${item.title || "Source"}*\n\n`;

    dispatchAppendNoteText({
      itemId: item.id,
      text: citation,
      timestampMs: timestampMs || undefined,
    });

    setPinnedQuoteIndices((prev) => new Set(prev).add(index));
    setActiveTab("notes");
  }, [item.id, item.title]);

  const handlePinSummary = useCallback(() => {
    if (!item.summary) return;
    const formatted = `### Summary Takeaway\n\n${item.summary.trim()}\n\n> — *${item.title || "Source"}*\n\n`;
    dispatchAppendNoteText({
      itemId: item.id,
      text: formatted,
    });
    setPinnedSummary(true);
    setActiveTab("notes");
  }, [item.id, item.summary, item.title]);

  const handleElaborate = useCallback((queryContext: string) => {
    const prefill = `Explain in detail and provide key context from this item on: "${queryContext}"`;
    setContextualAskQuery(prefill);
    setActiveTab("ask");
  }, []);

  const notesTabId = `${id}-notes-tab`;
  const aiTabId = `${id}-ai-tab`;
  const askTabId = `${id}-ask-tab`;
  const recallTabId = `${id}-recall-tab`;

  const notesPanelId = `${id}-notes-panel`;
  const aiPanelId = `${id}-ai-panel`;
  const askPanelId = `${id}-ask-panel`;
  const recallPanelId = `${id}-recall-panel`;

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const tabs: Array<"notes" | "ai" | "ask" | "recall"> = ["notes", "ai", "ask", "recall"];

    const currentIdx = tabs.indexOf(activeTab);
    if (currentIdx === -1) return;

    let nextIdx = currentIdx;
    if (event.key === "ArrowRight") nextIdx = (currentIdx + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIdx = 0;
    else if (event.key === "End") nextIdx = tabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = tabs[nextIdx];
    setActiveTab(nextTab);
  };

  return (
    <div className="relative z-10 flex flex-col h-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      {/* Companion Tabs Header */}
      <div className="p-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <div
          role="tablist"
          aria-label="Reading Studio Companion Layers"
          className="grid grid-cols-4 gap-1 rounded-lg bg-[var(--surface-base)] p-1 border border-[var(--border)]"
        >
          {/* Tab 1: Notes */}
          <button
            id={notesTabId}
            type="button"
            role="tab"
            aria-selected={activeTab === "notes"}
            aria-controls={notesPanelId}
            tabIndex={activeTab === "notes" ? 0 : -1}
            onClick={() => setActiveTab("notes")}
            onKeyDown={onTabKeyDown}
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "notes"
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Pencil className="h-3.5 w-3.5 text-emerald-500" />
            <span className="truncate">Notes</span>
          </button>

          {/* Tab 2: AI Brief */}
          <button
            id={aiTabId}
            type="button"
            role="tab"
            aria-selected={activeTab === "ai"}
            aria-controls={aiPanelId}
            tabIndex={activeTab === "ai" ? 0 : -1}
            onClick={() => setActiveTab("ai")}
            onKeyDown={onTabKeyDown}
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "ai"
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span className="truncate">Brief</span>
          </button>

          {/* Tab 3: Ask AI */}
          <button
            id={askTabId}
            type="button"
            role="tab"
            aria-selected={activeTab === "ask"}
            aria-controls={askPanelId}
            tabIndex={activeTab === "ask" ? 0 : -1}
            onClick={() => setActiveTab("ask")}
            onKeyDown={onTabKeyDown}
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "ask"
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
            <span className="truncate">Ask AI</span>
          </button>

          {/* Tab 4: Recall */}
          <button
            id={recallTabId}
            type="button"
            role="tab"
            aria-selected={activeTab === "recall"}
            aria-controls={recallPanelId}
            tabIndex={activeTab === "recall" ? 0 : -1}
            onClick={() => setActiveTab("recall")}
            onKeyDown={onTabKeyDown}
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "recall"
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Download className="h-3.5 w-3.5 text-purple-400" />
            <span className="truncate">Recall</span>
            {(isRecallImport || recallMemory.isRecall) && (
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Tab 1: User Markdown Notes */}
        <div
          id={notesPanelId}
          role="tabpanel"
          aria-labelledby={notesTabId}
          className={activeTab === "notes" ? "h-full" : "hidden"}
        >
          <ManualNoteEditor itemId={item.id} itemTitle={item.title} focusEnabled={true} />
        </div>

        {/* Tab 2: AI Cognitive Brief */}
        <div
          id={aiPanelId}
          role="tabpanel"
          aria-labelledby={aiTabId}
          className={activeTab === "ai" ? "space-y-4" : "hidden"}
        >
          {item.summary ? (
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold uppercase tracking-wider text-[11px]">
                  <Sparkles className="h-4 w-4" />
                  <span>Executive Summary</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePinSummary}
                    disabled={pinnedSummary}
                    title="Pin Summary to Notes"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-950/40 border border-indigo-700/60 text-indigo-200 hover:bg-indigo-900/60 transition cursor-pointer"
                  >
                    {pinnedSummary ? <Check className="h-3 w-3 text-emerald-400" /> : <Pin className="h-3 w-3" />}
                    <span>{pinnedSummary ? "Pinned" : "Pin to Notes"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleElaborate(item.summary || "")}
                    title="Ask AI to elaborate on summary"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-950/40 border border-indigo-700/60 text-indigo-200 hover:bg-indigo-900/60 transition cursor-pointer"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>Elaborate</span>
                  </button>
                </div>
              </div>
              <p className="leading-relaxed text-[var(--text-primary)] text-sm whitespace-pre-line">{item.summary}</p>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
              <Sparkles className="h-5 w-5 mx-auto mb-2 text-[var(--text-muted)]" />
              <span>AI synthesis will generate structured takeaways once indexed.</span>
            </div>
          )}

          {/* AI Concept Topics */}
          {topics.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Key Concepts & Topics
              </span>
              <div className="flex flex-wrap gap-1.5">
                {topics.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleElaborate(t.name)}
                    title={`Ask AI to explain concept: ${t.name}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 text-xs font-mono hover:bg-indigo-900/60 hover:text-indigo-200 transition cursor-pointer"
                  >
                    <Hash className="h-3 w-3" />
                    <span>{t.name}</span>
                    <span className="text-[10px] opacity-60">↗</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Quotes with Time Navigation & Actions */}
          {parsedQuotes.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Key Quotes & Citations
              </span>
              <div className="space-y-3">
                {parsedQuotes.map((quote, idx) => {
                  const match = quoteMatches[idx];
                  const isPinned = pinnedQuoteIndices.has(idx);

                  return (
                    <div
                      key={idx}
                      className="group/quote rounded-xl border border-indigo-500/20 bg-[var(--surface)] p-3.5 shadow-xs transition hover:border-indigo-400/50"
                    >
                      <blockquote className="border-l-2 border-indigo-400 pl-3 text-xs italic leading-relaxed text-[var(--text-primary)]">
                        &ldquo;{quote}&rdquo;
                      </blockquote>

                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2 text-[11px]">
                        {/* Time Jump Pill */}
                        {match && (
                          <button
                            type="button"
                            onClick={() => onSeek?.(match.startMs)}
                            title={`Jump video player to ${match.timestampLabel}`}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 transition cursor-pointer"
                          >
                            <Clock className="h-2.5 w-2.5" />
                            <span>⏱️ {match.timestampLabel}</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1.5 ml-auto">
                          {/* Pin to Notes Button */}
                          <button
                            type="button"
                            onClick={() => handlePinQuote(quote, idx, match?.timestampLabel, match?.startMs)}
                            disabled={isPinned}
                            title="Pin this quote to active notes"
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition cursor-pointer ${
                              isPinned
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {isPinned ? <Check className="h-3 w-3 text-emerald-500" /> : <Pin className="h-3 w-3" />}
                            <span>{isPinned ? "Pinned" : "Pin"}</span>
                          </button>

                          {/* Ask AI to Elaborate */}
                          <button
                            type="button"
                            onClick={() => handleElaborate(quote)}
                            title="Ask AI to elaborate on this quote"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-indigo-500/50 transition cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3 text-indigo-400" />
                            <span>Elaborate</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tab 3: Ask AI Companion */}
        <div
          id={askPanelId}
          role="tabpanel"
          aria-labelledby={askTabId}
          className={activeTab === "ask" ? "space-y-4" : "hidden"}
        >
          <div className="p-5 rounded-xl bg-cyan-50 border border-cyan-200 text-xs space-y-4 dark:bg-cyan-950/20 dark:border-cyan-500/30">
            <div className="flex items-center gap-2 text-cyan-950 dark:text-cyan-300 font-bold uppercase tracking-wider text-[11px]">
              <MessageSquare className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span>Contextual Item Q&A</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Ask targeted questions about &ldquo;{item.title}&rdquo;. Responses are grounded strictly in this item&apos;s transcript and document chunks.
            </p>

            {contextualAskQuery && (
              <div className="p-3 rounded-lg bg-[var(--surface-base)] border border-cyan-500/40 text-xs space-y-1">
                <span className="font-semibold text-cyan-600 dark:text-cyan-400 text-[10px] uppercase">
                  Contextual Query Target
                </span>
                <p className="italic text-[var(--text-primary)] font-mono text-[11px]">&ldquo;{contextualAskQuery}&rdquo;</p>
              </div>
            )}

            <Link
              href={contextualAskQuery ? `/items/${item.id}/ask?q=${encodeURIComponent(contextualAskQuery)}` : `/items/${item.id}/ask`}
              className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-[var(--action-primary-bg)] py-2.5 px-4 text-xs font-semibold text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] transition-colors shadow-xs"
            >
              <span>{contextualAskQuery ? "Launch Grounded Q&A" : "Open Ask AI Companion"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Tab 4: Rich Recall Memory Intelligence Companion */}
        <div
          id={recallPanelId}
          role="tabpanel"
          aria-labelledby={recallTabId}
          className={activeTab === "recall" ? "space-y-4" : "hidden"}
        >
          {isRecallImport || recallMemory.isRecall ? (
            <div className="space-y-4 text-xs">
              {/* Provenance Header Card */}
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 dark:bg-purple-950/20 dark:border-purple-800/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-purple-950 dark:text-purple-300 font-bold uppercase tracking-wider text-[11px]">
                    <Download className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>Imported Recall.it Memory</span>
                  </div>
                  {recallMemory.cardId && (
                    <span
                      title={`Full Recall Card ID: ${recallMemory.cardId}`}
                      className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700"
                    >
                      Card #{recallMemory.cardId.slice(0, 8)}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="pt-2 border-t border-purple-200/60 dark:border-purple-900/40 space-y-1.5">
                    <span className="text-[11px] font-bold text-purple-950 dark:text-purple-300">Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800 text-[11px] font-medium"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Key Takeaways & Highlights List */}
              {recallMemory.takeaways.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Key Highlights ({recallMemory.takeaways.length})
                  </span>

                  <div className="space-y-2">
                    {recallMemory.takeaways.map((takeaway) => {
                      const isPinned = pinnedTakeawayIds.has(takeaway.id);

                      return (
                        <div
                          key={takeaway.id}
                          className="group/takeaway flex items-start justify-between gap-3 p-3 rounded-xl border border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/60 hover:border-purple-300 dark:hover:border-purple-800 transition"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                              {takeaway.text}
                            </p>

                            {takeaway.timestampLabel && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (takeaway.timestampMs !== null) {
                                      onSeek?.(takeaway.timestampMs);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 transition cursor-pointer"
                                >
                                  <Clock className="h-2.5 w-2.5" />
                                  <span>⏱️ {takeaway.timestampLabel}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePinTakeaway(takeaway)}
                            disabled={isPinned}
                            title={isPinned ? "Pinned to Notes" : "Pin quote to Notes"}
                            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                              isPinned
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "text-zinc-400 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/40 dark:hover:text-purple-300"
                            }`}
                          >
                            {isPinned ? <Check className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sections & Chapters */}
              {recallMemory.sections.length > 0 && (
                <div className="space-y-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    <BookOpen className="h-3.5 w-3.5 text-purple-500" />
                    <span>Video Chapters & Topics</span>
                  </span>

                  <div className="space-y-1.5">
                    {recallMemory.sections.map((sec) => (
                      <div
                        key={sec.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/40 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition"
                      >
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate mr-2">
                          {sec.title}
                        </span>

                        {sec.timestampLabel && sec.timestampMs !== null && (
                          <button
                            type="button"
                            onClick={() => onSeek?.(sec.timestampMs!)}
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300 transition cursor-pointer"
                          >
                            <span>⏱️ {sec.timestampLabel}</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collapsible Verbatim Card View */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowRawRecall((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-300 transition cursor-pointer"
                >
                  {showRawRecall ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <span>{showRawRecall ? "Hide Raw Recall Content" : "View Full Raw Recall Body"}</span>
                </button>

                {showRawRecall && (
                  <div className="mt-2 p-3 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 font-mono text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300 max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {item.body}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
              <Download className="h-5 w-5 mx-auto mb-2 text-[var(--text-muted)]" />
              <span>This bookmark was captured directly without a Recall.it sync packet.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
