import {
  WORKFLOW_STATUSES,
  type GroupDescriptor,
  type PageResult,
  type ProcessingFilters,
  type ProcessingItem,
  type ProcessingQuery,
  type ProcessingSummary,
  type StatusCounts,
  type UndoSlot,
  type WorkflowMutationResult,
  type WorkflowStatus,
} from "./types";
import type {
  ProcessingEnrollmentJobDto,
  ProcessingEnrollmentMode,
  ProcessingEnrollmentMutationDto,
} from "@/lib/processing/types";

const NO_STORE: RequestInit = { cache: "no-store", credentials: "same-origin" };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function string(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableStringOrNumber(value: unknown): string | number | null {
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function status(value: unknown): WorkflowStatus {
  return WORKFLOW_STATUSES.includes(value as WorkflowStatus)
    ? (value as WorkflowStatus)
    : "inbox";
}

function counts(value: unknown): StatusCounts {
  const raw = record(value);
  return {
    inbox: number(raw.inbox),
    todo: number(raw.todo),
    in_progress: number(raw.in_progress),
    done: number(raw.done),
  };
}

function taxonomy(value: unknown): Array<{ id: string; name: string }> {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const raw = record(entry);
        const id = string(raw.id);
        const name = string(raw.name ?? raw.label);
        return id && name ? [{ id, name }] : [];
      })
    : [];
}

export function normalizeItem(value: unknown): ProcessingItem {
  const raw = record(value);
  const workflow = record(raw.workflow ?? raw.projection);
  return {
    id: string(raw.id ?? raw.itemId),
    title: string(raw.title, "Untitled source"),
    excerpt:
      typeof raw.excerpt === "string"
        ? raw.excerpt
        : typeof raw.description === "string"
          ? raw.description
          : null,
    sourceType: string(raw.sourceType ?? raw.source_type, "source"),
    captureChannel:
      typeof (raw.captureChannel ?? raw.capture_source) === "string"
        ? String(raw.captureChannel ?? raw.capture_source)
        : null,
    captureQuality:
      typeof (raw.captureQuality ?? raw.capture_quality) === "string"
        ? String(raw.captureQuality ?? raw.capture_quality)
        : null,
    capturedAt: nullableStringOrNumber(raw.capturedAt ?? raw.captured_at) ?? Date.now(),
    workflowStatus: status(
      raw.workflowStatus ?? raw.workflow_status ?? raw.status ?? workflow.status ?? workflow.workflowStatus,
    ),
    workflowVersion: number(
      raw.workflowVersion ?? raw.workflow_version ?? raw.version ?? workflow.version ?? workflow.workflowVersion,
    ),
    inboxEnteredAt: nullableStringOrNumber(
      raw.inboxEnteredAt ?? raw.workflow_inbox_entered_at ?? workflow.inboxEnteredAt,
    ),
    archivedAt: nullableStringOrNumber(
      raw.archivedAt ?? raw.workflow_archived_at ?? workflow.archivedAt,
    ),
    userTags: taxonomy(raw.userTags ?? raw.user_tags),
    aiTopics: taxonomy(raw.aiTopics ?? raw.ai_topics ?? raw.topics),
  };
}

async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...NO_STORE, ...init });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const raw = record(body);
    const error = new Error(
      string(raw.message ?? record(raw.error).message, "Processing is temporarily unavailable."),
    );
    Object.assign(error, { status: response.status, code: raw.code ?? record(raw.error).code });
    throw error;
  }
  return body;
}

function queryParams(query: ProcessingQuery, cursor?: string | null): URLSearchParams {
  const params = new URLSearchParams({
    view: query.view,
    group: query.group,
    sort: query.view === "inbox" ? "workflow_default" : query.sort,
  });
  query.userTagIds.forEach((id) => params.append("userTagId", id));
  query.aiTopicIds.forEach((id) => params.append("aiTopicId", id));
  if (query.noUserTags) params.set("noUserTags", "1");
  if (query.noAiTopics) params.set("noAiTopics", "1");
  if (cursor) params.set("cursor", cursor);
  return params;
}

