import type Database from "better-sqlite3";
import { getDb } from "./client";
import { encodeCursor, decodeCursor } from "@/lib/processing/cursor";
import { processingFilterHash, processingFilterSql } from "@/lib/processing/filters";
import { processingTimeWindow } from "@/lib/processing/time";
import type {
  ProcessingBoardGroupsDto,
  ProcessingFilters,
  ProcessingFiltersDto,
  ProcessingGroup,
  ProcessingGroupDto,
  ProcessingItemDto,
  ProcessingItemsDto,
  ProcessingSort,
  ProcessingSummaryDto,
  StatusCounts,
  WorkflowStatus,
} from "@/lib/processing/types";
import { getProcessingReadiness } from "./processing-readiness";

interface ItemDtoRow {
  id: string;
  title: string;
  excerpt: string | null;
  source_type: string;
  capture_source: string;
  capture_quality: string | null;
  captured_at: number;
  workflow_status: WorkflowStatus;
  workflow_version: number;
  workflow_enrolled_at: number;
  workflow_initialized_at: number | null;
  workflow_inbox_entered_at: number | null;
  workflow_inbox_episode_id: string | null;
  workflow_status_changed_at: number;
  workflow_current_done_entered_at: number | null;
  workflow_archived_at: number | null;
  workflow_last_event_uuid: string;
  sort_key: string | number;
}

const EMPTY_FILTERS: ProcessingFilters = { userTagIds: [], aiTopicIds: [], noUserTags: false, noAiTopics: false };

function zeroCounts(): StatusCounts {
  return { inbox: 0, todo: 0, in_progress: 0, done: 0 };
}

function statusCounts(db: Database.Database, where: string, params: unknown[]): StatusCounts {
  const result = zeroCounts();
  const rows = db.prepare(`SELECT workflow_status status,count(*) n FROM items i WHERE ${where} GROUP BY workflow_status`)
    .all(...params) as Array<{ status: WorkflowStatus; n: number }>;
  for (const row of rows) result[row.status] = row.n;
  return result;
}

function scalarCount(db: Database.Database, where: string, params: unknown[]): number {
  return (db.prepare(`SELECT count(*) n FROM items i WHERE ${where}`).get(...params) as { n: number }).n;
}

function preference(db: Database.Database) {
  const row = db.prepare("SELECT owner_timezone timezone,timezone_version version FROM processing_preferences WHERE singleton=1")
    .get() as { timezone: string | null; version: number };
  return { timezone: row.timezone ?? process.env.BRAIN_OWNER_TIMEZONE ?? "UTC", version: row.version };
}

function metricCount(db: Database.Database, kind: "added" | "processed", start: number, end: number): number {
  const condition = kind === "added"
    ? "e.event_type IN ('initialized','raw_initialized') AND e.origin IN ('capture','raw_guard')"
    : "e.origin='user' AND e.from_status='inbox' AND e.to_status!='inbox'";
  const distinct = kind === "processed" ? "count(DISTINCT e.item_id||':'||e.from_inbox_episode_id)" : "count(*)";
  return (db.prepare(`SELECT ${distinct} n FROM item_workflow_events e
    WHERE ${condition} AND e.occurred_at>=? AND e.occurred_at<?
      AND NOT EXISTS(SELECT 1 FROM item_workflow_events u WHERE u.undo_of_event_uuid=e.event_uuid)`)
    .get(start, end) as { n: number }).n;
}

function completedCount(db: Database.Database, start: number, end: number): number {
  return (db.prepare(`SELECT count(*) n FROM (
      SELECT e.item_id,min(e.occurred_at) completed_at
      FROM item_workflow_events e
      WHERE e.origin='user' AND e.to_status='done' AND (e.from_status IS NULL OR e.from_status!='done')
        AND NOT EXISTS(SELECT 1 FROM item_workflow_events u WHERE u.undo_of_event_uuid=e.event_uuid)
      GROUP BY e.item_id
    ) first_done WHERE completed_at>=? AND completed_at<?`).get(start, end) as { n: number }).n;
}

