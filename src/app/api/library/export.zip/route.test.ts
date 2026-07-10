import "./route.test.setup";

import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import JSZip from "jszip";
import { NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { issueSessionToken, setPin } from "@/lib/auth";
import { TEST_DB_DIR } from "./route.test.setup";
import { GET } from "./route";

function mkReq(opts: { cookie?: string } = {}): NextRequest {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", `brain-session=${opts.cookie}`);
  return new NextRequest("http://localhost/api/library/export.zip", {
    method: "GET",
    headers,
  });
}

function clearDb(): void {
  getDb().exec(`
    DELETE FROM item_tags;
    DELETE FROM tags;
    DELETE FROM items;
  `);
}

function signedSession(): string {
  return issueSessionToken();
}

async function loadZip(res: Response): Promise<JSZip> {
  return JSZip.loadAsync(await res.arrayBuffer());
}

function zipNames(zip: JSZip): string[] {
  return Object.entries(zip.files)
    .filter(([, file]) => !file.dir)
    .map(([name]) => name)
    .sort();
}

async function zipText(zip: JSZip): Promise<string> {
  const chunks: string[] = [];
  for (const name of zipNames(zip)) {
    const file = zip.file(name);
    if (!file) continue;
    chunks.push(await file.async("string"));
  }
  return chunks.join("\n---FILE---\n");
}

describe("/api/library/export.zip", () => {
  beforeEach(() => {
    clearDb();
    setPin("1234");
  });

  after(() => {
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("returns 401 without a session cookie", async () => {
    const res = await GET(mkReq());

    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: "unauthenticated" });
  });

  it("returns 401 for an unsigned session cookie", async () => {
    const res = await GET(mkReq({ cookie: "stub" }));

    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: "unauthenticated" });
  });

  it("exports an empty synthetic library with a README", async () => {
    const res = await GET(mkReq({ cookie: signedSession() }));

    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/zip");
    assert.match(
      res.headers.get("content-disposition") ?? "",
      /^attachment; filename="ai-memory-library-\d{4}-\d{2}-\d{2}\.zip"$/,
    );
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.deepEqual(zipNames(await loadZip(res)), ["README.md"]);
  });

  it("exports synthetic items grouped by source type with deduped filenames", async () => {
    insertCaptured({
      source_type: "url",
      title: "Export full text",
      body: "Synthetic article body for export validation.",
      source_url: "https://example.test/export-full-text",
      source_platform: "generic_article",
      capture_quality: "full_text",
      extraction_method: "fixture",
    });
    insertCaptured({
      source_type: "note",
      title: "Same Title",
      body: "First synthetic note.",
      source_platform: "note",
      capture_quality: "user_provided_full_text",
      extraction_method: "manual_note",
    });
    insertCaptured({
      source_type: "note",
      title: "Same Title!",
      body: "Second synthetic note.",
      source_platform: "note",
      capture_quality: "user_provided_full_text",
      extraction_method: "manual_note",
    });

    const res = await GET(mkReq({ cookie: signedSession() }));
    assert.equal(res.status, 200);
    const zip = await loadZip(res);
    assert.deepEqual(zipNames(zip), [
      "README.md",
      "note/same-title-2.md",
      "note/same-title.md",
      "url/export-full-text.md",
    ]);

    const text = await zipText(zip);
    assert.match(text, /Synthetic article body for export validation/);
    assert.doesNotMatch(text, /[A-Fa-f0-9]{64}|Bearer /);
  });
});
