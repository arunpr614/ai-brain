import { notebookLmRuntimeProviderWritesAllowed } from "@/db/notebooklm-export-control";

function enabled(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function notebookLmExportUiEnabled(): boolean {
  return enabled("BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED");
}

export function notebookLmExportQueueEnabled(): boolean {
  return (
    notebookLmExportUiEnabled() &&
    enabled("BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED") &&
    notebookLmRuntimeProviderWritesAllowed()
  );
}

export function notebookLmExportProviderWriteEnabled(): boolean {
  return notebookLmExportQueueEnabled() && enabled("BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED");
}
