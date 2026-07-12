import { z } from "zod";
import { PROCESSING_GROUPS, PROCESSING_SORTS, WORKFLOW_STATUSES } from "./types";

const opaqueId = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const itemIdSchema = opaqueId;
export const enrollmentJobIdSchema = z.string().uuid();
export const workflowSurfaceSchema = z.enum(["inbox", "board", "list", "archived", "detail"]);
export const mutationIdSchema = z.string().uuid();
export const actorTabIdSchema = z.string().min(32).max(64).regex(/^[A-Za-z0-9-]+$/);
export const eventUuidSchema = z.string().uuid();

export const workflowMutationSchema = z.object({
  mutationId: mutationIdSchema,
  actorTabId: actorTabIdSchema,
  expectedVersion: z.number().int().positive(),
  action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("move"), status: z.enum(WORKFLOW_STATUSES) }).strict(),
    z.object({ type: z.literal("archive") }).strict(),
    z.object({ type: z.literal("restore") }).strict(),
    z.object({ type: z.literal("reprocess") }).strict(),
  ]),
}).strict();

export const workflowUndoSchema = z.object({
  mutationId: mutationIdSchema,
  actorTabId: actorTabIdSchema,
  expectedVersion: z.number().int().positive(),
  targetEventUuid: eventUuidSchema,
}).strict();

export const timezoneMutationSchema = z.object({
  timezone: z.string().min(1).max(128),
  expectedVersion: z.number().int().nonnegative(),
  mutationId: mutationIdSchema,
}).strict();

export const enrollmentPreviewSchema = z.object({
  requestId: mutationIdSchema.optional(),
  mode: z.enum(["selected", "recent", "all"]),
  selectedItemIds: z.array(opaqueId).max(100).optional(),
}).strict().superRefine((value, context) => {
  if (value.mode === "selected" && (!value.selectedItemIds || value.selectedItemIds.length === 0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "selected items required" });
  }
  if (value.mode !== "selected" && value.selectedItemIds !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "selected items not allowed" });
  }
  if (value.mode !== "selected" && value.requestId !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "request id is only allowed for selected items" });
  }
});

export const enrollmentConfirmSchema = z.object({
  mutationId: mutationIdSchema,
  expectedVersion: z.number().int().nonnegative(),
  frozenHash: z.string().length(64).regex(/^[a-f0-9]+$/),
}).strict();

export const enrollmentActionSchema = z.object({
  mutationId: mutationIdSchema,
  expectedVersion: z.number().int().nonnegative(),
}).strict();

export const normalizedFiltersSchema = z.object({
  userTagIds: z.array(opaqueId).max(20).default([]),
  aiTopicIds: z.array(opaqueId).max(20).default([]),
  noUserTags: z.boolean().default(false),
  noAiTopics: z.boolean().default(false),
}).strict();

export const listQuerySchema = z.object({
  view: z.enum(["inbox", "list", "archived"]).default("inbox"),
  status: z.enum(WORKFLOW_STATUSES).optional(),
  sort: z.enum(PROCESSING_SORTS).default("workflow_default"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(2048).optional(),
});

export const boardGroupsQuerySchema = z.object({
  group: z.enum(PROCESSING_GROUPS).default("workflow_status"),
  sort: z.enum(PROCESSING_SORTS).default("oldest_captured"),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  cursor: z.string().max(2048).optional(),
  asOfUtc: z.coerce.number().int().nonnegative().optional(),
});

export const boardItemsQuerySchema = z.object({
  group: z.enum(PROCESSING_GROUPS),
  groupKey: z.string().min(1).max(128),
  sort: z.enum(PROCESSING_SORTS).default("oldest_captured"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(2048).optional(),
  asOfUtc: z.coerce.number().int().nonnegative().optional(),
});

export function parseFilterParams(params: URLSearchParams) {
  return normalizedFiltersSchema.parse({
    userTagIds: params.getAll("userTagId"),
    aiTopicIds: params.getAll("aiTopicId"),
    noUserTags: params.get("noUserTags") === "1",
    noAiTopics: params.get("noAiTopics") === "1",
  });
}
