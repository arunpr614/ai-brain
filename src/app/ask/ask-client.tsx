"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { AskInput } from "@/components/ask-input";
import { ChatMessage } from "@/components/chat-message";
import type { AskScopeInfo, AskScopeKind } from "@/lib/ask/scope";
import { useAskStream, type AskRetrievedChunk } from "@/lib/client/use-ask-stream";

interface Turn {
  id: string;
  question: string;
  answer: string;
  chunks: AskRetrievedChunk[];
  errorCode?: string;
  errorMessage?: string;
}

export interface AskInitialMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  chunks?: AskRetrievedChunk[];
}

export interface AskHistoryThread {
  id: string;
  title: string;
  href: string;
  updatedAt: number;
  active?: boolean;
}

export interface AskDurableScope {
  scope: "library" | "item";
  itemId?: string;
}

export interface AskClientProps {
  /** Optional: restrict retrieval to a single item's chunks (per-item chat). */
  itemId?: string;
  /** Optional: restrict retrieval to selected library items. */
  itemIds?: string[];
  scopeLabel?: string;
  selectedTitles?: string[];
  scopeInfo?: AskScopeInfo;
  durableScope?: AskDurableScope;
  threadId?: string;
  initialMessages?: AskInitialMessage[];
  historyThreads?: AskHistoryThread[];
}

export function AskClient({
  itemId,
  itemIds,
  scopeLabel,
  selectedTitles = [],
  scopeInfo,
  durableScope,
  threadId,
  initialMessages = [],
  historyThreads = [],
}: AskClientProps = {}) {
  const stream = useAskStream();
  const [turns, setTurns] = useState<Turn[]>(() => messagesToTurns(initialMessages));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(threadId ?? null);
  const selectedIds = itemIds?.filter(Boolean) ?? [];
  const hasSelectedScope = selectedIds.length > 0;
  const effectiveScope =
    scopeInfo ??
    buildLegacyScopeInfo({
      itemId,
      hasSelectedScope,
      scopeLabel,
      selectedTitles,
    });

  const submit = async (question: string) => {
    const id = crypto.randomUUID();
    const ensuredThreadId = await ensureThread(question);
    setPendingId(id);
    setTurns((prev) => [
      ...prev,
      { id, question, answer: "", chunks: [] },
    ]);
    const result = await stream.ask(
      hasSelectedScope
        ? { question, scope: "items", item_ids: selectedIds, thread_id: ensuredThreadId ?? undefined }
        : itemId
          ? { question, scope: "item", item_id: itemId, thread_id: ensuredThreadId ?? undefined }
          : { question, thread_id: ensuredThreadId ?? undefined },
    );
    // Finalize turn from the resolved result (ask returns its accumulated
    // final values — don't read stream.answer from closure, which is stale).
    setTurns((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              answer: result.answer,
              chunks: result.chunks,
              errorCode: result.errorCode ?? undefined,
              errorMessage: result.errorMessage ?? undefined,
            }
          : t,
      ),
    );
    setPendingId(null);
  };

  const busy =
    stream.phase === "connecting" ||
    stream.phase === "retrieving" ||
    stream.phase === "streaming";

  async function ensureThread(question: string): Promise<string | null> {
    if (!durableScope) return null;
    if (activeThreadId) return activeThreadId;
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: question.trim().slice(0, 80),
          scope: durableScope.scope,
          item_id: durableScope.itemId,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { thread?: { id?: string } };
      const id = data.thread?.id ?? null;
      setActiveThreadId(id);
      if (id) {
        const href =
          durableScope.scope === "item" && durableScope.itemId
            ? `/items/${durableScope.itemId}/ask?thread=${id}`
            : `/ask?thread=${id}`;
        window.history.replaceState(null, "", href);
      }
      return id;
    } catch {
      return null;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
      <AskHistoryPanel threads={historyThreads} />
      <section className="flex min-w-0 flex-1 flex-col">
        <AskScopeBanner scope={effectiveScope} />
        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {turns.length === 0 && stream.phase === "idle" && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm text-[var(--text-secondary)]">
                {effectiveScope.label
                  ? `Ask a question across ${effectiveScope.label}.`
                  : "Ask a question and I'll search your library for the answer."}
              </p>
            </div>
          )}

          {turns.map((t, idx) => {
            const isLast = idx === turns.length - 1;
            const answer = isLast && pendingId === t.id ? stream.answer : t.answer;
            const chunks = isLast && pendingId === t.id ? stream.chunks : t.chunks;
            const errCode = isLast && pendingId === t.id ? stream.errorCode : t.errorCode;
            const errMsg = isLast && pendingId === t.id ? stream.errorMessage : t.errorMessage;
            return (
              <div key={t.id} className="space-y-2">
                <ChatMessage role="user" content={t.question} />
                {errCode ? (
                  <div className="mr-10 rounded-lg border border-[var(--danger)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
                    <div className="mb-1 text-[11px] font-medium uppercase tracking-wider">
                      Error · {errCode}
                    </div>
                    <p>{errMsg}</p>
                  </div>
                ) : (
                  <ChatMessage role="assistant" content={answer} chunks={chunks} />
                )}
              </div>
            );
          })}
        </div>

        <AskInput
          onSubmit={submit}
          onStop={stream.stop}
          busy={busy}
          autoFocus
        />
      </section>
    </div>
  );
}

