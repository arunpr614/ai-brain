# Isolated Local Model Harness

This research-only Node harness verifies the canonical benchmark lock, the committed Gate 3 handoff, every local runtime/model/prompt/schema/authorization hash, and the exact normalized-input file hash before it serializes one transcript. It launches the pinned `llama-cli` through `/usr/bin/sandbox-exec` with network and the rest of the user home denied. It never starts a server, resolves a remote model, accepts a URL, imports production application code, or sends transcript content to a provider.

The harness is prospective. Its tests use only generated `DEV-*` text and a fake executable created inside a temporary test directory. They do not read the private benchmark corpus, load the Qwen model, perform inference, download a file, or make a network call.

## Invocation after seal and Gate 3

Run with Node 22 and `tsx`, supplying absolute paths for all options:

```text
node --import tsx docs/feature-council/youtube-transcript-enrichment/spikes/model-harness/cli.ts \
  --execution-class SEALED \
  --project-root <COMMIT-B-WORKTREE> \
  --item-id YT-01 \
  --runtime-dir <PRIVATE-VERIFIED-LLAMA-RUNTIME-DIR> \
  --model <PRIVATE-VERIFIED-QWEN-GGUF> \
  --authorization-ledger <PROJECT>/docs/feature-council/youtube-transcript-enrichment/benchmark/model/LOCAL_DERIVATION_AUTHORIZATION.json \
  --attestation <PROJECT>/docs/feature-council/youtube-transcript-enrichment/benchmark/attestations/YT-01.json \
  --normalized-transcript <PRIVATE-GATE-3-OUTPUT> \
  --private-evidence-root <PRIVATE-BENCHMARK-ROOT> \
  --system-prompt <PROJECT>/docs/feature-council/youtube-transcript-enrichment/benchmark/model/SYSTEM_PROMPT.txt \
  --format-repair-prompt <PROJECT>/docs/feature-council/youtube-transcript-enrichment/benchmark/model/FORMAT_REPAIR_PROMPT.txt \
  --output-schema <PROJECT>/docs/feature-council/youtube-transcript-enrichment/benchmark/model/ENRICHMENT_OUTPUT.schema.json \
  --key-point-rubric <PROJECT>/docs/feature-council/youtube-transcript-enrichment/benchmark/model/KEY_POINT_RUBRIC.json \
  --sandbox-profile <PROJECT>/docs/feature-council/youtube-transcript-enrichment/spikes/model-harness/deny-network.sb \
  --private-output-dir <NEW-PRIVATE-OUTSIDE-WORKTREE-DIR>
```

Do not run this command until the sealed `EVALUATION_PLAN.md` prerequisites pass and `decisions/GATE_3_RESULT.json` has been committed. The runtime ledger is derived from the canonical project path. Before any private child starts, the harness durably and exclusively creates `decisions/gate4-public-runs/<ITEM-ID>.attempt-claim.json`; after the run, it durably and exclusively creates the publication-safe `<ITEM-ID>.json` report. Each bounded mode-`0644` regular file is checked through its open handle for one link, exact size, and exact byte readback, then the file and parent directory are synchronized. A hard kill or synchronization failure leaves the visible claim—and, if already created, report—in place, so the same sealed cell cannot retry automatically. `<PROJECT>` and other angle-bracket values are operator placeholders in this README, not lock-input placeholders. `DEV_TEST` is available only inside the Node test runner with a project beneath its temporary root, is not accepted by the command-line entry point, and emits `publication_eligible=false` with no Git-bound claim.

## Guarantees and limits

- The child receives only a minimal allowlisted environment, a local model path, and the sealed `--json-schema-file`, `--system-prompt-file`, and `--file` arguments.
- The [sandbox profile](deny-network.sb) denies all network operations and all reads/writes under `/Users` except the explicitly bound runtime, model, schema, system prompt, generated prompt, and private run directory; `--offline` supplies a second application-level network boundary.
- Exact byte/SHA/mode verification covers `llama-cli`, its nine sibling dylibs, runtime license, model, and every sealed input. The normalized file must equal the per-item hash in the committed Gate 3 result.
- The private output root must be new, outside the worktree, and under an existing non-symlink parent. Public claim and report paths are canonical, never caller-selected or overwritten, and any durability failure is fail-closed.
- Only a parse/shape failure after exit 0 can consume the one sealed format-only retry.
- Every attempt records and rechecks its prompt SHA-256 and uses `/usr/bin/time -l` for maximum resident-set and peak-memory-footprint evidence; missing resource evidence or output overflow cannot consume the retry.
- Raw output, standard error, and parsed enrichment remain private. The repository report contains only hashes, counts, timing, state, and boundary claims.
- Referential validation proves that IDs and timestamps exist and agree. It does not prove that evidence is semantically relevant; the blinded evaluator workflow does that provisionally.
- The local wall clock is measured. Energy, thermal effects, and production capacity are not measured.
- The macOS profile still allows normal system/runtime services outside the denied user-home boundary; Gate 6 must treat that residual OS/IPC surface as a limitation rather than a general-purpose security guarantee.
