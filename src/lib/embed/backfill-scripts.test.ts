import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { runMigrations } from "@/db/client";

const TEST_DIR = mkdtempSync(join(tmpdir(), "brain-embedding-backfills-"));
const DB_PATH = join(TEST_DIR, "test.sqlite");
const SHARED_SCRIPT = resolve(process.cwd(), "scripts/backfill-embeddings.mjs");
const DIRECT_SCRIPT = resolve(
  process.cwd(),
  "scripts/backfill-embeddings-prod.mjs",
);
const ITEM_ID = "private-item-id-sentinel";
const ITEM_TITLE = "private-title-sentinel";
const ITEM_BODY = "private-body-sentinel";
const PROVIDER_NAME = "private-provider-name-sentinel";
const PROVIDER_MODEL = "private-provider-model-sentinel";
const PROVIDER_ERROR_MODEL = "private-provider-error-model-sentinel";
const PROVIDER_ERROR = "private-provider-error-sentinel";
const MOCK_PROVIDER_SOURCE = `
const http = require("node:http");
const server = http.createServer((request, response) => {
  let raw = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    raw += chunk;
  });
  request.on("end", () => {
    let payload = {};
    try {
      payload = JSON.parse(raw);
    } catch {}
    if (payload.model === ${JSON.stringify(PROVIDER_ERROR_MODEL)}) {
      response.writeHead(500, { "content-type": "text/plain" });
      response.end(${JSON.stringify(PROVIDER_ERROR)});
      return;
    }
    const inputs = Array.isArray(payload.input) ? payload.input : [];
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      embeddings: inputs.map(() => Array(768).fill(0)),
    }));
  });
});
server.listen(0, "127.0.0.1", () => {
  process.stdout.write(String(server.address().port) + "\\n");
});
`;

const db = new Database(DB_PATH);
sqliteVec.load(db);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
runMigrations(db);

let mockProviderProcess: ReturnType<typeof spawn>;
let mockProviderHost = "";