export async function fetchSummary(query: ProcessingQuery): Promise<ProcessingSummary> {
  const body = record(await requestJson(`/api/processing/summary?${queryParams(query)}`));
  const data = record(body.summary ?? body.data ?? body);
  const metrics = record(data.metrics);
  const today = record(metrics.today ?? data.today);
  const week = record(metrics.week ?? metrics.weekToDate ?? data.week);
  return {
    totalByStatus: counts(data.totalByStatus ?? data.totalsByStatus),
    matchingByStatus: counts(data.matchingByStatus ?? data.matchesByStatus),
    archivedTotal: number(data.archivedTotal ?? record(data.archived).total),
    archivedMatching: number(data.archivedMatching ?? record(data.archived).matching),
    inboxNow: number(data.inboxNow ?? record(data.inbox).count ?? counts(data.totalByStatus).inbox),
    oldestInboxAt: nullableStringOrNumber(
      data.oldestInboxAt ?? data.oldestInboxEnteredAt ?? data.oldestCurrentInboxEnteredAt ?? record(data.inbox).oldestAt,
    ),
    processedToday: number(data.processedToday ?? today.processed),
    processedWeekToDate: number(data.processedWeekToDate ?? week.processed),
    completedToday: number(data.completedToday ?? today.completed),
    completedWeekToDate: number(data.completedWeekToDate ?? week.completed),
    addedWeekToDate: number(data.addedWeekToDate ?? week.added),
    timezone: string(data.timezone ?? record(data.window).timezone ?? record(data.calendar).timezone, "UTC"),
  };
}

export async function fetchItems(query: ProcessingQuery, cursor?: string | null): Promise<PageResult> {
  const body = record(await requestJson(`/api/processing/items?${queryParams(query, cursor)}`));
  const data = record(body.data ?? body);
  const rawItems = Array.isArray(data.items) ? data.items : Array.isArray(body.items) ? body.items : [];
  return {
    items: rawItems.map(normalizeItem),
    nextCursor:
      typeof (data.nextCursor ?? data.next_cursor) === "string"
        ? String(data.nextCursor ?? data.next_cursor)
        : null,
    matchingCount: number(data.matchingCount ?? data.totalMatching ?? data.count),
    inboxTotal: number(data.inboxTotal ?? data.totalInbox),
  };
}

export async function fetchGroups(
  query: ProcessingQuery,
  cursor?: string | null,
  asOfUtc?: number | null,
): Promise<{ groups: GroupDescriptor[]; nextCursor: string | null; asOfUtc: number | null }> {
  const params = queryParams(query);
  params.delete("view");
  params.set("limit", "10");
  if (cursor) params.set("cursor", cursor);
  if (asOfUtc) params.set("asOfUtc", String(asOfUtc));
  const body = record(await requestJson(`/api/processing/board-groups?${params}`));
  const data = record(body.data ?? body);
  const rawGroups = Array.isArray(data.groups) ? data.groups : [];
  return {
    groups: rawGroups.map((value) => {
      const raw = record(value);
      return {
        key: string(raw.key ?? raw.groupKey),
        label: string(raw.label, "Group"),
        count: number(raw.count ?? raw.matchingCount),
        totalCount: typeof raw.totalCount === "number" ? raw.totalCount : undefined,
      };
    }),
    nextCursor: typeof data.nextCursor === "string" ? data.nextCursor : null,
    asOfUtc: typeof data.asOfUtc === "number" ? data.asOfUtc : asOfUtc ?? null,
  };
}

export async function fetchGroupItems(
  query: ProcessingQuery,
  groupKey: string,
  cursor?: string | null,
  asOfUtc?: number | null,
): Promise<PageResult> {
  const params = queryParams(query, cursor);
  params.delete("view");
  params.set("groupKey", groupKey);
  if (asOfUtc) params.set("asOfUtc", String(asOfUtc));
  const body = record(await requestJson(`/api/processing/board-items?${params}`));
  const data = record(body.data ?? body);
  const rawItems = Array.isArray(data.items) ? data.items : [];
  return {
    items: rawItems.map(normalizeItem),
    nextCursor: typeof data.nextCursor === "string" ? data.nextCursor : null,
    matchingCount: number(data.matchingCount ?? data.count),
    inboxTotal: number(data.inboxTotal),
  };
}

export async function fetchFilters(): Promise<ProcessingFilters> {
  const body = record(await requestJson("/api/processing/filters"));
  const data = record(body.data ?? body);
  const options = (value: unknown) =>
    Array.isArray(value)
      ? value.flatMap((entry) => {
          const raw = record(entry);
          const id = string(raw.id ?? raw.key);
          const label = string(raw.label ?? raw.name);
          return id && label ? [{ id, label, count: number(raw.count) }] : [];
        })
      : [];
  return {
    userTags: options(data.userTags ?? data.user_tags ?? data.tags),
    aiTopics: options(data.aiTopics ?? data.ai_topics ?? data.topics),
  };
}

