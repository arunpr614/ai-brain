"use client";

import {
  Archive,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  KanbanSquare,
  List,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Rows3,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchFilters,
  fetchGroupItems,
  fetchGroups,
  fetchItems,
  fetchSummary,
  undoWorkflow,
} from "./api";
import { ProcessingFilterBar } from "./filters";
import { EnrollmentDialog } from "./enrollment-dialog";
import { GroupSort } from "./group-sort";
import { ProcessingItemCard, relativeTime } from "./item-card";
import {
  STATUS_LABELS,
  WORKFLOW_STATUSES,
  type GroupDescriptor,
  type PageResult,
  type ProcessingFilters,
  type ProcessingGroup,
  type ProcessingItem,
  type ProcessingQuery,
  type ProcessingSort,
  type ProcessingSummary,
  type ProcessingView,
  type UndoSlot,
  type WorkflowMutationResult,
  type WorkflowStatus,
} from "./types";
import { ProcessingWriteContext, WorkflowControls } from "./workflow-controls";

const EMPTY_FILTERS: ProcessingFilters = { userTags: [], aiTopics: [] };
const NO_USER_TAGS = "__no_user_tags__";
const NO_AI_TOPICS = "__no_ai_topics__";
const VIEWS: Array<{ value: ProcessingView; label: string; icon: typeof Inbox }> = [
  { value: "inbox", label: "Inbox", icon: Inbox },
  { value: "board", label: "Board", icon: KanbanSquare },
  { value: "list", label: "List", icon: List },
  { value: "archived", label: "Archived", icon: Archive },
];

function parseView(value: string | null): ProcessingView {
  return VIEWS.some((view) => view.value === value) ? (value as ProcessingView) : "inbox";
}

function parseGroup(value: string | null): ProcessingGroup {
  const valid: ProcessingGroup[] = ["workflow_status", "user_tag", "ai_topic", "source_type", "capture_channel", "capture_quality", "capture_age", "none"];
  return valid.includes(value as ProcessingGroup) ? (value as ProcessingGroup) : "workflow_status";
}

function parseSort(value: string | null): ProcessingSort {
  const valid: ProcessingSort[] = ["workflow_default", "oldest_captured", "newest_captured", "title_asc", "title_desc", "workflow_status", "source_type", "capture_channel"];
  return valid.includes(value as ProcessingSort) ? (value as ProcessingSort) : "oldest_captured";
}

function queryFromParams(params: URLSearchParams): ProcessingQuery {
  return {
    view: parseView(params.get("view")),
    group: parseGroup(params.get("group")),
    sort: parseSort(params.get("sort")),
    userTagIds: params.getAll("userTag"),
    aiTopicIds: params.getAll("aiTopic"),
    noUserTags: params.get("noUserTags") === "1",
    noAiTopics: params.get("noAiTopics") === "1",
  };
}

function queryKey(query: ProcessingQuery): string {
  return JSON.stringify(query);
}

