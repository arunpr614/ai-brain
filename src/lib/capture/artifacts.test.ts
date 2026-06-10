import "../../db/items.test.setup";

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { deleteItem, insertCaptured } from "@/db/items";
import { listCaptureArtifactsForItem } from "@/db/capture-artifacts";
import { captureArtifactRoot, saveCaptureArtifacts } from "./artifacts";

let artifactRoot: string;

describe("capture artifact storage", () => {
  before(() => {
    artifactRoot = mkdtempSync(join(tmpdir(), "brain-artifacts-test-"));
    process.env.BRAIN_CAPTURE_ARTIFACT_ROOT = artifactRoot;
  });

  after(() => {
    try {
      rmSync(artifactRoot, { recursive: true, force: true });
    } catch {}
  });

  it("stores new artifacts with relative paths and unique filenames", async () => {
    const item = insertCaptured({ source_type: "url", title: "Artifact item", body: "Body" });

    const results = await saveCaptureArtifacts(item.id, [
      {
        kind: "metadata_json",
        content_type: "application/json",
        suggested_filename: "metadata.json",
        body: JSON.stringify({ ok: true }),
      },
    ]);

    assert.equal(results[0]?.status, "saved");
    const rows = listCaptureArtifactsForItem(item.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.path, null);
    assert.ok(rows[0]?.relative_path?.startsWith(`${item.id}/`));
    assert.equal(rows[0]?.write_status, "ok");
    assert.equal(rows[0]?.truncated, 0);

    const filePath = resolve(captureArtifactRoot(), rows[0]!.relative_path!);
    assert.equal(readFileSync(filePath, "utf8"), JSON.stringify({ ok: true }));
  });

  it("marks oversized artifacts as truncated", async () => {
    const item = insertCaptured({ source_type: "url", title: "Large artifact", body: "Body" });
    await saveCaptureArtifacts(item.id, [
      {
        kind: "user_text",
        content_type: "text/plain",
        suggested_filename: "user-text.txt",
        body: "x".repeat(300 * 1024),
      },
    ]);

    const [row] = listCaptureArtifactsForItem(item.id);
    assert.equal(row?.truncated, 1);
    assert.equal(row?.size_bytes, 256 * 1024);
  });

  it("removes artifact files when an item is deleted", async () => {
    const item = insertCaptured({ source_type: "url", title: "Delete artifact", body: "Body" });
    await saveCaptureArtifacts(item.id, [
      {
        kind: "metadata_json",
        content_type: "application/json",
        suggested_filename: "metadata.json",
        body: "{}",
      },
    ]);
    const [row] = listCaptureArtifactsForItem(item.id);
    const filePath = resolve(captureArtifactRoot(), row!.relative_path!);
    assert.equal(existsSync(filePath), true);

    deleteItem(item.id);

    assert.equal(existsSync(filePath), false);
    assert.equal(listCaptureArtifactsForItem(item.id).length, 0);
  });
});

