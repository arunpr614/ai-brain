export function isUnsafeNoteNavigation(input: {
  journalWriteFailed: boolean;
  contentMarkdown: string;
  acknowledgedMarkdown: string;
}): boolean {
  return input.journalWriteFailed && input.contentMarkdown !== input.acknowledgedMarkdown;
}

export const UNSAFE_NOTE_NAVIGATION_MESSAGE =
  "Your latest note changes are only in this tab because device recovery failed. Cancel to keep editing, then retry Save or Copy the note. Leave this page only if you accept losing those latest changes.";