export function ProcessingApp({ writeEnabled }: { writeEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQueryState] = useState<ProcessingQuery>(() => queryFromParams(new URLSearchParams(searchParams.toString())));
  const [summary, setSummary] = useState<ProcessingSummary | null>(null);
  const [page, setPage] = useState<PageResult | null>(null);
  const [groups, setGroups] = useState<GroupDescriptor[]>([]);
  const [groupNextCursor, setGroupNextCursor] = useState<string | null>(null);
  const [groupAsOfUtc, setGroupAsOfUtc] = useState<number | null>(null);
  const [groupItems, setGroupItems] = useState<Record<string, PageResult>>({});
  const [groupPage, setGroupPage] = useState(0);
  const [mobileGroupKey, setMobileGroupKey] = useState("inbox");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [filterState, setFilterState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading Processing");
  const [alertMessage, setAlertMessage] = useState("");
  const [online, setOnline] = useState(true);
  const [undoSlot, setUndoSlot] = useState<UndoSlot | null>(null);
  const [undoItem, setUndoItem] = useState<ProcessingItem | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [undoExpired, setUndoExpired] = useState(false);
  const processNextAfterLoad = useRef(false);
  const pendingUrlQuery = useRef<string | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const emptyHeadingRef = useRef<HTMLHeadingElement>(null);

  const setQuery = useCallback(
    (next: ProcessingQuery, message?: string) => {
      setSelectedId(null);
      setGroupPage(0);
      setQueryState(next);
      pendingUrlQuery.current = queryKey(next);
      const params = new URLSearchParams();
      if (next.view !== "inbox") params.set("view", next.view);
      if (next.group !== "workflow_status") params.set("group", next.group);
      if (next.sort !== "oldest_captured") params.set("sort", next.sort);
      next.userTagIds.forEach((id) => params.append("userTag", id));
      next.aiTopicIds.forEach((id) => params.append("aiTopic", id));
      if (next.noUserTags) params.set("noUserTags", "1");
      if (next.noAiTopics) params.set("noAiTopics", "1");
      router.replace(params.size ? `/processing?${params}` : "/processing", { scroll: false });
      if (message) setStatusMessage(message);
    },
    [router],
  );

  useEffect(() => {
    const fromUrl = queryFromParams(new URLSearchParams(searchParams.toString()));
    const fromUrlKey = queryKey(fromUrl);
    if (pendingUrlQuery.current) {
      if (pendingUrlQuery.current === fromUrlKey) pendingUrlQuery.current = null;
      return;
    }
    if (fromUrlKey === queryKey(query)) return;
    queueMicrotask(() => {
      setSelectedId(null);
      setGroupPage(0);
      setQueryState(fromUrl);
      setStatusMessage("Processing view restored from navigation history.");
    });
  }, [query, searchParams]);

  const refreshSummary = useCallback(async () => {
    const next = await fetchSummary(query);
    setSummary(next);
    return next;
  }, [query]);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setAlertMessage("");
    try {
      const nextSummary = await refreshSummary();
      if (query.view === "board" || query.view === "list") {
        const groupResponse = await fetchGroups(query);
        setGroups(groupResponse.groups);
        setGroupNextCursor(groupResponse.nextCursor);
        setGroupAsOfUtc(groupResponse.asOfUtc);
        const visible = groupResponse.groups.slice(0, 10);
        const entries = await Promise.all(
          visible.map(async (group) => [group.key, await fetchGroupItems(query, group.key, null, groupResponse.asOfUtc)] as const),
        );
        setGroupItems(Object.fromEntries(entries));
        setPage(null);
        setMobileGroupKey((current) =>
          visible.some((group) => group.key === current)
            ? current
            : visible[0]?.key ?? "inbox",
        );
      } else {
        const result = await fetchItems(query);
        setPage(result);
        setGroups([]);
        setGroupNextCursor(null);
        setGroupAsOfUtc(null);
        setGroupItems({});
      }
      setStatusMessage(
        `${viewLabel(query.view)} loaded. ${matchingCount(nextSummary, query.view)} sources match.`,
      );
    } catch {
      setLoadError(true);
      setSummary(null);
      setPage(null);
      setGroups([]);
      setGroupNextCursor(null);
      setGroupAsOfUtc(null);
      setGroupItems({});
      setAlertMessage("Processing could not be loaded. Sources are unchanged.");
    } finally {
      setLoading(false);
    }
  }, [query, refreshSummary]);

  const loadFilterOptions = useCallback(async () => {
    setFilterState("loading");
    try {
      setFilters(await fetchFilters());
      setFilterState("ready");
    } catch {
      setFilterState("error");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadResults());
  }, [loadResults]);

  useEffect(() => {
    queueMicrotask(() => void loadFilterOptions());
  }, [loadFilterOptions]);

  useEffect(() => {
    if ((query.view !== "board" && query.view !== "list") || groupPage === 0) return;
    const needed = groups.slice(groupPage * 10, groupPage * 10 + 10).filter((group) => !groupItems[group.key]);
    if (needed.length === 0) return;
    queueMicrotask(() => {
      void Promise.all(needed.map(async (group) => [group.key, await fetchGroupItems(query, group.key, null, groupAsOfUtc)] as const))
        .then((entries) => setGroupItems((current) => ({ ...current, ...Object.fromEntries(entries) })))
        .catch(() => setAlertMessage("This group page could not be loaded. Earlier groups remain available."));
    });
  }, [groupAsOfUtc, groupItems, groupPage, groups, query]);

  useEffect(() => {
    if (query.view !== "board" || !mobileGroupKey || groupItems[mobileGroupKey]) return;
    queueMicrotask(() => {
      void fetchGroupItems(query, mobileGroupKey, null, groupAsOfUtc)
        .then((result) => setGroupItems((current) => ({ ...current, [mobileGroupKey]: result })))
        .catch(() => setAlertMessage("The selected Board group could not be loaded."));
    });
  }, [groupAsOfUtc, groupItems, mobileGroupKey, query]);

  useEffect(() => {
    const update = () => {
      const nowOnline = navigator.onLine;
      setOnline(nowOnline);
      setStatusMessage(nowOnline ? "Connection restored. Refreshing Processing." : "Offline. Loaded sources are available; changes are disabled.");
      if (nowOnline) void loadResults();
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [loadResults]);

  useEffect(() => {
    if (!undoSlot) return;
    const expiry = epochMs(undoSlot.expiresAt);
    const delay = Math.max(0, expiry - Date.now());
    const timer = window.setTimeout(() => {
      setUndoSlot(null);
      setUndoExpired(true);
      setStatusMessage("Undo is no longer available. The confirmed state remains; use Move, Restore, or Reprocess to make a new change.");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [undoSlot]);

  const visibleItems = useMemo(() => {
    if (query.view !== "board" && query.view !== "list") return page?.items ?? [];
    return Object.values(groupItems).flatMap((result) => result.items);
  }, [groupItems, page, query.view]);
  const selected = visibleItems.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!processNextAfterLoad.current || loading) return;
    processNextAfterLoad.current = false;
    const first = query.view === "board" ? null : page?.items[0] ?? null;
    window.setTimeout(() => {
      if (first) {
        setSelectedId(first.id);
        setStatusMessage(`${first.title} selected as the oldest matching Inbox source.`);
        document.getElementById("processing-decision-heading")?.focus();
      } else {
        emptyHeadingRef.current?.focus();
      }
    }, 0);
  }, [loading, page, query.view]);

  const processNext = () => {
    if (!online && visibleItems.length === 0) {
      setAlertMessage("Connect to load the next Inbox source.");
      return;
    }
    if (summary && summary.matchingByStatus.inbox === 0) {
      if (query.userTagIds.length + query.aiTopicIds.length > 0 || query.noUserTags || query.noAiTopics) {
        setStatusMessage("No Inbox sources match these filters.");
      } else {
        emptyHeadingRef.current?.focus();
        setStatusMessage("Processing Inbox is empty.");
      }
      return;
    }
    if (query.view === "inbox" && page?.items[0]) {
      const first = page.items[0];
      setSelectedId(first.id);
      setStatusMessage(`${first.title} selected as the oldest matching Inbox source.`);
      window.setTimeout(() => document.getElementById("processing-decision-heading")?.focus(), 0);
      return;
    }
    processNextAfterLoad.current = true;
    setQuery({ ...query, view: "inbox" }, "Opening the oldest matching Inbox source.");
  };

  const handleMutation = async (result: WorkflowMutationResult, message: string) => {
    setAlertMessage("");
    if (result.changed && result.undoSlot) {
      setUndoSlot(result.undoSlot);
      setUndoItem(result.item);
      setUndoExpired(false);
    }
    if (query.view === "inbox" && result.changed) processNextAfterLoad.current = true;
    await loadResults();
    setStatusMessage(message);
  };

  const handleMutationError = (message: string, kind: "error" | "conflict" | "unknown") => {
    setAlertMessage(message);
    setStatusMessage(kind === "unknown" ? "The saved outcome is being checked before another change is allowed." : "Sources remain at their last confirmed state.");
  };

  const handleUndo = async () => {
    if (!undoSlot || !undoItem || undoing) return;
    setUndoing(true);
    try {
      const result = await undoWorkflow(undoItem, undoSlot);
      setUndoSlot(null);
      setUndoItem(null);
      setStatusMessage(`${undoItem.title} was restored to its prior recorded state.`);
      await loadResults();
      setStatusMessage(`${undoItem.title} was restored to its prior recorded state.`);
      setSelectedId(result.item.id);
      window.setTimeout(() => document.getElementById(`processing-item-${result.item.id}`)?.focus(), 0);
    } catch (error) {
      const status = Number((error as { status?: number }).status);
      setAlertMessage(
        status === 410
          ? "Undo expired. The confirmed state remains; use a permanent workflow action instead."
          : status === 409
            ? "Undo was superseded by a newer confirmed change. Current state was preserved."
            : "Undo could not be confirmed. Refresh before trying a permanent reversal.",
      );
      if (status === 409 || status === 410) setUndoSlot(null);
    } finally {
      setUndoing(false);
    }
  };

  const loadMore = async () => {
    if (!page?.nextCursor || pageLoading) return;
    setPageLoading(true);
    try {
      const next = await fetchItems(query, page.nextCursor);
      setPage({ ...next, items: [...page.items, ...next.items] });
      setStatusMessage(`${next.items.length} more sources loaded.`);
    } catch {
      setAlertMessage("More sources could not be loaded. Existing sources remain available.");
    } finally {
      setPageLoading(false);
    }
  };

  const loadMoreGroup = async (groupKey: string) => {
    const current = groupItems[groupKey];
    if (!current?.nextCursor || pageLoading) return;
    setPageLoading(true);
    try {
      const next = await fetchGroupItems(query, groupKey, current.nextCursor, groupAsOfUtc);
      setGroupItems((value) => ({ ...value, [groupKey]: { ...next, items: [...current.items, ...next.items] } }));
      setStatusMessage(`${next.items.length} more sources loaded in ${groups.find((group) => group.key === groupKey)?.label ?? "group"}.`);
    } catch {
      setAlertMessage("More sources in this group could not be loaded.");
    } finally {
      setPageLoading(false);
    }
  };

  const showNextGroupPage = async () => {
    const nextStart = (groupPage + 1) * 10;
    if (nextStart < groups.length) {
      setGroupPage((value) => value + 1);
      return;
    }
    if (!groupNextCursor || pageLoading) return;
    setPageLoading(true);
    try {
      const next = await fetchGroups(query, groupNextCursor, groupAsOfUtc);
      setGroups((current) => [...current, ...next.groups]);
      setGroupNextCursor(next.nextCursor);
      setGroupAsOfUtc(next.asOfUtc);
      setGroupPage((value) => value + 1);
      setStatusMessage(`${next.groups.length} more Board groups loaded.`);
    } catch {
      setAlertMessage("More Board groups could not be loaded. Existing groups remain available.");
    } finally {
      setPageLoading(false);
    }
  };

  const loadMoreMobileGroups = async () => {
    if (!groupNextCursor || pageLoading) return;
    setPageLoading(true);
    try {
      const next = await fetchGroups(query, groupNextCursor, groupAsOfUtc);
      setGroups((current) => [...current, ...next.groups]);
      setGroupNextCursor(next.nextCursor);
      setGroupAsOfUtc(next.asOfUtc);
      setStatusMessage(`${next.groups.length} more Board group choices loaded.`);
    } catch {
      setAlertMessage("More Board group choices could not be loaded.");
    } finally {
      setPageLoading(false);
    }
  };

  const countCopy = summary
    ? query.view === "inbox"
      ? `${summary.matchingByStatus.inbox} sources match in Inbox · ${summary.inboxNow} total in Inbox`
      : query.view === "archived"
        ? `${summary.archivedMatching} archived sources match · ${summary.inboxNow} total in Inbox`
        : `${sumCounts(summary.matchingByStatus)} active sources match · ${summary.inboxNow} total in Inbox`
    : "Counts unavailable";

  return (
    <ProcessingWriteContext.Provider value={writeEnabled}>
    <div className="mx-auto min-h-full max-w-[1440px] px-4 pb-10 pt-6 sm:px-5 md:px-8 md:py-10 xl:px-10">
      <a href="#processing-results" className="sr-only z-50 rounded-md bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to Processing results
      </a>

      <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Workflow</p>
          <h1 className="mt-1 font-serif text-[34px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text-primary)] md:text-[42px]">Processing</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Decide what should happen next to each saved source. Your Library and notes stay intact.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start lg:self-auto">
          <EnrollmentDialog writeEnabled={writeEnabled} onComplete={() => void loadResults()} />
          <button type="button" onClick={processNext} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-semibold text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)]">
            Process next <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {!online && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-[var(--warning)] bg-[var(--surface)] p-3 text-sm text-[var(--text-secondary)]">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
          Offline. Loaded sources remain readable; workflow changes are disabled and never queued.
        </div>
      )}

      <Metrics summary={summary} loading={loading} />

      <div className="mt-6 flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1" aria-label="Processing view">
          {VIEWS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={query.view === value}
              onClick={() => setQuery({ ...query, view: value }, `${label} view selected.`)}
              className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1 text-[10px] font-semibold sm:gap-2 sm:px-3 sm:text-xs md:min-h-9 ${query.view === value ? "bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"}`}
            >
              <Icon className="h-4 w-4" /> {label}
              {summary && value === "inbox" && <span className="hidden rounded-full border border-current px-1.5 text-[10px] sm:inline">{summary.inboxNow > 99 ? "99+" : summary.inboxNow}</span>}
            </button>
          ))}
        </div>

        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{countCopy}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Counts reflect the full matching set, not only loaded rows.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ProcessingFilterBar
              filters={{
                userTags: [{ id: NO_USER_TAGS, label: "No User tags" }, ...filters.userTags],
                aiTopics: [{ id: NO_AI_TOPICS, label: "No AI Topics" }, ...filters.aiTopics],
              }}
              loading={filterState === "loading"}
              error={filterState === "error"}
              selectedUserTags={query.noUserTags ? [...query.userTagIds, NO_USER_TAGS] : query.userTagIds}
              selectedAiTopics={query.noAiTopics ? [...query.aiTopicIds, NO_AI_TOPICS] : query.aiTopicIds}
              onChange={(userTagIds, aiTopicIds) => setQuery({
                ...query,
                userTagIds: userTagIds.filter((id) => id !== NO_USER_TAGS),
                aiTopicIds: aiTopicIds.filter((id) => id !== NO_AI_TOPICS),
                noUserTags: userTagIds.includes(NO_USER_TAGS),
                noAiTopics: aiTopicIds.includes(NO_AI_TOPICS),
              }, "Filters updated.")}
              onRetry={() => void loadFilterOptions()}
            />
            {(query.view === "board" || query.view === "list") && (
              <GroupSort group={query.group} sort={query.sort} onApply={(group, sort) => setQuery({ ...query, group, sort }, "Group and sort updated.")} />
            )}
          </div>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">{statusMessage}</div>
      <div aria-live="assertive" className="sr-only">{alertMessage}</div>
      {alertMessage && (
        <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-md border border-[var(--danger)] bg-[var(--surface)] p-3 text-sm text-[var(--text-secondary)]">
          <span>{alertMessage}</span>
          <button type="button" onClick={() => void loadResults()} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 font-semibold text-[var(--text-primary)]"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
      )}

      {undoSlot && undoItem && (
        <aside className="sticky top-3 z-20 mt-4 flex flex-col gap-3 rounded-lg border border-[var(--control-selected-border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-md)] sm:flex-row sm:items-center sm:justify-between" aria-label="Undo latest Processing change">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{undoItem.title} changed.</p>
            <p className="text-xs text-[var(--text-secondary)]">Undo restores the prior recorded change. Available briefly.</p>
          </div>
          <button type="button" disabled={undoing} onClick={() => void handleUndo()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-semibold text-[var(--action-primary-fg)] disabled:opacity-50 md:min-h-9">
            {undoing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Undo
          </button>
        </aside>
      )}
      {undoExpired && <p className="mt-3 text-xs text-[var(--text-muted)]">The confirmed state remains. Move, Restore, or Reprocess always provides a permanent corrective path.</p>}

      <section id="processing-results" className="mt-6" aria-busy={loading}>
        <h2 ref={resultsHeadingRef} tabIndex={-1} className="sr-only">{viewLabel(query.view)} results</h2>
        {loading ? (
          <LoadingResults view={query.view} />
        ) : loadError ? (
          <LoadError onRetry={() => void loadResults()} />
        ) : query.view === "board" ? (
          <BoardView
            groups={groups}
            groupItems={groupItems}
            group={query.group}
            mobileGroupKey={mobileGroupKey}
            onMobileGroup={setMobileGroupKey}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onResult={(result, message) => void handleMutation(result, message)}
            onError={handleMutationError}
            onLoadMore={(key) => void loadMoreGroup(key)}
            pageLoading={pageLoading}
            summary={summary}
            groupPage={groupPage}
            onGroupPage={setGroupPage}
            hasMoreGroups={Boolean(groupNextCursor)}
            onNextGroups={() => void showNextGroupPage()}
            onLoadMoreMobileGroups={() => void loadMoreMobileGroups()}
          />
        ) : query.view === "list" ? (
          <GroupedListView
            groups={groups}
            groupItems={groupItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onResult={(result, message) => void handleMutation(result, message)}
            onError={handleMutationError}
            onLoadMore={(key) => void loadMoreGroup(key)}
            pageLoading={pageLoading}
            groupPage={groupPage}
            onGroupPage={setGroupPage}
            hasMoreGroups={Boolean(groupNextCursor)}
            onNextGroups={() => void showNextGroupPage()}
            groupMode={query.group}
          />
        ) : (page?.items.length ?? 0) === 0 ? (
          <EmptyResults ref={emptyHeadingRef} view={query.view} filtered={query.userTagIds.length + query.aiTopicIds.length > 0 || query.noUserTags || query.noAiTopics} onClear={() => setQuery({ ...query, userTagIds: [], aiTopicIds: [], noUserTags: false, noAiTopics: false }, "Filters cleared.")} />
        ) : query.view === "inbox" ? (
          <InboxView
            items={page?.items ?? []}
            selected={selected}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onResult={(result, message) => void handleMutation(result, message)}
            onError={handleMutationError}
            onLeave={(item) => {
              const currentIndex = page?.items.findIndex((row) => row.id === item.id) ?? -1;
              const next = page?.items[currentIndex + 1] ?? page?.items[0] ?? null;
              setSelectedId(next?.id === item.id ? null : next?.id ?? null);
              setStatusMessage(next ? `${item.title} left in Inbox. ${next.title} selected.` : `${item.title} left in Inbox. No other loaded source is waiting.`);
            }}
            onLoadMore={() => void loadMore()}
            nextCursor={page?.nextCursor ?? null}
            pageLoading={pageLoading}
          />
        ) : (
          <LinearView
            items={page?.items ?? []}
            view={query.view}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onResult={(result, message) => void handleMutation(result, message)}
            onError={handleMutationError}
            onLoadMore={() => void loadMore()}
            nextCursor={page?.nextCursor ?? null}
            pageLoading={pageLoading}
          />
        )}
      </section>
    </div>
    </ProcessingWriteContext.Provider>
  );
}

function Metrics({ summary, loading }: { summary: ProcessingSummary | null; loading: boolean }) {
  const unavailable = loading || !summary;
  return (
    <section className="mt-6 grid rounded-lg border border-[var(--border)] bg-[var(--surface)] sm:grid-cols-3" aria-label="Processing activity">
      <Metric label="Inbox now" primary={unavailable ? "—" : String(summary.inboxNow)} secondary={unavailable ? "Oldest unavailable" : summary.oldestInboxAt ? `Oldest ${relativeTime(summary.oldestInboxAt)}` : "Nothing waiting"} />
      <Metric label="Processed" primary={unavailable ? "—" : `${summary.processedWeekToDate} this week`} secondary={unavailable ? "Today unavailable" : `${summary.processedToday} today · ${summary.addedWeekToDate} added this week`} />
      <Metric label="Completed" primary={unavailable ? "—" : `${summary.completedWeekToDate} this week`} secondary={unavailable ? "Today unavailable" : `${summary.completedToday} today · Week starts Monday`} last />
      {!unavailable && <p className="col-span-full border-t border-[var(--border)] px-4 py-2 text-[11px] text-[var(--text-muted)]">Week starts Monday · {summary.timezone} · <Link href="/settings" className="font-medium text-[var(--accent-11)] hover:underline">Change timezone</Link></p>}
    </section>
  );
}

function Metric({ label, primary, secondary, last = false }: { label: string; primary: string; secondary: string; last?: boolean }) {
  return (
    <div className={`p-4 ${last ? "" : "border-b border-[var(--border)] sm:border-b-0 sm:border-r"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{primary}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{secondary}</p>
    </div>
  );
}