export function getProcessingSummary(filters: ProcessingFilters = EMPTY_FILTERS, asOfUtc = Date.now()): ProcessingSummaryDto {
  const db = getDb();
  const filter = processingFilterSql(filters);
  const active = "i.workflow_enrolled_at IS NOT NULL AND i.workflow_archived_at IS NULL";
  const archived = "i.workflow_enrolled_at IS NOT NULL AND i.workflow_archived_at IS NOT NULL";
  const totalByStatus = statusCounts(db, active, []);
  const matchingByStatus = statusCounts(db, `${active} AND ${filter.clause}`, filter.params);
  const archivedTotal = scalarCount(db, archived, []);
  const archivedMatching = scalarCount(db, `${archived} AND ${filter.clause}`, filter.params);
  const oldest = db.prepare(`SELECT workflow_inbox_entered_at entered FROM items i
    WHERE ${active} AND i.workflow_status='inbox' ORDER BY workflow_inbox_entered_at ASC,id ASC LIMIT 1`)
    .get() as { entered: number } | undefined;
  const pref = preference(db);
  const window = processingTimeWindow(pref.timezone, asOfUtc);
  return {
    totalByStatus, matchingByStatus, archivedTotal, archivedMatching,
    inboxNow: totalByStatus.inbox,
    oldestCurrentInboxEnteredAt: oldest?.entered ?? null,
    oldestCurrentInboxAgeMs: oldest ? Math.max(0, asOfUtc - oldest.entered) : null,
    processedToday: metricCount(db, "processed", window.todayStartUtc, asOfUtc + 1),
    processedWeekToDate: metricCount(db, "processed", window.weekStartUtc, asOfUtc + 1),
    completedToday: completedCount(db, window.todayStartUtc, asOfUtc + 1),
    completedWeekToDate: completedCount(db, window.weekStartUtc, asOfUtc + 1),
    addedToday: metricCount(db, "added", window.todayStartUtc, asOfUtc + 1),
    addedWeekToDate: metricCount(db, "added", window.weekStartUtc, asOfUtc + 1),
    window: {
      todayStartUtc: window.todayStartUtc, weekStartUtc: window.weekStartUtc,
      asOfUtc, timezone: pref.timezone, timezoneVersion: pref.version, weekStarts: "monday",
    },
  };
}

function sortSpec(view: "inbox" | "list" | "archived", sort: ProcessingSort) {
  if (view === "inbox") return { expression: "i.workflow_inbox_entered_at", direction: "ASC" as const };
  if (sort === "oldest_captured") return { expression: "i.captured_at", direction: "ASC" as const };
  if (sort === "newest_captured") return { expression: "i.captured_at", direction: "DESC" as const };
  if (sort === "title_asc") return { expression: "lower(i.title)", direction: "ASC" as const };
  if (sort === "title_desc") return { expression: "lower(i.title)", direction: "DESC" as const };
  if (sort === "source_type") return { expression: "i.source_type", direction: "ASC" as const };
  if (sort === "capture_channel") return { expression: "i.capture_source", direction: "ASC" as const };
  if (sort === "workflow_status") return { expression: "CASE i.workflow_status WHEN 'inbox' THEN 0 WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END", direction: "ASC" as const };
  if (view === "archived") return { expression: "i.workflow_archived_at", direction: "DESC" as const };
  return { expression: "CASE i.workflow_status WHEN 'inbox' THEN 0 WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END", direction: "ASC" as const };
}

function labelsFor(db: Database.Database, ids: string[]) {
  const tags = new Map<string, Array<{ id: string; label: string }>>();
  const topics = new Map<string, Array<{ id: string; label: string }>>();
  if (ids.length === 0) return { tags, topics };
  const marks = ids.map(() => "?").join(",");
  for (const row of db.prepare(`SELECT it.item_id,t.id,t.name label FROM item_tags it JOIN tags t ON t.id=it.tag_id
      WHERE t.kind='manual' AND it.item_id IN (${marks}) ORDER BY t.name COLLATE NOCASE,t.id`).all(...ids) as Array<{ item_id: string; id: string; label: string }>) {
    tags.set(row.item_id, [...(tags.get(row.item_id) ?? []), { id: row.id, label: row.label }]);
  }
  for (const row of db.prepare(`SELECT ip.item_id,t.id,t.name label FROM item_topics ip JOIN topics t ON t.id=ip.topic_id
      WHERE ip.item_id IN (${marks}) ORDER BY t.name COLLATE NOCASE,t.id`).all(...ids) as Array<{ item_id: string; id: string; label: string }>) {
    topics.set(row.item_id, [...(topics.get(row.item_id) ?? []), { id: row.id, label: row.label }]);
  }
  return { tags, topics };
}