function AskHistoryPanel({ threads }: { threads: AskHistoryThread[] }) {
  if (threads.length === 0) return null;
  return (
    <>
      <aside className="hidden w-60 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 md:block">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          History
        </div>
        <ThreadList threads={threads} />
      </aside>
      <details className="rounded-lg border border-[var(--border)] bg-[var(--surface)] md:hidden">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-[var(--text-primary)]">
          History
        </summary>
        <div className="border-t border-[var(--border)] p-3">
          <ThreadList threads={threads} />
        </div>
      </details>
    </>
  );
}

function ThreadList({ threads }: { threads: AskHistoryThread[] }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Ask history">
      {threads.slice(0, 12).map((thread) => (
        <Link
          key={thread.id}
          href={thread.href}
          aria-current={thread.active ? "page" : undefined}
          className={`rounded-md border px-2.5 py-2 text-sm ${
            thread.active
              ? "border-[var(--accent-9)] bg-[var(--accent-3)] text-[var(--accent-11)]"
              : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span className="block truncate">{thread.title}</span>
          <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
            {formatHistoryTime(thread.updatedAt)}
          </span>
        </Link>
      ))}
    </nav>
  );
}

function messagesToTurns(messages: AskInitialMessage[]): Turn[] {
  const turns: Turn[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      turns.push({
        id: message.id,
        question: message.content,
        answer: "",
        chunks: [],
      });
      continue;
    }
    if (message.role === "assistant") {
      const last = turns[turns.length - 1];
      if (last && last.answer.length === 0) {
        last.answer = message.content;
        last.chunks = message.chunks ?? [];
      } else {
        turns.push({
          id: message.id,
          question: "",
          answer: message.content,
          chunks: message.chunks ?? [],
        });
      }
    }
  }
  return turns;
}

function formatHistoryTime(ts: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function buildLegacyScopeInfo({
  itemId,
  hasSelectedScope,
  scopeLabel,
  selectedTitles,
}: {
  itemId?: string;
  hasSelectedScope: boolean;
  scopeLabel?: string;
  selectedTitles: string[];
}): AskScopeInfo {
  const kind: AskScopeKind = itemId ? "item" : hasSelectedScope ? "selected" : "library";
  return {
    kind,
    label:
      scopeLabel ??
      (itemId
        ? "this item"
        : hasSelectedScope
          ? `${selectedTitles.length} selected sources`
          : "all saved sources"),
    sourceCount: hasSelectedScope ? selectedTitles.length : itemId ? 1 : undefined,
    limitedCount: 0,
    sources: selectedTitles.map((title) => ({
      id: title,
      title,
      platform: "Source",
      quality: "Selected",
      limited: false,
      reason: null,
    })),
    limitedSources: [],
  };
}

function AskScopeBanner({ scope }: { scope: AskScopeInfo }) {
  const countLabel =
    typeof scope.sourceCount === "number"
      ? `${scope.sourceCount} ${scope.sourceCount === 1 ? "source" : "sources"}`
      : "Active scope";
  return (
    <section className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {scopeKindLabel(scope.kind)}
          </span>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {scope.label}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{countLabel}</span>
        </div>

        {scope.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {scope.sources.slice(0, 6).map((source) => (
              <span
                key={source.id}
                title={`${source.platform} · ${source.quality}`}
                className={`max-w-[240px] truncate rounded-full border bg-[var(--surface-raised)] px-2.5 py-1 text-xs ${
                  source.limited
                    ? "border-[var(--quality-needs-upgrade)] text-[var(--quality-needs-upgrade)]"
                    : "border-[var(--border)] text-[var(--text-secondary)]"
                }`}
              >
                {source.title}
              </span>
            ))}
            {scope.sources.length > 6 && (
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                +{scope.sources.length - 6} more
              </span>
            )}
          </div>
        )}

        {scope.limitedCount > 0 && (
          <div className="flex gap-2 rounded-md border border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--quality-needs-upgrade)]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <p>
              {scope.limitedCount} {scope.limitedCount === 1 ? "source may" : "sources may"} have limited text.
              {scope.limitedSources[0]?.reason ? ` ${scope.limitedSources[0].reason}.` : ""}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function scopeKindLabel(kind: AskScopeKind): string {
  switch (kind) {
    case "item":
      return "This item";
    case "selected":
      return "Selected";
    case "tag":
      return "Tag";
    case "topic":
      return "Topic";
    case "collection":
      return "Collection";
    case "library":
    default:
      return "All sources";
  }
}
