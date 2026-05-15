/**
 * Phase C-10 E2E smoke — daily Anthropic batch happy path with a
 * MOCKED provider (no Anthropic key required, $0).
 *
 * Walks the contract end-to-end:
 *   1. Capture a fresh note (insertCaptured triggers enrichment_jobs
 *      auto-enqueue → state='pending').
 *   2. Inject a stub LLMProvider with submitBatch + pollBatch.
 *   3. Call submitDailyBatch(stub). Assert state→'batched', batch_id set.
 *   4. Call pollAllInFlightBatches(stub) returning a synthetic
 *      successful enrichment payload. Assert state→'done',
 *      summary/title/category/quotes/tags written, batch_id cleared.
 *   5. Assert the auto-tag landed in tags + item_tags.
 *   6. Assert llm_usage row recorded with provider='anthropic'.
 *
 * Run: node --import tsx scripts/smoke-batch.ts
 * Exits 0 on green, 1 on red.
 *
 * Uses a tmp SQLite DB (BRAIN_DB_PATH) so it doesn't touch data/brain.sqlite.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// tsx has no top-level-await support (per memory reference_tsx_mts_interop).
// All async work goes inside main(); env mutation happens first so the
// dynamic imports resolve against the tmp DB path.
const tmp = mkdtempSync(join(tmpdir(), "brain-smoke-batch-"));
process.env.BRAIN_DB_PATH = join(tmp, "smoke.sqlite");

type AnthropicBatchPoll = import("../src/lib/llm/anthropic").AnthropicBatchPoll;
type AnthropicBatchRequest = import("../src/lib/llm/anthropic").AnthropicBatchRequest;
type AnthropicBatchResultEntry = import("../src/lib/llm/anthropic").AnthropicBatchResultEntry;
type LLMProvider = import("../src/lib/llm/types").LLMProvider;

interface ProbeResult {
  ok: boolean;
  detail: string;
}

const probes: Array<[string, ProbeResult]> = [];

function record(name: string, ok: boolean, detail: string): void {
  probes.push([name, { ok, detail }]);
  const tag = ok ? "✓" : "✗";
  console.log(`${tag} ${name}: ${detail}`);
}

const validEnrichmentJson = JSON.stringify({
  summary:
    "Paragraph one of three with enough characters to clear the validateEnrichment fifty-char minimum and exercise the full happy path.\n\nParagraph two.\n\nParagraph three.",
  quotes: [
    "First verbatim quote from the synthetic body.",
    "Second.",
    "Third.",
    "Fourth.",
    "Fifth.",
  ],
  category: "General",
  title: "Smoke-Batch Cleaned Title",
  tags: ["smoke-batch", "e2e", "phase-c-10"],
});

function makeStubProvider(batchId: string): LLMProvider {
  const submittedRef: { latest: AnthropicBatchRequest[] | null } = {
    latest: null,
  };
  // keep submittedRef accessible for sanity check
  (globalThis as unknown as { __smokeSubmitted: typeof submittedRef }).__smokeSubmitted =
    submittedRef;

  return {
    async generate() {
      throw new Error("smoke-batch should not call generate()");
    },
    async *generateStream() {
      // not used
    },
    async generateJson() {
      throw new Error("smoke-batch should not call generateJson()");
    },
    async isAlive() {
      return true;
    },
    async submitBatch(reqs: AnthropicBatchRequest[]) {
      submittedRef.latest = reqs;
      return { batch_id: batchId };
    },
    async pollBatch(id: string): Promise<AnthropicBatchPoll> {
      const reqs = submittedRef.latest ?? [];
      const results: AnthropicBatchResultEntry[] = reqs.map((r) => ({
        custom_id: r.custom_id,
        type: "succeeded" as const,
        response: validEnrichmentJson,
        metrics: { input_tokens: 100, output_tokens: 50, wall_ms: 0 },
      }));
      return {
        batch_id: id,
        status: "ended",
        request_counts: {
          processing: 0,
          succeeded: results.length,
          errored: 0,
          canceled: 0,
          expired: 0,
        },
        results,
      };
    },
  };
}

async function main(): Promise<number> {
  console.log("[smoke-batch] tmp DB at", process.env.BRAIN_DB_PATH);
  const { getDb } = await import("../src/db/client");
  const { insertCaptured } = await import("../src/db/items");
  const { submitDailyBatch, pollAllInFlightBatches } = await import(
    "../src/lib/queue/enrichment-batch"
  );
  // Touch the DB to run migrations.
  getDb();

  console.log("\n[1/6] capture a synthetic item");
  const item = insertCaptured({
    source_type: "note",
    title: "smoke-batch synthetic",
    body: "x".repeat(800),
  });
  const initial = getDb()
    .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
    .get(item.id) as { enrichment_state: string; batch_id: string | null };
  record(
    "capture",
    initial.enrichment_state === "pending" && initial.batch_id === null,
    `state=${initial.enrichment_state} batch_id=${initial.batch_id}`,
  );

  console.log("\n[2/6] submit daily batch via stub provider");
  const provider = makeStubProvider("msgbatch_smoke_xyz");
  const submit = await submitDailyBatch(provider);
  record(
    "submit",
    submit !== null && submit.batch_id === "msgbatch_smoke_xyz" && submit.count === 1,
    JSON.stringify(submit),
  );

  console.log("\n[3/6] post-submit DB state");
  const afterSubmit = getDb()
    .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
    .get(item.id) as { enrichment_state: string; batch_id: string };
  record(
    "transition→batched",
    afterSubmit.enrichment_state === "batched" &&
      afterSubmit.batch_id === "msgbatch_smoke_xyz",
    `state=${afterSubmit.enrichment_state} batch_id=${afterSubmit.batch_id}`,
  );

  console.log("\n[4/6] poll batch via stub provider");
  await pollAllInFlightBatches(provider);
  const afterPoll = getDb()
    .prepare(
      "SELECT enrichment_state, batch_id, summary, category, title FROM items WHERE id = ?",
    )
    .get(item.id) as {
    enrichment_state: string;
    batch_id: string | null;
    summary: string | null;
    category: string | null;
    title: string;
  };
  record(
    "transition→done",
    afterPoll.enrichment_state === "done" &&
      afterPoll.batch_id === null &&
      typeof afterPoll.summary === "string" &&
      afterPoll.summary.length > 0 &&
      afterPoll.category === "General" &&
      afterPoll.title === "Smoke-Batch Cleaned Title",
    `state=${afterPoll.enrichment_state} category=${afterPoll.category} title=${afterPoll.title}`,
  );

  console.log("\n[5/6] auto-tags landed");
  const tagRows = getDb()
    .prepare(
      `SELECT tags.name FROM tags
       JOIN item_tags ON item_tags.tag_id = tags.id
       WHERE item_tags.item_id = ?
       ORDER BY tags.name`,
    )
    .all(item.id) as Array<{ name: string }>;
  const tagNames = tagRows.map((r) => r.name).sort();
  record(
    "auto-tags",
    tagNames.length === 3 &&
      tagNames.includes("e2e") &&
      tagNames.includes("phase-c-10") &&
      tagNames.includes("smoke-batch"),
    `tags=${tagNames.join(",")}`,
  );

  console.log("\n[6/6] llm_usage row");
  const usage = getDb()
    .prepare(
      "SELECT provider, purpose, input_tokens, output_tokens FROM llm_usage WHERE provider = 'anthropic' AND purpose = 'enrichment' ORDER BY id DESC LIMIT 1",
    )
    .get() as
    | {
        provider: string;
        purpose: string;
        input_tokens: number;
        output_tokens: number;
      }
    | undefined;
  record(
    "llm_usage",
    !!usage && usage.input_tokens === 100 && usage.output_tokens === 50,
    JSON.stringify(usage),
  );

  // Summary.
  const passed = probes.filter(([, r]) => r.ok).length;
  const total = probes.length;
  console.log(`\n[smoke-batch] ${passed}/${total} probes passed`);
  return passed === total ? 0 : 1;
}

main()
  .then((code) => {
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      // ignore
    }
    process.exit(code);
  })
  .catch((err) => {
    console.error("[smoke-batch] threw:", err);
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      // ignore
    }
    process.exit(1);
  });
