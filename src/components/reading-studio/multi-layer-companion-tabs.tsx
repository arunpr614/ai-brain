"use client";

import { useState, useId, useMemo, type KeyboardEvent } from "react";
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

export interface MultiLayerCompanionTabsProps {
  item: ItemRow;
  topics: ItemTopicRow[];
  tags: TagRow[];
  parsedQuotes: string[];
  onSeek?: (timestampMs: number) => void;
}

export function MultiLayerCompanionTabs({
  item,
  topics,
  tags,
  parsedQuotes,
  onSeek,
}: MultiLayerCompanionTabsProps) {
  const isRecallImport = item.capture_source === "recall";
  const [activeTab, setActiveTab] = useState<"notes" | "ai" | "ask" | "recall">("notes");
  const [pinnedTakeawayIds, setPinnedTakeawayIds] = useState<Set<string>>(new Set());
  const [showRawRecall, setShowRawRecall] = useState(false);
  const id = useId();

  // Parse Recall memory from body and summary
  const recallMemory = useMemo(() => {
    return parseRecallMemory(item.body, item.summary);
  }, [item.body, item.summary]);

  // Listen for pinned quote events to auto-switch to Notes tab
  useNoteEventListener(item.id, () => {
    setActiveTab("notes");
  });

  const handlePinTakeaway = (takeaway: RecallParsedTakeaway) => {
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
  };

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
    <div className="flex flex-col h-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
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
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
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
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
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
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
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
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
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
              <div className="flex items-center gap-2 text-indigo-300 font-semibold uppercase tracking-wider text-[11px]">
                <Sparkles className="h-4 w-4" />
                <span>Executive Summary</span>
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
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 text-xs font-mono"
                  >
                    <Hash className="h-3 w-3" />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Quotes */}
          {parsedQuotes.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Key Quotes
              </span>
              <div className="space-y-2">
                {parsedQuotes.map((q, idx) => (
                  <blockquote
                    key={idx}
                    className="p-3 rounded-lg bg-[var(--surface)] border-l-2 border-indigo-400 text-xs text-[var(--text-secondary)] italic"
                  >
                    &ldquo;{q}&rdquo;
                  </blockquote>
                ))}
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
              Ask targeted questions about &ldquo;{item.title}&rdquo;. Responses are strictly grounded in this item&apos;s transcript and document chunks.
            </p>
            <Link
              href={`/items/${item.id}/ask`}
              className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-[var(--action-primary-bg)] py-2.5 px-4 text-xs font-semibold text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] transition-colors shadow-xs"
            >
              <span>Open Ask AI Companion</span>
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
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      <span>Key Takeaways & Highlights ({recallMemory.takeaways.length})</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {recallMemory.takeaways.map((takeaway) => {
                      const isPinned = pinnedTakeawayIds.has(takeaway.id);
                      return (
                        <div
                          key={takeaway.id}
                          className="group relative p-3 rounded-xl border border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/80 shadow-2xs hover:border-purple-300 dark:hover:border-purple-700/60 transition-all"
                        >
                          <p className="text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed pr-6">
                            {takeaway.text}
                          </p>

                          <div className="mt-2 flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px]">
                            {takeaway.timestampLabel && takeaway.timestampMs !== null ? (
                              <button
                                type="button"
                                onClick={() => onSeek?.(takeaway.timestampMs!)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border dark:border-purple-800/60 transition cursor-pointer"
                                title={`Seek video to ${takeaway.timestampLabel}`}
                              >
                                <Clock className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                                <span>{takeaway.timestampLabel}</span>
                              </button>
                            ) : (
                              <span className="text-zinc-400 text-[10px]">Recall Takeaway</span>
                            )}

                            <button
                              type="button"
                              onClick={() => handlePinTakeaway(takeaway)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition ${
                                isPinned
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "text-zinc-500 hover:text-purple-700 hover:bg-purple-50 dark:text-zinc-400 dark:hover:text-purple-300 dark:hover:bg-purple-950/40"
                              }`}
                              title="Pin this takeaway quote into your manual notes"
                            >
                              {isPinned ? (
                                <>
                                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                                  <span>Pinned</span>
                                </>
                              ) : (
                                <>
                                  <Pin className="h-2.5 w-2.5" />
                                  <span>Pin to Notes</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chapter Navigator / Sections Table of Contents */}
              {recallMemory.sections.length > 1 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
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
                  className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-300 transition"
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