export function actorTabId(): string {
  const key = "ai-brain-processing-actor-tab-id";
  const current = window.sessionStorage.getItem(key);
  if (current) return current;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

function normalizeSlot(value: unknown): UndoSlot | null {
  const raw = record(value);
  const itemId = string(raw.itemId ?? raw.item_id);
  const eventUuid = string(raw.eventUuid ?? raw.event_uuid ?? raw.targetEventUuid ?? raw.target_event_uuid);
  if (!itemId || !eventUuid) return null;
  return {
    itemId,
    itemTitle: string(raw.itemTitle ?? raw.title) || undefined,
    eventUuid,
    action: string(raw.action ?? raw.kind, "change"),
    expiresAt: nullableStringOrNumber(raw.expiresAt ?? raw.expires_at ?? raw.undoEligibleUntil) ?? Date.now() + 30_000,
    itemVersion: number(raw.itemVersion ?? raw.item_version ?? raw.workflowVersion),
  };
}

export async function mutateWorkflow(
  item: ProcessingItem,
  action:
    | { type: "move"; status: WorkflowStatus }
    | { type: "archive" }
    | { type: "restore" }
    | { type: "reprocess" },
): Promise<WorkflowMutationResult> {
  const mutationId = crypto.randomUUID();
  const body = await requestJson(`/api/items/${encodeURIComponent(item.id)}/workflow`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expectedVersion: item.workflowVersion,
      mutationId,
      actorTabId: actorTabId(),
      action,
    }),
  });
  const raw = record(body);
  const data = record(raw.data ?? raw);
  const receipt = record(data.receipt);
  const projection = record(data.item ?? data.projection);
  return {
    item: normalizeItem({
      ...item,
      ...projection,
      workflowStatus: projection.status ?? item.workflowStatus,
      workflowVersion: projection.version ?? item.workflowVersion,
      title: item.title,
      excerpt: item.excerpt,
      userTags: item.userTags,
      aiTopics: item.aiTopics,
    }),
    changed: data.changed !== false && string(data.outcome ?? receipt.outcomeClass ?? receipt.resultCode) !== "accepted_noop",
    outcome: string(data.outcome ?? receipt.resultCode ?? receipt.outcomeClass, "confirmed"),
    undoSlot: normalizeSlot(data.undoSlot ?? data.slot),
  };
}

export async function undoWorkflow(item: ProcessingItem, slot: UndoSlot): Promise<WorkflowMutationResult> {
  const body = await requestJson(`/api/items/${encodeURIComponent(item.id)}/workflow/undo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expectedVersion: item.workflowVersion,
      mutationId: crypto.randomUUID(),
      actorTabId: actorTabId(),
      targetEventUuid: slot.eventUuid,
    }),
  });
  const raw = record(body);
  const data = record(raw.data ?? raw);
  const projection = record(data.item ?? data.projection);
  return {
    item: normalizeItem({
      ...item,
      ...projection,
      workflowStatus: projection.status ?? item.workflowStatus,
      workflowVersion: projection.version ?? item.workflowVersion,
      title: item.title,
      excerpt: item.excerpt,
      userTags: item.userTags,
      aiTopics: item.aiTopics,
    }),
    changed: true,
    outcome: string(data.outcome ?? record(data.receipt).result, "undone"),
    undoSlot: normalizeSlot(data.undoSlot ?? data.slot),
  };
}

export async function startEnrollment(mode: ProcessingEnrollmentMode, selectedItemIds: string[] = []): Promise<ProcessingEnrollmentJobDto> {
  const body = record(await requestJson("/api/processing/enrollment/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, ...(mode === "selected" ? { selectedItemIds } : {}) }),
  }));
  return (body.job ?? record(body.data).job) as ProcessingEnrollmentJobDto;
}

export async function fetchEnrollmentJob(jobId: string): Promise<ProcessingEnrollmentJobDto> {
  const body = record(await requestJson(`/api/processing/enrollment/jobs/${encodeURIComponent(jobId)}`));
  return (body.job ?? record(body.data).job) as ProcessingEnrollmentJobDto;
}

export async function mutateEnrollmentJob(
  job: ProcessingEnrollmentJobDto,
  action: "confirm" | "cancel" | "retry",
): Promise<ProcessingEnrollmentMutationDto> {
  const body: Record<string, unknown> = {
    mutationId: crypto.randomUUID(),
    expectedVersion: job.version,
  };
  if (action === "confirm") body.frozenHash = job.frozenHash;
  return (await requestJson(`/api/processing/enrollment/jobs/${encodeURIComponent(job.id)}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })) as ProcessingEnrollmentMutationDto;
}