function dto(row: ItemDtoRow, labels: ReturnType<typeof labelsFor>): ProcessingItemDto {
  return {
    itemId: row.id, title: row.title, excerpt: row.excerpt,
    sourceType: row.source_type, captureChannel: row.capture_source,
    captureQuality: row.capture_quality, capturedAt: row.captured_at,
    status: row.workflow_status, version: row.workflow_version,
    enrolledAt: row.workflow_enrolled_at, initializedAt: row.workflow_initialized_at,
    inboxEnteredAt: row.workflow_inbox_entered_at, inboxEpisodeId: row.workflow_inbox_episode_id,
    statusChangedAt: row.workflow_status_changed_at,
    currentDoneEnteredAt: row.workflow_current_done_entered_at,
    archivedAt: row.workflow_archived_at, lastEventUuid: row.workflow_last_event_uuid,
    userTags: labels.tags.get(row.id) ?? [], aiTopics: labels.topics.get(row.id) ?? [],
  };
}

function listWhere(view: "inbox" | "list" | "archived", status?: WorkflowStatus) {
  if (view === "archived") return "i.workflow_enrolled_at IS NOT NULL AND i.workflow_archived_at IS NOT NULL";
  const base = "i.workflow_enrolled_at IS NOT NULL AND i.workflow_archived_at IS NULL";
  if (view === "inbox") return `${base} AND i.workflow_status='inbox'`;
  return status ? `${base} AND i.workflow_status='${status}'` : base;
}

export function listProcessingItems(options: {
  view: "inbox" | "list" | "archived";
  status?: WorkflowStatus;
  sort: ProcessingSort;
  limit: number;
  cursor?: string;
  filters?: ProcessingFilters;
  extraClause?: string;
  extraParams?: unknown[];
  scopeSuffix?: string;
}): ProcessingItemsDto {
  const db = getDb();
  const filters = processingFilterSql(options.filters ?? EMPTY_FILTERS);
  const base = `${listWhere(options.view, options.status)}${options.extraClause ? ` AND (${options.extraClause})` : ""}`;
  const extraParams = options.extraParams ?? [];
  const matchingCount = scalarCount(db, `${base} AND ${filters.clause}`, [...extraParams, ...filters.params]);
  const totalCount = scalarCount(db, base, extraParams);
  const sort = sortSpec(options.view, options.sort);
  const readiness = getProcessingReadiness(db);
  const filterHash = processingFilterHash(filters.normalized);
  const scope = `${options.view}:${options.status ?? "all"}:${options.sort}:${options.scopeSuffix ?? ""}`;
  const expected = { scope, filterHash, workflowEpoch: readiness.workflowEpoch, taxonomyEpoch: readiness.taxonomyEpoch };
  const cursor = options.cursor ? decodeCursor(options.cursor, expected) : null;
  const comparator = sort.direction === "ASC" ? ">" : "<";
  const cursorClause = cursor ? `AND ((${sort.expression}) ${comparator} ? OR ((${sort.expression}) = ? AND i.id > ?))` : "";
  const queryParams = [...extraParams, ...filters.params];
  if (cursor) queryParams.push(cursor.primary, cursor.primary, cursor.id);
  queryParams.push(options.limit + 1);
  const rows = db.prepare(`SELECT i.id,i.title,
      substr(COALESCE(NULLIF(i.summary,''),NULLIF(i.description,''),i.body),1,240) excerpt,
      i.source_type,i.capture_source,i.capture_quality,i.captured_at,
      i.workflow_status,i.workflow_version,i.workflow_enrolled_at,i.workflow_initialized_at,
      i.workflow_inbox_entered_at,i.workflow_inbox_episode_id,i.workflow_status_changed_at,
      i.workflow_current_done_entered_at,i.workflow_archived_at,i.workflow_last_event_uuid,
      ${sort.expression} sort_key
    FROM items i WHERE ${base} AND ${filters.clause} ${cursorClause}
    ORDER BY ${sort.expression} ${sort.direction},i.id ASC LIMIT ?`).all(...queryParams) as ItemDtoRow[];
  const hasMore = rows.length > options.limit;
  const page = rows.slice(0, options.limit);
  const labels = labelsFor(db, page.map((row) => row.id));
  const last = page.at(-1);
  return {
    items: page.map((row) => dto(row, labels)), hasMore, matchingCount, totalCount,
    nextCursor: hasMore && last ? encodeCursor({ v: 1, ...expected, primary: last.sort_key, id: last.id }) : null,
  };
}

