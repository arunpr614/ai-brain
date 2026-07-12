export const WORKFLOW_STATUSES = ["inbox", "todo", "in_progress", "done"] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];
export type ProcessingView = "inbox" | "board" | "list" | "archived";

export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  inbox: "Inbox",
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export type ProcessingGroup =
  | "workflow_status"
  | "user_tag"
  | "ai_topic"
  | "source_type"
  | "capture_channel"
  | "capture_quality"
  | "capture_age"
  | "none";

export type ProcessingSort =
  | "workflow_default"
  | "oldest_captured"
  | "newest_captured"
  | "title_asc"
  | "title_desc"
  | "workflow_status"
  | "source_type"
  | "capture_channel";

export interface StatusCounts {
  inbox: number;
  todo: number;
  in_progress: number;
  done: number;
}

export interface ProcessingSummary {
  totalByStatus: StatusCounts;
  matchingByStatus: StatusCounts;
  archivedTotal: number;
  archivedMatching: number;
  inboxNow: number;
  oldestInboxAt: string | number | null;
  processedToday: number;
  processedWeekToDate: number;
  completedToday: number;
  completedWeekToDate: number;
  addedWeekToDate: number;
  timezone: string;
}

export interface ProcessingItem {
  id: string;
  title: string;
  excerpt: string | null;
  sourceType: string;
  captureChannel: string | null;
  captureQuality: string | null;
  capturedAt: string | number;
  workflowStatus: WorkflowStatus;
  workflowVersion: number;
  inboxEnteredAt: string | number | null;
  archivedAt: string | number | null;
  userTags: Array<{ id: string; name: string }>;
  aiTopics: Array<{ id: string; name: string }>;
}

export interface GroupDescriptor {
  key: string;
  label: string;
  count: number;
  totalCount?: number;
}

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface ProcessingFilters {
  userTags: FilterOption[];
  aiTopics: FilterOption[];
}

export interface PageResult {
  items: ProcessingItem[];
  nextCursor: string | null;
  matchingCount: number;
  inboxTotal: number;
}

export interface UndoSlot {
  itemId: string;
  itemTitle?: string;
  eventUuid: string;
  action: string;
  expiresAt: string | number;
  itemVersion: number;
}

export interface WorkflowMutationResult {
  item: ProcessingItem;
  changed: boolean;
  outcome: string;
  undoSlot: UndoSlot | null;
}

export interface ProcessingQuery {
  view: ProcessingView;
  group: ProcessingGroup;
  sort: ProcessingSort;
  userTagIds: string[];
  aiTopicIds: string[];
  noUserTags: boolean;
  noAiTopics: boolean;
}
