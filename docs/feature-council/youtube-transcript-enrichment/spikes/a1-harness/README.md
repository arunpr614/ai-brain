# Isolated A1 service harness

This directory contains a publication-safe, direct-service harness for the A1
creator/user-supplied SRT/VTT strategy. It does not make the current product
route production-ready. A successful eligible run records isolated strategy
feasibility and records current-product readiness as `false` with the known
audit gaps.

The benchmark protocol is a **final prospective but unsealed lock input, and primary experiments are prohibited**.
Only the wholly synthetic `DEV` tests below may run before the two-commit seal.
Do not use real corpus files, credentials, OAuth, YouTube, a model, or a live
network while developing this harness.

## What the harness enforces

- `YOUTUBE_TRANSCRIPT_RECOVERY_ENABLED=0` and
  `YOUTUBE_TRANSCRIPT_WORKER_ENABLED=0` must already be set before any dynamic
  application import.
- `BRAIN_DB_PATH` must be an absent absolute `.sqlite` path directly inside a
  mode-`0700` write-once-operator-created directory outside the repository. The path is
  claimed atomically and created with private permissions.
- The exact attestation bytes must match `--expected-attestation-sha256` and
  schema `youtube-a1-attestation-v1.2`; ambiguous duplicate JSON keys and
  additional fields are rejected.
- `SEALED` execution verifies the local two-commit lock and requires the exact
  attestation path/hash to appear in its frozen-file manifest. `DEV` carries no
  benchmark claim.
- The attestation's `input_contract` is authoritative. Format, language,
  duration, cue count, last-cue end, content-completeness state/basis, and
  expected class supplied on the CLI must match it exactly.
- The input bytes must match both the CLI digest and the attestation sidecar
  digest. The video ID must match both the CLI and attestation.
- Strict subtitle preflight runs before the database is claimed. `complete`
  inputs with a concrete basis and `partial` inputs with
  `source_coverage_record` may be eligible. `unknown` or an input outside the
  supported service class is a truthful safe rejection before any app import
  or service call.
- Eligible inputs are locally seeded with `insertCaptured`, then passed
  directly to `attachUploadedTranscriptFileToYoutubeItem`. No route,
  instrumentation entry point, capture worker, enrichment worker, provider, or
  application server is imported.
- Persisted segment index, start, duration, end, and text must exactly match the
  strict preflight representation. Any current-parser repair, skip, merge, or
  text transformation fails the run.
- Every normalized segment carries both normalized `start_ms`/`end_ms` and
  source `source_start_ms`/`source_end_ms`. A1 preserves timing exactly, so the
  source pair must equal the normalized pair for every cue.
- In-process fetch/HTTP/HTTP2/socket/TLS/DNS/datagram/WebSocket surfaces are
  fail-fast tripwires. Provider-attempt tables and network-attempt evidence must
  both remain empty on an eligible success.
- After the application-path checks finish, the throwaway database is switched
  to full synchronization, checkpointed, and finalized in rollback-journal
  mode so the frozen evidence is one mode-`0600` SQLite file with no selectable
  WAL or shared-memory sidecar. This final evidence step occurs after the
  application behavior under test.
- Complete normalized transcript content is written only to
  `a1-normalized-transcript.private.json` in the operator's fixed private cell.
  Standard output is one JSON line containing only publication-safe hashes,
  counts, stable codes, classifications, and booleans. Application logs are
  suppressed and represented only by a count and digest.
- A partial source-coverage record with an uncovered tail emits one deterministic
  `source_sidecar_uncovered_tail` interval in the private normalized artifact;
  source-asserted complete records retain the numeric trailing gap without
  inventing a missing interval.

The SQLite database intentionally shows the current legacy recovery job that a
weak YouTube insert queues; both worker flags keep it inert, and zero attempt
rows are required. That queued-job coupling is one reason current-product
readiness remains false.

## Synthetic DEV verification

From the repository root:

```sh
node --import tsx --test 'docs/feature-council/youtube-transcript-enrichment/spikes/a1-harness/tests/*.test.ts'
npx tsc --noEmit --pretty false --incremental false
npx eslint docs/feature-council/youtube-transcript-enrichment/spikes/a1-harness --max-warnings=0
```

The integration tests create only synthetic local subtitle/attestation bytes in
a temporary mode-`0700` directory. Their apparent URLs use the reserved
`.invalid` domain and are never resolved. Network-guard tests invoke patched
functions that throw synchronously before egress. Synthetic hostile-data cases
also prove that instruction/tool/secret-exfiltration-looking cue text remains
ordinary data, and that HTML/Markdown text transformation fails exact segment
comparison with zero network or provider evidence.

## Future sealed run (do not run yet)

After Commit B exists, first verify the checked-out two-commit seal exactly:

```sh
node --import tsx docs/feature-council/youtube-transcript-enrichment/benchmark/tools/verify-lock.ts \
  /absolute/repository/root \
  docs/feature-council/youtube-transcript-enrichment/benchmark/LOCK.json
```

Then invoke only write-once parent operator v1.1.0. It independently verifies
the same lock and exact frozen
[`A1_EXECUTION_CONTRACT.json`](../../benchmark/model/A1_EXECUTION_CONTRACT.json),
derives all private inputs and scorer options from the frozen
ledger/attestations, and durably creates the canonical public seal/stage/item
attempt claim before any private cell, database, or child process. It runs this
low-level harness and the scorer inside the fixed 120-second macOS
deny-network/default-deny-filesystem boundary, captures bounded stdout/stderr
without shell redirection, and exclusively writes receipt schema 1.1 bound to
every artifact hash and child exit code. Only this default sealed dependency
boundary is publication-eligible; test injection is `development_test_only`.

```sh
node --import tsx \
  docs/feature-council/youtube-transcript-enrichment/benchmark/tools/run-sealed-a1-cell.ts \
  --project-root /absolute/repository/root \
  --private-evidence-root /absolute/private/benchmark-root \
  --stage gate1-primary \
  --item-id YT-01
```

Change only the fixed item ID for the other declared cells. Do not invoke the
low-level harness directly for primary evidence, create a private cell first,
choose an output/report path, or redirect stdout to an evidence file. The public
claim contract is defined by
[`A1_ATTEMPT_CLAIM.schema.json`](../../benchmark/model/A1_ATTEMPT_CLAIM.schema.json);
a caught failure writes only hash/count/termination evidence under
[`A1_ATTEMPT_TERMINAL.schema.json`](../../benchmark/model/A1_ATTEMPT_TERMINAL.schema.json),
while a hard kill after the claim is `aborted_no_pass`. Any claim, terminal,
fixed private cell, or receipt permanently rejects a sequential or concurrent
rerun under that seal before another attempt write or harness child. For an
eligible cell, preserve the fixed private SQLite, normalized JSON, score
inputs/report, and receipt only in the authorized private benchmark workspace.
For an expected safe-rejection cell, only the fixed harness report and receipt
are created. None is a production-readiness claim, WER result, or
legal/platform approval.