function groupExpression(group: ProcessingGroup, window: ReturnType<typeof processingTimeWindow>) {
  switch (group) {
    case "user_tag": return `COALESCE((SELECT t.id FROM item_tags git JOIN tags t ON t.id=git.tag_id
      WHERE git.item_id=i.id AND t.kind='manual' ORDER BY t.name COLLATE NOCASE,t.id LIMIT 1),'none')`;
    case "ai_topic": return `COALESCE((SELECT t.id FROM item_topics gip JOIN topics t ON t.id=gip.topic_id
      WHERE gip.item_id=i.id ORDER BY t.name COLLATE NOCASE,t.id LIMIT 1),'none')`;
    case "source_type": return "i.source_type";
    case "capture_channel": return "i.capture_source";
    case "capture_quality": return "COALESCE(i.capture_quality,'none')";
    case "capture_age": return `CASE WHEN i.captured_at>=${window.todayStartUtc} THEN 'today'
      WHEN i.captured_at>=${window.previous7StartUtc} THEN 'previous_7_days'
      WHEN i.captured_at>=${window.previous30StartUtc} THEN 'previous_30_days' ELSE 'older' END`;
    case "none": return "'all'";
    case "workflow_status": return "i.workflow_status";
  }
}

function groupOrderExpression(group: ProcessingGroup, keyExpression: string) {
  if (group === "user_tag") return `COALESCE((SELECT lower(t.name) FROM tags t WHERE t.id=(${keyExpression}) AND t.kind='manual'),'no user tags')`;
  if (group === "ai_topic") return `COALESCE((SELECT lower(t.name) FROM topics t WHERE t.id=(${keyExpression})),'no ai topics')`;
  if (group === "capture_age") return `CASE (${keyExpression}) WHEN 'today' THEN 0 WHEN 'previous_7_days' THEN 1 WHEN 'previous_30_days' THEN 2 ELSE 3 END`;
  return `lower(${keyExpression})`;
}

function groupLabel(db: Database.Database, group: ProcessingGroup, key: string): string {
  if (key === "none") return group === "user_tag" ? "No user tags" : group === "ai_topic" ? "No AI topics" : "Not specified";
  if (group === "user_tag") return (db.prepare("SELECT name FROM tags WHERE id=? AND kind='manual'").get(key) as { name: string } | undefined)?.name ?? "Unavailable tag";
  if (group === "ai_topic") return (db.prepare("SELECT name FROM topics WHERE id=?").get(key) as { name: string } | undefined)?.name ?? "Unavailable topic";
  const labels: Record<string, string> = { inbox: "Inbox", todo: "To Do", in_progress: "In Progress", done: "Done", all: "All sources", today: "Today", previous_7_days: "Previous 7 days", previous_30_days: "Previous 30 days", older: "Older" };
  return labels[key] ?? key.replaceAll("_", " ");
}