function InboxView(props: {
  items: ProcessingItem[];
  selected: ProcessingItem | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResult: (result: WorkflowMutationResult, message: string) => void;
  onError: (message: string, kind: "error" | "conflict" | "unknown") => void;
  onLeave: (item: ProcessingItem) => void;
  onLoadMore: () => void;
  nextCursor: string | null;
  pageLoading: boolean;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div>
        <ul className="space-y-3" aria-label="Inbox sources">
          {props.items.map((item) => (
            <ProcessingItemCard key={item.id} item={item} selected={props.selectedId === item.id} onSelect={() => props.onSelect(item.id)} onResult={props.onResult} onError={props.onError} dense />
          ))}
        </ul>
        <PaginationFooter nextCursor={props.nextCursor} loading={props.pageLoading} onLoadMore={props.onLoadMore} />
      </div>
      <aside className="hidden self-start rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 xl:sticky xl:top-6 xl:block" aria-label="Processing decision">
        {props.selected ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Decision context</p>
            <h2 id="processing-decision-heading" tabIndex={-1} className="mt-2 text-lg font-semibold leading-6 text-[var(--text-primary)]">{props.selected.title}</h2>
            {props.selected.excerpt && <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{props.selected.excerpt}</p>}
            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <WorkflowControls item={props.selected} onResult={props.onResult} onError={props.onError} />
              <button type="button" onClick={() => props.onLeave(props.selected!)} className="mt-2 min-h-9 w-full rounded-md border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)]">Leave in Inbox and continue</button>
              <Link href={`/items/${encodeURIComponent(props.selected.id)}?return=${encodeURIComponent("/processing")}&anchor=${encodeURIComponent(props.selected.id)}`} className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-md text-xs font-medium text-[var(--accent-11)] hover:underline">Open canonical detail</Link>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <Rows3 className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
            <h2 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Choose a source when you’re ready</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Select is separate from Open and Move. Nothing is preselected.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function LinearView(props: {
  items: ProcessingItem[];
  view: ProcessingView;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResult: (result: WorkflowMutationResult, message: string) => void;
  onError: (message: string, kind: "error" | "conflict" | "unknown") => void;
  onLoadMore: () => void;
  nextCursor: string | null;
  pageLoading: boolean;
}) {
  return (
    <div>
      <ul className="space-y-2" aria-label={`${viewLabel(props.view)} sources`}>
        {props.items.map((item) => (
          <ProcessingItemCard key={item.id} item={item} selected={props.selectedId === item.id} onSelect={() => props.onSelect(item.id)} onResult={props.onResult} onError={props.onError} dense />
        ))}
      </ul>
      <PaginationFooter nextCursor={props.nextCursor} loading={props.pageLoading} onLoadMore={props.onLoadMore} />
    </div>
  );
}

function GroupedListView(props: {
  groups: GroupDescriptor[];
  groupItems: Record<string, PageResult>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResult: (result: WorkflowMutationResult, message: string) => void;
  onError: (message: string, kind: "error" | "conflict" | "unknown") => void;
  onLoadMore: (key: string) => void;
  pageLoading: boolean;
  groupPage: number;
  onGroupPage: (page: number) => void;
  hasMoreGroups: boolean;
  onNextGroups: () => void;
  groupMode: ProcessingGroup;
}) {
  if (props.groups.length === 0) return <EmptyBoard />;
  const start = props.groupPage * 10;
  const visible = props.groups.slice(start, start + 10);
  return (
    <div className="space-y-5">
      {visible.map((group) => {
        const page = props.groupItems[group.key];
        return (
          <section key={group.key} aria-labelledby={`processing-list-group-${group.key}`} className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <h3 id={`processing-list-group-${group.key}`} tabIndex={-1} className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">
              <span>{groupDisplayLabel(group, props.groupMode)}</span><span className="text-xs font-normal text-[var(--text-muted)]">{group.count} {group.count === 1 ? "source" : "sources"}</span>
            </h3>
            {page?.items.length ? (
              <ul className="space-y-2 p-2">
                {page.items.map((item) => <ProcessingItemCard key={item.id} item={item} selected={props.selectedId === item.id} onSelect={() => props.onSelect(item.id)} onResult={props.onResult} onError={props.onError} dense />)}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">No matching sources</p>
            )}
            {page?.nextCursor && <button type="button" disabled={props.pageLoading} onClick={() => props.onLoadMore(group.key)} className="m-2 min-h-9 w-[calc(100%-1rem)] rounded-md border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] disabled:opacity-50">{props.pageLoading ? "Loading…" : `Load more in ${group.label}`}</button>}
          </section>
        );
      })}
      {(props.groups.length > 10 || props.hasMoreGroups) && (
        <nav className="flex items-center justify-between gap-3" aria-label="List group pages">
          <button type="button" disabled={props.groupPage === 0} onClick={() => props.onGroupPage(Math.max(0, props.groupPage - 1))} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[var(--border)] px-3 text-xs font-medium disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous groups</button>
          <span className="text-xs text-[var(--text-muted)]">{start + 1}–{Math.min(start + 10, props.groups.length)} of {props.groups.length}{props.hasMoreGroups ? "+" : ""}</span>
          <button type="button" disabled={start + 10 >= props.groups.length && !props.hasMoreGroups} onClick={props.onNextGroups} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[var(--border)] px-3 text-xs font-medium disabled:opacity-40">Next groups <ChevronRight className="h-4 w-4" /></button>
        </nav>
      )}
    </div>
  );
}

function BoardView(props: {
  groups: GroupDescriptor[];
  groupItems: Record<string, PageResult>;
  group: ProcessingGroup;
  mobileGroupKey: string;
  onMobileGroup: (key: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResult: (result: WorkflowMutationResult, message: string) => void;
  onError: (message: string, kind: "error" | "conflict" | "unknown") => void;
  onLoadMore: (key: string) => void;
  pageLoading: boolean;
  summary: ProcessingSummary | null;
  groupPage: number;
  onGroupPage: (page: number) => void;
  hasMoreGroups: boolean;
  onNextGroups: () => void;
  onLoadMoreMobileGroups: () => void;
}) {
  const start = props.groupPage * 10;
  const visible = props.groups.slice(start, start + 10);
  const mobile = props.groups.find((group) => group.key === props.mobileGroupKey) ?? props.groups[0];
  if (props.groups.length === 0) return <EmptyBoard />;
  return (
    <>
      <div className="md:hidden">
        {props.group === "workflow_status" ? (
          <div className="grid grid-cols-2 gap-2" aria-label="Board status">
            {WORKFLOW_STATUSES.map((status) => (
              <button key={status} type="button" aria-pressed={props.mobileGroupKey === status} onClick={() => props.onMobileGroup(status)} className={`min-h-11 rounded-md border px-3 text-xs font-semibold ${props.mobileGroupKey === status ? "border-[var(--control-selected-border)] bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"}`}>
                {STATUS_LABELS[status]} · {props.summary?.matchingByStatus[status] ?? 0}
              </button>
            ))}
          </div>
        ) : (
          <div><label className="block text-xs font-medium text-[var(--text-secondary)]">Board group
            <select value={mobile?.key ?? ""} onChange={(event) => props.onMobileGroup(event.currentTarget.value)} className="mt-1 min-h-11 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]">
              {props.groups.map((group) => <option key={group.key} value={group.key}>{groupDisplayLabel(group, props.group)} · {group.count}</option>)}
            </select>
          </label>{props.hasMoreGroups && <button type="button" disabled={props.pageLoading} onClick={props.onLoadMoreMobileGroups} className="mt-2 min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-primary)] disabled:opacity-50">{props.pageLoading ? "Loading group choices…" : "Load more group choices"}</button>}</div>
        )}
        {mobile && <BoardColumn {...props} group={mobile} groupMode={props.group} page={props.groupItems[mobile.key]} />}
      </div>
      <div className="hidden md:block">
        <div className={`grid items-start gap-3 ${props.group === "workflow_status" ? "lg:grid-cols-4" : "lg:grid-cols-3 xl:grid-cols-4"}`}>
          {visible.map((group) => <BoardColumn key={group.key} {...props} group={group} groupMode={props.group} page={props.groupItems[group.key]} />)}
        </div>
        {(props.groups.length > 10 || props.hasMoreGroups) && (
          <nav className="mt-5 flex items-center justify-between" aria-label="Board group pages">
            <button type="button" disabled={props.groupPage === 0} onClick={() => props.onGroupPage(Math.max(0, props.groupPage - 1))} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[var(--border)] px-3 text-xs font-medium disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous groups</button>
            <span className="text-xs text-[var(--text-muted)]">Groups {start + 1}–{Math.min(start + 10, props.groups.length)} of {props.groups.length}{props.hasMoreGroups ? "+" : ""}</span>
            <button type="button" disabled={start + 10 >= props.groups.length && !props.hasMoreGroups} onClick={props.onNextGroups} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[var(--border)] px-3 text-xs font-medium disabled:opacity-40">Next groups <ChevronRight className="h-4 w-4" /></button>
          </nav>
        )}
      </div>
    </>
  );
}

function BoardColumn({ group, groupMode, page, selectedId, onSelect, onResult, onError, onLoadMore, pageLoading }: {
  group: GroupDescriptor;
  groupMode: ProcessingGroup;
  page?: PageResult;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResult: (result: WorkflowMutationResult, message: string) => void;
  onError: (message: string, kind: "error" | "conflict" | "unknown") => void;
  onLoadMore: (key: string) => void;
  pageLoading: boolean;
}) {
  return (
    <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2 md:mt-0" aria-labelledby={`processing-group-${group.key}`}>
      <h3 id={`processing-group-${group.key}`} tabIndex={-1} className="flex items-center justify-between gap-2 px-2 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
        <span className="truncate">{groupDisplayLabel(group, groupMode)}</span><span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px]">{group.count}</span>
      </h3>
      {page?.items.length ? (
        <ul className="space-y-2">
          {page.items.map((item) => <ProcessingItemCard key={item.id} item={item} selected={selectedId === item.id} onSelect={() => onSelect(item.id)} onResult={onResult} onError={onError} dense />)}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-8 text-center text-xs text-[var(--text-muted)]">No matching sources</p>
      )}
      {page?.nextCursor && <button type="button" disabled={pageLoading} onClick={() => onLoadMore(group.key)} className="mt-2 min-h-9 w-full rounded-md border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)] disabled:opacity-50">{pageLoading ? "Loading…" : "Load more"}</button>}
    </section>
  );
}

function PaginationFooter({ nextCursor, loading, onLoadMore }: { nextCursor: string | null; loading: boolean; onLoadMore: () => void }) {
  return nextCursor ? (
    <button type="button" disabled={loading} onClick={onLoadMore} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] disabled:opacity-50 md:min-h-9">
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" />} {loading ? "Loading more…" : "Load more sources"}
    </button>
  ) : (
    <p className="mt-5 text-center text-xs text-[var(--text-muted)]">End of results</p>
  );
}

const EmptyResults = function EmptyResults({ view, filtered, onClear, ref }: { view: ProcessingView; filtered: boolean; onClear: () => void; ref: React.Ref<HTMLHeadingElement> }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center">
      <Inbox className="mx-auto h-7 w-7 text-[var(--text-muted)]" />
      <h2 ref={ref} tabIndex={-1} className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{filtered ? "No sources match these filters" : view === "archived" ? "Nothing is archived" : "Processing Inbox is clear"}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">{filtered ? "Your total Inbox is unchanged. Clear filters to return to all eligible sources." : view === "archived" ? "Done sources you archive from Processing will appear here." : "Capture a source when there is something new to decide, or browse your Library."}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {filtered && <button type="button" onClick={onClear} className="min-h-11 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)] md:min-h-9">Clear filters</button>}
        <Link href="/capture" className="inline-flex min-h-11 items-center rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)] md:min-h-9">Capture</Link>
        <Link href="/library" className="inline-flex min-h-11 items-center rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)] md:min-h-9">Browse Library</Link>
      </div>
    </div>
  );
};

