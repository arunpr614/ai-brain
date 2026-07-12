export const MAX_ASK_SELECTED_ITEMS = 50;
export const MAX_PROCESSING_SELECTED_ITEMS = 100;

export interface AskSelectedActionState {
  disabled: boolean;
  label: string;
  title: string;
}

export function getAskSelectedActionState(count: number): AskSelectedActionState {
  if (count <= 0) {
    return {
      disabled: true,
      label: "Ask",
      title: "Select at least one source",
    };
  }

  if (count > MAX_ASK_SELECTED_ITEMS) {
    return {
      disabled: true,
      label: "Limit 50",
      title: `Ask up to ${MAX_ASK_SELECTED_ITEMS} selected sources at a time`,
    };
  }

  return {
    disabled: false,
    label: "Ask",
    title: "Ask selected sources",
  };
}

export interface ProcessingSelectedActionState {
  disabled: boolean;
  label: string;
  title: string;
}

export function getProcessingSelectedActionState(
  count: number,
): ProcessingSelectedActionState {
  if (count <= 0) {
    return {
      disabled: true,
      label: "Add to Inbox",
      title: "Select at least one source",
    };
  }
  if (count > MAX_PROCESSING_SELECTED_ITEMS) {
    return {
      disabled: true,
      label: "Limit 100",
      title: `Add up to ${MAX_PROCESSING_SELECTED_ITEMS} selected sources at a time`,
    };
  }
  return {
    disabled: false,
    label: "Add to Inbox",
    title: "Add selected sources directly to Processing Inbox",
  };
}

export function processingSelectedResultMessage(result: {
  addedCount: number;
  alreadyInProcessingCount: number;
  unavailableCount: number;
}): string {
  const parts: string[] = [];
  if (result.addedCount > 0) {
    parts.push(
      `Added ${result.addedCount} selected ${result.addedCount === 1 ? "source" : "sources"} to Processing Inbox.`,
    );
  }
  if (result.alreadyInProcessingCount > 0) {
    parts.push(
      `${result.alreadyInProcessingCount} ${result.alreadyInProcessingCount === 1 ? "is" : "are"} already in Processing.`,
    );
  }
  if (result.unavailableCount > 0) {
    parts.push(
      `${result.unavailableCount} ${result.unavailableCount === 1 ? "is" : "are"} no longer available.`,
    );
  }
  return parts.join(" ") || "Nothing changed.";
}

export function removeSubmittedSelection(
  current: ReadonlySet<string>,
  submittedIds: readonly string[],
): Set<string> {
  const submitted = new Set(submittedIds);
  return new Set([...current].filter((id) => !submitted.has(id)));
}