export function listProcessingBoardGroups(options: {
  group: ProcessingGroup;
  sort: ProcessingSort;
  limit: number;
  cursor?: string;
  filters?: ProcessingFilters;
  asOfUtc?: number;
}): ProcessingBoardGroupsDto {
  const db = getDb();
  const asOfUtc = options.asOfUtc ?? Date.now();
  const pref = preference(db);
  const window = processingTimeWindow(pref.timezone, asOfUtc);
  const filter = processingFilterSql(options.filters ?? EMPTY_FILTERS);
  const active = "i.workflow_enrolled_at IS NOT NULL AND i.workflow_archived_at IS NULL";
  if (options.group === "workflow_status") {
    const matching = statusCounts(db, `${active} AND ${filter.clause}`, filter.params);
    const total = statusCounts(db, active, []);
    const groups: ProcessingGroupDto[] = (["inbox","todo","in_progress","done"] as WorkflowStatus[]).map((key) => ({ key, label: groupLabel(db, options.group, key), matchingCount: matching[key], totalCount: total[key] }));
    return { groups, nextCursor: null, hasMore: false, group: options.group, sort: options.sort, asOfUtc };
  }
  const expr = groupExpression(options.group, window);
  const orderExpr = groupOrderExpression(options.group, expr);
  const readiness = getProcessingReadiness(db);
  const filterHash = processingFilterHash(filter.normalized);
  const expected = { scope: `groups:${options.group}:${options.sort}:${asOfUtc}`, filterHash, workflowEpoch: readiness.workflowEpoch, taxonomyEpoch: readiness.taxonomyEpoch };
  const cursor = options.cursor ? decodeCursor(options.cursor, expected) : null;
  const rows = db.prepare(`SELECT ${expr} group_key,${orderExpr} order_key,count(*) n FROM items i
    WHERE ${active} AND ${filter.clause} ${cursor ? `AND ((${orderExpr})>? OR ((${orderExpr})=? AND (${expr})>?))` : ""}
    GROUP BY group_key,order_key ORDER BY order_key ASC,group_key ASC LIMIT ?`)
    .all(...filter.params, ...(cursor ? [cursor.primary, cursor.primary, cursor.id] : []), options.limit + 1) as Array<{ group_key: string; order_key: string | number; n: number }>;
  const hasMore = rows.length > options.limit;
  const page = rows.slice(0, options.limit);
  const totalByKey = new Map<string, number>();
  if (page.length > 0) {
    const keys = page.map((row) => row.group_key);
    const totals = db.prepare(`SELECT ${expr} group_key,count(*) n FROM items i
      WHERE ${active} AND (${expr}) IN (${keys.map(() => "?").join(",")})
      GROUP BY group_key`).all(...keys) as Array<{ group_key: string; n: number }>;
    for (const total of totals) totalByKey.set(total.group_key, total.n);
  }
  const groups = page.map((row) => ({
    key: row.group_key,
    label: groupLabel(db, options.group, row.group_key),
    matchingCount: row.n,
    totalCount: totalByKey.get(row.group_key) ?? 0,
  }));
  const last = page.at(-1);
  return {
    groups, hasMore, group: options.group, sort: options.sort, asOfUtc,
    nextCursor: hasMore && last ? encodeCursor({ v: 1, ...expected, primary: last.order_key, id: last.group_key }) : null,
  };
}

export function listProcessingBoardItems(options: {
  group: ProcessingGroup;
  groupKey: string;
  sort: ProcessingSort;
  limit: number;
  cursor?: string;
  filters?: ProcessingFilters;
  asOfUtc?: number;
}) {
  const db = getDb();
  const pref = preference(db);
  const pinnedAsOfUtc = options.asOfUtc ?? Date.now();
  const window = processingTimeWindow(pref.timezone, pinnedAsOfUtc);
  const expression = groupExpression(options.group, window);
  return listProcessingItems({
    view: "list", sort: options.sort, limit: options.limit, cursor: options.cursor,
    filters: options.filters, extraClause: `(${expression})=?`, extraParams: [options.groupKey],
    scopeSuffix: `group:${options.group}:${options.groupKey}:asOf:${pinnedAsOfUtc}`,
  });
}

export function getProcessingFilters(): ProcessingFiltersDto {
  const db = getDb();
  const userTags = db.prepare(`SELECT t.id,t.name label,count(DISTINCT i.id) count
    FROM tags t LEFT JOIN item_tags it ON it.tag_id=t.id
    LEFT JOIN items i ON i.id=it.item_id AND i.workflow_enrolled_at IS NOT NULL AND i.workflow_archived_at IS NULL
    WHERE t.kind='manual' GROUP BY t.id,t.name ORDER BY t.name COLLATE NOCASE,t.id LIMIT 200`)
    .all() as ProcessingFiltersDto["userTags"];
  const aiTopics = db.prepare(`SELECT t.id,t.name label,count(DISTINCT i.id) count
    FROM topics t LEFT JOIN item_topics it ON it.topic_id=t.id
    LEFT JOIN items i ON i.id=it.item_id AND i.workflow_enrolled_at IS NOT NULL AND i.workflow_archived_at IS NULL
    GROUP BY t.id,t.name ORDER BY t.name COLLATE NOCASE,t.id LIMIT 200`)
    .all() as ProcessingFiltersDto["aiTopics"];
  return { userTags, aiTopics };
}
