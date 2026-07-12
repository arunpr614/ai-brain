import { getProcessingReadiness } from "@/db/processing-readiness";

export function processingReadConfigured(): boolean {
  return process.env.PROCESSING_READ_ENABLED === "1";
}

export function processingWriteConfigured(): boolean {
  return processingReadConfigured() && process.env.PROCESSING_WRITE_ENABLED === "1";
}

export function processingNavigationConfigured(): boolean {
  return processingReadConfigured() && process.env.PROCESSING_NAV_ENABLED === "1";
}

/** Effective server-side gates: one singleton PK read, never a deep audit. */
export function processingReadEnabled(): boolean {
  return processingReadConfigured() && getProcessingReadiness().ready;
}

export function processingWriteEnabled(): boolean {
  return processingWriteConfigured() && getProcessingReadiness().ready;
}

export function processingNavigationEnabled(): boolean {
  return processingNavigationConfigured() && getProcessingReadiness().ready;
}
