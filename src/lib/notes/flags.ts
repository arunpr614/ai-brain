function enabled(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function manualNotesUiEnabled(): boolean {
  return enabled("MANUAL_NOTES_UI_ENABLED");
}

export function manualNotesWriteEnabled(): boolean {
  return enabled("MANUAL_NOTES_WRITE_ENABLED");
}

export function manualNotesWorkerEnabled(): boolean {
  return enabled("MANUAL_NOTES_WORKER_ENABLED");
}

export function noteFocusModeEnabled(): boolean {
  return enabled("NOTE_FOCUS_MODE_ENABLED");
}

/** Private note text may reach semantic providers only in the full rollout state. */
export function manualNotesSemanticProcessingEnabled(): boolean {
  return (
    manualNotesUiEnabled() &&
    manualNotesWriteEnabled() &&
    manualNotesWorkerEnabled()
  );
}
