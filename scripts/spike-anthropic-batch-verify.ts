/**
 * H-4 closure: pollBatch against an already-ended batch from S-10 spike.
 * Confirms our JSONL parser matches the real Anthropic results shape.
 */
import { AnthropicProvider } from "../src/lib/llm/anthropic";

const BATCH_ID = process.argv[2];
if (!BATCH_ID) {
  console.error("usage: spike-anthropic-batch-verify.ts <batch_id>");
  process.exit(2);
}

async function main() {
  const p = new AnthropicProvider({});
  const poll = await p.pollBatch(BATCH_ID);
  console.log(JSON.stringify(poll, null, 2));

  if (poll.status !== "ended") {
    console.error(`expected status=ended, got ${poll.status}`);
    process.exit(1);
  }
  if (!poll.results || poll.results.length !== 2) {
    console.error(`expected 2 results, got ${poll.results?.length ?? "null"}`);
    process.exit(1);
  }
  const a = poll.results.find((r) => r.custom_id === "ping-A");
  const b = poll.results.find((r) => r.custom_id === "ping-B");
  if (!a || a.type !== "succeeded" || !b || b.type !== "succeeded") {
    console.error("expected both succeeded");
    process.exit(1);
  }
  console.log("\n=== H-4 FINAL ===");
  console.log(`A: response="${a.response}", in=${a.metrics.input_tokens}, out=${a.metrics.output_tokens}`);
  console.log(`B: response="${b.response}", in=${b.metrics.input_tokens}, out=${b.metrics.output_tokens}`);
  console.log("\nH-4: PASS");
}

main();
