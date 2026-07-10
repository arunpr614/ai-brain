export type QueuedNoteOperation = "save" | "clear" | "recreate";

export interface QueuedNoteSave {
  manual: boolean;
  operation: QueuedNoteOperation;
}

/**
 * Coalesce work behind one in-flight request. The newest operation wins so a
 * post-clear edit becomes a normal save, while any explicit Save intent is
 * retained for the revision checkpoint applied to the newest content.
 */
export function mergeQueuedNoteSave(
  current: QueuedNoteSave | null,
  next: QueuedNoteSave,
): QueuedNoteSave {
  return {
    manual: Boolean(current?.manual || next.manual),
    operation: next.operation,
  };
}
