import {
  createShareResultPayload,
  type AndroidShareResultPayload,
} from "../src/lib/android-share/result";

const now = Date.now();

const payloads: Record<string, AndroidShareResultPayload> = {
  saved_full: createShareResultPayload({
    state: "saved_full",
    sourceKind: "url",
    itemId: "share-result-full",
    quality: "full_text",
    now,
  }),
  saved_limited: createShareResultPayload({
    state: "saved_limited",
    sourceKind: "url",
    itemId: "share-result-limited",
    quality: "metadata_only",
    now,
  }),
  duplicate_existing: createShareResultPayload({
    state: "duplicate_existing",
    sourceKind: "url",
    existingItemId: "share-result-existing",
    now,
  }),
  updated_existing: createShareResultPayload({
    state: "updated_existing",
    sourceKind: "note",
    itemId: "share-result-updated",
    now,
  }),
  missing_token: createShareResultPayload({
    state: "missing_token",
    sourceKind: "unknown",
    errorCode: "missing_token",
    now,
  }),
  server_unreachable: createShareResultPayload({
    state: "server_unreachable",
    sourceKind: "url",
    errorCode: "url_capture_failed",
    now,
  }),
  url_capture_failed: createShareResultPayload({
    state: "url_capture_failed",
    sourceKind: "url",
    errorCode: "url_capture_failed",
    now,
  }),
  note_capture_failed: createShareResultPayload({
    state: "note_capture_failed",
    sourceKind: "note",
    errorCode: "note_capture_failed",
    now,
  }),
  pdf_read_failed: createShareResultPayload({
    state: "pdf_read_failed",
    sourceKind: "pdf",
    errorCode: "pdf_read_failed",
    now,
  }),
  pdf_checksum_failed: createShareResultPayload({
    state: "pdf_checksum_failed",
    sourceKind: "pdf",
    errorCode: "pdf_checksum_failed",
    now,
  }),
  pdf_upload_failed: createShareResultPayload({
    state: "pdf_upload_failed",
    sourceKind: "pdf",
    errorCode: "pdf_upload_failed",
    now,
  }),
  multi_pdf_rejected: createShareResultPayload({
    state: "multi_pdf_rejected",
    sourceKind: "pdf",
    errorCode: "multi_pdf_rejected",
    now,
  }),
  expired_result: createShareResultPayload({
    state: "expired_result",
    sourceKind: "unknown",
    now: now - 31 * 60 * 1000,
  }),
};

console.log(JSON.stringify({ generatedAt: now, payloads }, null, 2));
