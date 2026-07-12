import type { WorkflowAction, WorkflowStatus } from "./types";
import { newUuid } from "./crypto";

export interface WorkflowFacts {
  status: WorkflowStatus;
  archivedAt: number | null;
  inboxEnteredAt: number | null;
  inboxEpisodeId: string | null;
  statusChangedAt: number;
  currentDoneEnteredAt: number | null;
}

export interface TransitionDecision {
  kind: "effective" | "noop" | "ineligible";
  eventType?: "status_changed" | "archived" | "restored" | "reprocessed";
  resultCode: "moved" | "archived" | "restored" | "reprocessed" | "same_state" | "action_ineligible";
  next?: WorkflowFacts;
}

export function decideTransition(
  current: WorkflowFacts,
  action: WorkflowAction,
  now: number,
  episodeId: string = newUuid(),
): TransitionDecision {
  if (action.type === "move") {
    if (current.archivedAt !== null) return { kind: "ineligible", resultCode: "action_ineligible" };
    if (action.status === current.status) return { kind: "noop", resultCode: "same_state" };
    return {
      kind: "effective",
      eventType: "status_changed",
      resultCode: "moved",
      next: {
        status: action.status,
        archivedAt: null,
        inboxEnteredAt: action.status === "inbox" ? now : null,
        inboxEpisodeId: action.status === "inbox" ? episodeId : null,
        statusChangedAt: now,
        currentDoneEnteredAt: action.status === "done" ? now : null,
      },
    };
  }
  if (action.type === "archive") {
    if (current.status !== "done" || current.archivedAt !== null) {
      return { kind: "ineligible", resultCode: "action_ineligible" };
    }
    return {
      kind: "effective", eventType: "archived", resultCode: "archived",
      next: { ...current, archivedAt: now, statusChangedAt: now },
    };
  }
  if (action.type === "restore") {
    if (current.status !== "done" || current.archivedAt === null) {
      return { kind: "ineligible", resultCode: "action_ineligible" };
    }
    return {
      kind: "effective", eventType: "restored", resultCode: "restored",
      next: { ...current, archivedAt: null, statusChangedAt: now },
    };
  }
  if (current.archivedAt === null) return { kind: "ineligible", resultCode: "action_ineligible" };
  return {
    kind: "effective", eventType: "reprocessed", resultCode: "reprocessed",
    next: {
      status: "inbox", archivedAt: null, inboxEnteredAt: now,
      inboxEpisodeId: episodeId, statusChangedAt: now, currentDoneEnteredAt: null,
    },
  };
}
