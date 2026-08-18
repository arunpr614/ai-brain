"use client";

import { useState, useId, type KeyboardEvent } from "react";
import { Sparkles, Download, Pencil, Tag, Hash } from "lucide-react";
import { ManualNoteEditor } from "@/components/manual-note-editor";
import type { ItemRow } from "@/db/client";
import type { ItemTopicRow } from "@/db/topics";
import type { TagRow } from "@/db/tags";

export interface MultiLayerCompanionTabsProps {
  item: ItemRow;
  topics: ItemTopicRow[];
  tags: TagRow[];
  parsedQuotes: string[];
}

export function MultiLayerCompanionTabs({
  item,
  topics,
  tags,
  parsedQuotes,
}: MultiLayerCompanionTabsProps) {
  const isRecallImport = item.capture_source === "recall";
  const [activeTab, setActiveTab] = useState<"ai" | "recall" | "notes">("notes");
  const id = useId();

  const aiTabId = `${id}-ai-tab`;
  const recallTabId = `${id}-recall-tab`;
  const notesTabId = `${id}-notes-tab`;

  const aiPanelId = `${id}-ai-panel`;
  const recallPanelId = `${id}-recall-panel`;
  const notesPanelId = `${id}-notes-panel`;

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const tabs: Array<"ai" | "recall" | "notes"> = isRecallImport
      ? ["notes", "ai", "recall"]
      : ["notes", "ai"];

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
          className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-950 p-1 border border-zinc-800"
        >
          {/* Notes Tab */}
          <button
            id={notesTabId}
            type="button"
            role="tab"
            aria-selected={activeTab === "notes"}
            aria-controls={notesPanelId}
            tabIndex={activeTab === "notes" ? 0 : -1}
            onClick={() => setActiveTab("notes")}
            onKeyDown={onTabKeyDown}
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
              activeTab === "notes"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Pencil className="h-3.5 w-3.5 text-emerald-400" />
            <span>My Notes</span>
          </button>

          {/* AI Brief Tab */}
          <button
            id={aiTabId}
            type="button"
            role="tab"
            aria-selected={activeTab === "ai"}
            aria-controls={aiPanelId}
            tabIndex={activeTab === "ai" ? 0 : -1}
            onClick={() => setActiveTab("ai")}
            onKeyDown={onTabKeyDown}
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
              activeTab === "ai"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>AI Brief</span>
          </button>

          {/* Recall Sync Tab */}
          <button
            id={recallTabId}
            type="button"
            role="tab"
            aria-selected={activeTab === "recall"}
            aria-controls={recallPanelId}
            tabIndex={activeTab === "recall" ? 0 : -1}
            onClick={() => setActiveTab("recall")}
            onKeyDown={onTabKeyDown}
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
              activeTab === "recall"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Download className="h-3.5 w-3.5 text-purple-400" />
            <span>Recall</span>
            {isRecallImport && <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>}
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
              <p className="leading-relaxed text-zinc-200 text-sm whitespace-pre-line">{item.summary}</p>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 text-center text-xs text-zinc-400">
              <Sparkles className="h-5 w-5 mx-auto mb-2 text-zinc-600" />
              <span>AI synthesis will generate structured takeaways once indexed.</span>
            </div>
          )}

          {/* AI Concept Topics */}
          {topics.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
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
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Key Quotes
              </span>
              <div className="space-y-2">
                {parsedQuotes.map((q, idx) => (
                  <blockquote
                    key={idx}
                    className="p-3 rounded-lg bg-zinc-900 border-l-2 border-indigo-400 text-xs text-zinc-300 italic"
                  >
                    &ldquo;{q}&rdquo;
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab 3: Recall Sync Memory */}
        <div
          id={recallPanelId}
          role="tabpanel"
          aria-labelledby={recallTabId}
          className={activeTab === "recall" ? "space-y-4" : "hidden"}
        >
          {isRecallImport ? (
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-300 font-semibold uppercase tracking-wider text-[11px]">
                  <Download className="h-4 w-4" />
                  <span>Imported Recall.it Memory</span>
                </div>
              </div>

              {tags.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-purple-900/40">
                  <span className="text-[11px] font-semibold text-purple-300">Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800 text-[11px]"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 text-center text-xs text-zinc-400">
              <Download className="h-5 w-5 mx-auto mb-2 text-zinc-600" />
              <span>This bookmark was captured directly without a Recall.it sync packet.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
