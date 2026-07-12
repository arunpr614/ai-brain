export const WORKFLOW_STATUSES = ["inbox", "todo", "in_progress", "done"] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const PROCESSING_GROUPS = [
  "workflow_status",
  "user_tag",
  "ai_topic",
  "source_type",
  "capture_channel",
  "capture_quality",
  "capture_age",
  "none",
] as const;
export type ProcessingGroup = (typeof PROCESSING_GROUPS)[number];

export const PROCESSING_SORTS = [
  "workflow_default",
  "oldest_captured",
  "newest_captured",
  "title_asc",
  "title_desc",
  "workflow_status",
  "source_type",
  "capture_channel",
] as const;
export type ProcessingSort = (typeof PROCESSING_SORTS)[number];

export interface ProcessingFilters {
  userTagIds: string[];
  aiTopicIds: string[];
  noUserTags: boolean;
  noAiTopics: boolean;
}

export interface WorkflowProjectionDto {
  itemId: string;
  status: WorkflowStatus;
  version: number;
  enrolledAt: number;
  initializedAt: number | null;
  inboxEnteredAt: number | null;
  inboxEpisodeId: string | null;
  statusChangedAt: number;
  currentDoneEnteredAt: number | null;
  archivedAt: number | null;
  lastEventUuid: string;
}

export interface ProcessingItemDto extends WorkflowProjectionDto {
  title: string;
  excerpt: string | null;
  sourceType: string;
  captureChannel: string;
  captureQuality: string | null;
  capturedAt: number;
  userTags: Array<{ id: string; label: string }>;
  aiTopics: Array<{ id: string; label: string }>;
}

export type StatusCounts = Record<WorkflowStatus, number>;

export interface ProcessingSummaryDto {
  totalByStatus: StatusCounts;
  matchingByStatus: StatusCounts;
  archivedTotal: number;
  archivedMatching: number;
  inboxNow: number;
  oldestCurrentInboxEnteredAt: number | null;
  oldestCurrentInboxAgeMs: number | null;
  processedToday: number;
  processedWeekToDate: number;
  completedToday: number;
  completedWeekToDate: number;
  addedToday: number;
  addedWeekToDate: number;
  window: {
    todayStartUtc: number;
    weekStartUtc: number;
    asOfUtc: number;
    timezone: string;
    timezoneVersion: number;
    weekStarts: "monday";
  };
}

export interface ProcessingItemsDto {
  items: ProcessingItemDto[];
  nextCursor: string | null;
  hasMore: boolean;
  matchingCount: number;
  totalCount: number;
}

export interface ProcessingGroupDto {
  key: string;
  label: string;
  matchingCount: number;
  totalCount: number;
}

export interface ProcessingBoardGroupsDto {
  groups: ProcessingGroupDto[];
  nextCursor: string | null;
  hasMore: boolean;
  group: ProcessingGroup;
  sort: ProcessingSort;
  asOfUtc: number;
}

export interface ProcessingFiltersDto {
  userTags: Array<{ id: string; label: string; count: number }>;
  aiTopics: Array<{ id: string; label: string; count: number }>;
}

export interface ProcessingUndoSlotDto {
  actorTabId: string;
  itemId: string;
  targetEventUuid: string;
  targetMutationId: string;
  confirmedAt: number;
  undoEligibleUntil: number;
  eligible: boolean;
}

export type ProcessingOutcomeClass = "accepted_effective" | "accepted_noop" | "rejected";

export interface ProcessingReceiptDto {
  mutationId: string;
  actionType: string;
  outcomeClass: ProcessingOutcomeClass;
  resultCode: string;
  acceptedEventUuid: string | null;
  acceptedItemVersion: number | null;
  observedItemVersion: number | null;
  confirmedAt: number | null;
  undoEligibleUntil: number | null;
  undoTargetEventUuid: string | null;
  createdAt: number;
}

export interface WorkflowMutationResponseDto {
  receipt: ProcessingReceiptDto;
  item: WorkflowProjectionDto | null;
  undoSlot: ProcessingUndoSlotDto | null;
  replayed: boolean;
}

export type WorkflowAction =
  | { type: "move"; status: WorkflowStatus }
  | { type: "archive" }
  | { type: "restore" }
  | { type: "reprocess" };

export interface WorkflowMutationRequest {
  mutationId: string;
  actorTabId: string;
  expectedVersion: number;
  action: WorkflowAction;
}

export interface WorkflowUndoRequest {
  mutationId: string;
  actorTabId: string;
  expectedVersion: number;
  targetEventUuid: string;
}

export interface ProcessingTimezoneDto {
  timezone: string | null;
  version: number;
}

export interface ProcessingTimezoneMutationDto {
  receipt: ProcessingReceiptDto;
  preference: ProcessingTimezoneDto;
  replayed: boolean;
}

export type ProcessingEnrollmentMode = "selected" | "recent" | "all";
export type ProcessingEnrollmentState = "previewing" | "preview_ready" | "confirmed" | "running" |
  "cancel_requested" | "completed" | "cancelled" | "failed" | "expired";

export interface ProcessingEnrollmentJobDto {
  id: string;
  version: number;
  mode: ProcessingEnrollmentMode;
  state: ProcessingEnrollmentState;
  previewAsOfUtc: number;
  recentStartUtc: number | null;
  ownerTimezone: string;
  timezoneVersion: number;
  frozenCount: number | null;
  recentOverflow: number | null;
  frozenHash: string | null;
  confirmedAt: number | null;
  processedCount: number;
  enrolledCount: number;
  alreadyEnrolledCount: number;
  deletedCount: number;
  attempts: number;
  errorCode: string | null;
  previewExpiresAt: number | null;
}

export interface ProcessingEnrollmentMutationDto {
  job: ProcessingEnrollmentJobDto;
  receipt: ProcessingReceiptDto | null;
  replayed: boolean;
}