before(async () => {
  mockProviderProcess = spawn(
    process.execPath,
    ["--input-type=commonjs", "--eval", MOCK_PROVIDER_SOURCE],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  assert.ok(mockProviderProcess.stdout);
  const [portOutput] = await once(mockProviderProcess.stdout, "data");
  const port = Number(String(portOutput).trim());
  assert.equal(Number.isInteger(port) && port > 0, true);
  mockProviderHost = `http://127.0.0.1:${port}`;
});

beforeEach(() => {
  db.prepare("DELETE FROM chunks_vec").run();
  db.prepare("DELETE FROM chunks").run();
  db.prepare("DELETE FROM embedding_jobs").run();
  db.prepare("DELETE FROM enrichment_jobs").run();
  db.prepare("DELETE FROM items").run();
  db.prepare(
    `INSERT INTO items (id, source_type, title, body, enrichment_state)
     VALUES (?, 'note', ?, ?, 'done')`,
  ).run(ITEM_ID, ITEM_TITLE, `${ITEM_BODY} `.repeat(200));
});

after(() => {
  mockProviderProcess.kill();
  db.close();
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("standalone embedding backfill containment", () => {
  test("both dry-run paths select only aggregate targets with an unusable provider", () => {
    const shared = runShared(["--dry-run"], {
      EMBED_PROVIDER: PROVIDER_NAME,
    });
    assert.equal(shared.status, 0, shared.stderr);
    assert.match(shared.stdout, /dry_run_no_provider=true/);
    assert.match(
      shared.stdout,
      /^\[backfill\] summary targets=1 ok=0 failed=0$/m,
    );
    assertContentFree(shared);

    const direct = runDirect(["--missing-chunks", "--dry-run"], {
      EMBED_PROVIDER: PROVIDER_NAME,
    });
    assert.equal(direct.status, 0, direct.stderr);
    assert.match(direct.stdout, /dry_run_no_provider=true/);
    assert.match(
      direct.stdout,
      /^\[backfill-prod\] summary targets=1 ok=0 failed=0$/m,
    );
    assertContentFree(direct);

    assert.equal(chunkCount(), 0);
  });

  test("provider failures expose a fixed code without provider diagnostics or target data", () => {
    const invalidShared = runShared([], {
      EMBED_PROVIDER: PROVIDER_NAME,
    });
    assert.equal(invalidShared.status, 2);
    assert.match(
      invalidShared.stderr,
      /^\[backfill\] provider_configuration_invalid$/m,
    );
    assertContentFree(invalidShared);

    const invalidDirect = runDirect(["--item-id", ITEM_ID], {
      EMBED_PROVIDER: PROVIDER_NAME,
    });
    assert.equal(invalidDirect.status, 4);
    assert.match(
      invalidDirect.stderr,
      /^\[backfill-prod\] provider_preflight_failed$/m,
    );
    assertContentFree(invalidDirect);

    const overrides = {
      EMBED_PROVIDER: "ollama",
      EMBED_MODEL: PROVIDER_ERROR_MODEL,
      OLLAMA_HOST: mockProviderHost,
    };
    const shared = runShared([], overrides);
    assert.equal(shared.status, 4);
    assert.match(shared.stderr, /^\[backfill\] provider_preflight_failed$/m);
    assertContentFree(shared);

    const direct = runDirect(["--item-id", ITEM_ID], overrides);
    assert.equal(direct.status, 4);
    assert.match(
      direct.stderr,
      /^\[backfill-prod\] provider_preflight_failed$/m,
    );
    assertContentFree(direct);

    assert.equal(chunkCount(), 0);
  });

  test("successful target processing emits only final aggregate counts", () => {
    const overrides = {
      EMBED_PROVIDER: "ollama",
      EMBED_MODEL: PROVIDER_MODEL,
      OLLAMA_HOST: mockProviderHost,
    };
    const shared = runShared([], overrides);
    assert.equal(shared.status, 0, shared.stderr);
    assert.match(
      shared.stdout,
      /^\[backfill\] summary targets=1 ok=1 failed=0$/m,
    );
    assertContentFree(shared);

    const direct = runDirect(
      ["--item-id", ITEM_ID, "--reset-chunks"],
      overrides,
    );
    assert.equal(direct.status, 0, direct.stderr);
    assert.match(
      direct.stdout,
      /^\[backfill-prod\] summary targets=1 ok=1 failed=0$/m,
    );
    assertContentFree(direct);
    assert.equal(chunkCount() > 0, true);
  });

  test("a future migration marker blocks both scripts before provider or mutation", () => {
    db.prepare("INSERT INTO _migrations(name, sha256) VALUES (?, ?)").run(
      "028_youtube_browser_transcript.sql",
      "a".repeat(64),
    );
    const before = embeddingJobSnapshot();

    try {
      const shared = runShared([]);
      assert.equal(shared.status, 6);
      assert.match(
        shared.stderr,
        /blocked code=processing_schema_incompatible/,
      );
      assertContentFree(shared);

      const direct = runDirect(["--item-id", ITEM_ID]);
      assert.equal(direct.status, 6);
      assert.match(
        direct.stderr,
        /blocked code=processing_schema_incompatible/,
      );
      assertContentFree(direct);

      assert.equal(chunkCount(), 0);
      assert.deepEqual(embeddingJobSnapshot(), before);
    } finally {
      db.prepare("DELETE FROM _migrations WHERE name = ?").run(
        "028_youtube_browser_transcript.sql",
      );
    }
  });

  test("the disabled kill switch blocks even dry-run target selection", () => {
    const shared = runShared(["--dry-run"], {
      BRAIN_BACKGROUND_WORKERS_MODE: "disabled",
    });
    const direct = runDirect(["--missing-chunks", "--dry-run"], {
      BRAIN_BACKGROUND_WORKERS_MODE: "disabled",
    });

    for (const result of [shared, direct]) {
      assert.equal(result.status, 6);
      assert.match(result.stderr, /blocked code=content_workers_disabled/);
      assertContentFree(result);
    }
    assert.equal(chunkCount(), 0);
  });

  test("script diagnostics statically allow only fixed codes and aggregate interpolation", () => {
    for (const scriptPath of [SHARED_SCRIPT, DIRECT_SCRIPT]) {
      const source = readFileSync(scriptPath, "utf8");
      assert.doesNotMatch(source, /provider=\$\{/);
      assert.doesNotMatch(source, /model=\$\{/);
      assert.doesNotMatch(source, /dim=\$\{/);
      assert.doesNotMatch(source, /\[\$\{(?:i|idx)\s*\+/);
      assert.doesNotMatch(source, /chunks=\$\{/);
      assert.doesNotMatch(source, /wall_ms/);
      assert.doesNotMatch(source, /done in \$\{/);
      assert.doesNotMatch(source, /dimensions?, expected/i);
      assert.doesNotMatch(source, /shape mismatch/i);
      assert.doesNotMatch(source, /await res\.text\(/);

      const interpolatedDiagnostics = [
        ...source.matchAll(
          /console\.(?:log|error|warn)\(\s*`([^`]*\$\{[^`]*)`/g,
        ),
      ].map((match) => match[1]);
      for (const diagnostic of interpolatedDiagnostics) {
        assert.match(
          diagnostic,
          /^\[backfill(?:-prod)?\] (?:summary targets=\$\{[^}]+\} ok=\$\{[^}]+\} failed=\$\{[^}]+\}|blocked code=\$\{[^}]+\})$/,
        );
      }
    }
  });
});

function runShared(
  args: string[],
  overrides: Record<string, string | undefined> = {},
) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", SHARED_SCRIPT, ...args],
    runOptions(overrides),
  );
}

function runDirect(
  args: string[],
  overrides: Record<string, string | undefined> = {},
) {
  return spawnSync(process.execPath, [DIRECT_SCRIPT, ...args], runOptions(overrides));
}

function runOptions(overrides: Record<string, string | undefined>) {
  return {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BRAIN_DB_PATH: DB_PATH,
      BRAIN_DEPLOYMENT_ENV: "production",
      BRAIN_PRODUCTION_RUNTIME: "1",
      BRAIN_BACKGROUND_WORKERS_MODE: "standard",
      BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE: "disabled",
      BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_UI_ENABLED: "0",
      BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_WRITE_ENABLED: "0",
      BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_EXECUTION_ENABLED: "0",
      EMBED_PROVIDER: PROVIDER_NAME,
      EMBED_MODEL: PROVIDER_MODEL,
      OLLAMA_HOST: `${mockProviderHost}/${PROVIDER_ERROR}`,
      ...overrides,
    },
    encoding: "utf8" as const,
  };
}

function assertContentFree(result: { stdout: string; stderr: string }): void {
  const combined = `${result.stdout}\n${result.stderr}`;
  for (const sentinel of [
    ITEM_ID,
    ITEM_TITLE,
    ITEM_BODY,
    DB_PATH,
    PROVIDER_NAME,
    PROVIDER_MODEL,
    PROVIDER_ERROR_MODEL,
    PROVIDER_ERROR,
    mockProviderHost,
  ]) {
    assert.equal(combined.includes(sentinel), false);
  }
  assert.doesNotMatch(combined, /\[\d+\/\d+\]/);
  assert.doesNotMatch(combined, /\bchunks?=/i);
  assert.doesNotMatch(combined, /\b(?:wall_ms|duration|elapsed|done in)\b/i);
  assert.doesNotMatch(combined, /\b(?:provider|model|host|path)=/i);
  assert.doesNotMatch(combined, /\b(?:dimensions?|shape mismatch)\b/i);
  assert.doesNotMatch(
    combined,
    /\b(?:ollama|gemini|nomic-embed-text|gemini-embedding-\d+)\b/i,
  );
  assert.doesNotMatch(combined, /https?:\/\//i);
}

function chunkCount(): number {
  return (
    db.prepare("SELECT COUNT(*) AS count FROM chunks").get() as {
      count: number;
    }
  ).count;
}

function embeddingJobSnapshot(): unknown {
  return db
    .prepare(
      `SELECT state, attempts, claimed_at, completed_at, last_error
         FROM embedding_jobs
        WHERE item_id = ?`,
    )
    .get(ITEM_ID);
}