function LoadingResults({ view }: { view: ProcessingView }) {
  return <div aria-label={`Loading ${viewLabel(view)}`} className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface)]" />)}</div>;
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return <div className="rounded-lg border border-[var(--danger)] bg-[var(--surface)] px-6 py-12 text-center"><h2 className="text-lg font-semibold text-[var(--text-primary)]">Processing is unavailable</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Sources are unchanged. Counts and metrics are unavailable rather than shown as zero.</p><button autoFocus type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-semibold text-[var(--action-primary-fg)] md:min-h-9"><RefreshCw className="h-4 w-4" /> Retry</button></div>;
}

function EmptyBoard() {
  return <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-[var(--text-muted)]" /><h2 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">No groups match</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Change filters or return to Inbox.</p></div>;
}

function matchingCount(summary: ProcessingSummary, view: ProcessingView): number {
  if (view === "inbox") return summary.matchingByStatus.inbox;
  if (view === "archived") return summary.archivedMatching;
  return sumCounts(summary.matchingByStatus);
}

function sumCounts(counts: Record<WorkflowStatus, number>): number {
  return WORKFLOW_STATUSES.reduce((sum, status) => sum + counts[status], 0);
}

function epochMs(value: string | number): number {
  const raw = typeof value === "number" ? value : Date.parse(value);
  return raw < 10_000_000_000 ? raw * 1000 : raw;
}

function viewLabel(view: ProcessingView): string {
  return VIEWS.find((entry) => entry.value === view)?.label ?? "Processing";
}

function groupDisplayLabel(group: GroupDescriptor, mode: ProcessingGroup): string {
  if (mode === "source_type") {
    const labels: Record<string, string> = { url: "Article", pdf: "PDF", youtube: "YouTube", note: "Note", telegram: "Telegram", podcast: "Podcast", epub: "EPUB", docx: "DOCX" };
    return labels[group.key] ?? group.label;
  }
  if ((mode === "capture_channel" || mode === "capture_quality") && /^[a-z0-9_]+$/.test(group.label)) {
    return group.label.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  return group.label;
}
