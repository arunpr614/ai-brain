import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyNativeSharePayload,
  createShareResultPayload,
  isCaptureStateMapped,
  loadShareResult,
  mapCaptureFailureToShareResult,
  mapCaptureResponseToShareResult,
  resultForPreflight,
  sanitizeShareLogMessage,
  shareResultActions,
  storeShareResult,
  type AndroidShareResultPayload,
  type StorageLike,
} from "./result";
import type { CaptureResultState } from "@/lib/capture/result";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const NOW = 1_800_000_000_000;

function captureResult(state: CaptureResultState, itemId = "item_123") {
  return {
    capture_result: {
      state,
      itemId,
      existingItemId: state === "duplicate_existing" ? itemId : null,
      sourcePlatform: "web",
      capturedVia: "android",
      quality: state.includes("metadata") ? "metadata_only" : "full_text",
      warningCode: null,
      recommendedAction: "open_item",
      message: "ok",
    },
  };
}

describe("Android share payload classification", () => {
  it("rejects multi-PDF before single file processing", () => {
    const result = classifyNativeSharePayload({
      files: [
        { uri: "content://one", mimeType: "application/pdf", name: "one.pdf" },
        { uri: "content://two", mimeType: "application/pdf", name: "two.pdf" },
      ],
    });
    assert.deepEqual(result, { kind: "multi_pdf", sourceKind: "pdf", pdfCount: 2 });
  });

  it("prefers a single PDF over mixed text", () => {
    const result = classifyNativeSharePayload({
      texts: ["https://example.com/article"],
      files: [{ uri: "content://one", mimeType: "application/pdf", name: "one.pdf" }],
    });
    assert.equal(result.kind, "pdf");
  });

  it("classifies URL, note, and unsupported shares", () => {
    assert.equal(
      classifyNativeSharePayload({ texts: ["https://example.com/a"] }).kind,
      "url",
    );
    assert.equal(classifyNativeSharePayload({ texts: ["plain note"] }).kind, "note");
    assert.equal(classifyNativeSharePayload({ texts: [] }).kind, "unsupported");
  });
});

describe("Android share preflight", () => {
  it("multi-PDF wins before missing token", () => {
    const classification = classifyNativeSharePayload({
      files: [
        { uri: "content://one", mimeType: "application/pdf" },
        { uri: "content://two", mimeType: "application/pdf" },
      ],
    });
    assert.equal(resultForPreflight(classification, false, NOW)?.state, "multi_pdf_rejected");
  });

  it("returns missing token and PDF missing URI states", () => {
    assert.equal(
      resultForPreflight(classifyNativeSharePayload({ texts: ["note"] }), false, NOW)?.state,
      "missing_token",
    );
    assert.equal(
      resultForPreflight(
        classifyNativeSharePayload({ files: [{ mimeType: "application/pdf" }] }),
        true,
        NOW,
      )?.state,
      "pdf_missing_uri",
    );
  });
});

describe("capture response mapping", () => {
  it("maps every current CaptureResultState", () => {
    const states: CaptureResultState[] = [
      "created_full_text",
      "created_transcript",
      "created_preview_only",
      "created_metadata_only",
      "created_needs_upgrade",
      "duplicate_existing",
      "updated_existing",
      "error_with_saved_item",
      "failed_without_saved_item",
    ];
    for (const state of states) assert.equal(isCaptureStateMapped(state), true, state);
  });

  it("maps readable states to saved_full", () => {
    assert.equal(
      mapCaptureResponseToShareResult(captureResult("created_full_text"), "url", NOW).state,
      "saved_full",
    );
    assert.equal(
      mapCaptureResponseToShareResult(captureResult("created_transcript"), "pdf", NOW).state,
      "saved_full",
    );
  });

  it("maps weak states to saved_limited and duplicate/update states directly", () => {
    assert.equal(
      mapCaptureResponseToShareResult(captureResult("created_metadata_only"), "url", NOW).state,
      "saved_limited",
    );
    assert.equal(
      mapCaptureResponseToShareResult(captureResult("duplicate_existing"), "url", NOW).state,
      "duplicate_existing",
    );
    assert.equal(
      mapCaptureResponseToShareResult(captureResult("updated_existing"), "note", NOW).state,
      "updated_existing",
    );
  });

  it("maps malformed success and source-specific failures safely", () => {
    assert.equal(
      mapCaptureResponseToShareResult({ duplicate: true, itemId: "existing" }, "url", NOW)
        .state,
      "duplicate_existing",
    );
    assert.equal(mapCaptureResponseToShareResult({}, "url", NOW).state, "server_unreachable");
    assert.equal(
      mapCaptureResponseToShareResult(captureResult("failed_without_saved_item"), "pdf", NOW)
        .state,
      "pdf_upload_failed",
    );
  });
});

describe("failure mapping, storage, actions, and redaction", () => {
  it("maps failures to stable result states", () => {
    assert.equal(mapCaptureFailureToShareResult("url", NOW).state, "server_unreachable");
    assert.equal(mapCaptureFailureToShareResult("pdf_read", NOW).state, "pdf_read_failed");
    assert.equal(
      mapCaptureFailureToShareResult("pdf_checksum", NOW).state,
      "pdf_checksum_failed",
    );
  });

  it("stores and expires safe payloads by opaque key", () => {
    const storage = new MemoryStorage();
    const payload = createShareResultPayload({
      state: "saved_full",
      sourceKind: "url",
      itemId: "item_123",
      now: NOW,
    });
    const key = storeShareResult(storage, payload, "safe_key");
    assert.equal(key, "safe_key");
    assert.equal(loadShareResult(storage, key, NOW + 10)?.state, "saved_full");
    assert.equal(loadShareResult(storage, key, NOW + 31 * 60 * 1000), null);
  });

  it("chooses state-specific actions", () => {
    const saved = createShareResultPayload({
      state: "saved_full",
      sourceKind: "url",
      itemId: "item_123",
      now: NOW,
    });
    const limited = createShareResultPayload({
      state: "saved_limited",
      sourceKind: "url",
      itemId: "item_123",
      now: NOW,
    });
    const missing = createShareResultPayload({
      state: "missing_token",
      sourceKind: "unknown",
      now: NOW,
    });
    assert.deepEqual(shareResultActions(saved), ["open_item", "ask", "done"]);
    assert.deepEqual(shareResultActions(limited), ["add_text", "open_item", "done"]);
    assert.deepEqual(shareResultActions(missing), ["pair_device", "done"]);
  });

  it("keeps log messages stable and payloads free of raw shared content", () => {
    const message = sanitizeShareLogMessage("share.pdf.read-failed", {
      uri: "content://private/report.pdf",
      token: "a".repeat(64),
    });
    assert.equal(message, "share.pdf.read-failed");

    const storage = new MemoryStorage();
    const payload: AndroidShareResultPayload = {
      state: "pdf_read_failed",
      sourceKind: "pdf",
      retryable: true,
      createdAt: NOW,
      expiresAt: NOW + 1000,
      errorCode: "PDF read failed for content://private/report.pdf",
    };
    storeShareResult(storage, payload, "redaction");
    const raw = storage.getItem("android-share-result:redaction")!;
    assert.equal(raw.includes("content://"), false);
    assert.equal(raw.includes("report.pdf"), false);
  });
});
