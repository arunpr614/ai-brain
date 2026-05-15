/**
 * One-shot smoke: factory → OllamaProvider → live laptop Ollama.
 *
 * Closes the carry-over from RUNNING_LOG entries #32, #33, #34 — the
 * unit suite is mocked end-to-end and never exercises the actual
 * factory→provider→wire path.
 *
 * Exits 0 on green, 1 on red.
 */
import { getAskProvider, getEnrichProvider } from "../src/lib/llm/factory";
import { getEmbedProvider } from "../src/lib/embed/factory";

async function main(): Promise<number> {
  console.log("[smoke-factory] env: LLM_ENRICH_PROVIDER=" + (process.env.LLM_ENRICH_PROVIDER ?? "unset (default ollama)"));
  console.log("[smoke-factory] env: LLM_ASK_PROVIDER=" + (process.env.LLM_ASK_PROVIDER ?? "unset (default ollama)"));
  console.log("[smoke-factory] env: EMBED_PROVIDER=" + (process.env.EMBED_PROVIDER ?? "unset (default ollama)"));

  const enrich = getEnrichProvider();
  const ask = getAskProvider();
  const embed = getEmbedProvider();

  // Probe 1: isAlive on each provider hits the live daemon.
  console.log("\n[1/3] isAlive on enrich/ask/embed providers");
  const [enrichAlive, askAlive, embedAlive] = await Promise.all([
    enrich.isAlive(),
    ask.isAlive(),
    embed.isAlive(),
  ]);
  console.log(`  enrich=${enrichAlive} ask=${askAlive} embed=${embedAlive}`);
  if (!enrichAlive || !askAlive || !embedAlive) {
    console.error("FAIL: at least one provider is not alive");
    return 1;
  }

  // Probe 2: small generate via enrich provider.
  console.log("\n[2/3] enrich.generate({prompt:'pong test'}) — expect non-empty response");
  const out = await enrich.generate({
    prompt: "Reply with the single word: pong",
    num_predict: 8,
    temperature: 0,
  });
  console.log(`  response="${out.response.trim()}" model=${out.model} in=${out.metrics.input_tokens} out=${out.metrics.output_tokens} wall=${out.metrics.wall_ms}ms`);
  if (out.response.length === 0) {
    console.error("FAIL: empty response");
    return 1;
  }

  // Probe 3: 1-input embed via embed provider; check 768-dim.
  console.log("\n[3/3] embed.embed(['hello']) — expect 1×768 Float32Array");
  const vecs = await embed.embed(["hello"]);
  if (vecs.length !== 1 || vecs[0].length !== 768) {
    console.error(`FAIL: expected 1×768, got ${vecs.length}×${vecs[0]?.length ?? "?"}`);
    return 1;
  }
  console.log(`  vec[0].length=${vecs[0].length} sample=${vecs[0][0].toFixed(4)}, ${vecs[0][1].toFixed(4)}, ...`);

  console.log("\n[smoke-factory] PASS");
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
