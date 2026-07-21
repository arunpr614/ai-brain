# Gate 4 Local Model Input Contract

**Version:** 1.1<br>
**Status:** prospective lock input; no model output observed<br>
**Candidate:** `LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637`

## Admissible input

Only a successful Gate 3 normalized transcript for `YT-01`, `YT-02`, `YT-07`, `YT-08`, or `YT-09` is admissible. The input must validate against `../NORMALIZED_TRANSCRIPT.schema.json` and the stricter runtime checks below. No raw subtitle, URL, audio, video, image, or arbitrary text path is accepted.

The harness rejects before model launch unless all of the following are true:

- the runtime ledger is `verified_ready_for_content_freeze` and every local runtime/model/locked-file hash matches it;
- the canonical two-commit benchmark lock verifies at the current Git `HEAD` before any private transcript is read;
- the tracked and clean `decisions/GATE_3_RESULT.json` is byte-identical to `HEAD`, names the verified content/seal commits, records Gate 1 and Gate 3 as passed, and binds this exact normalized-file SHA-256 to the item;
- the item appears exactly once in `LOCAL_DERIVATION_AUTHORIZATION.json`;
- the corresponding A1 attestation hash matches the authorization ledger;
- `provenance.input_sha256` equals the item's authorized source-raw hash;
- the complete persisted artifact passes the frozen strict A1 schema, including language-tag and URL constraints; `source_method` is `A1`, `reference_role` is `input_preservation`, completeness is `complete` or `partial`, and `errors` is empty;
- segments are nonempty, indices are exactly `0..n-1`, timestamps are nonnegative and ordered, source timestamps equal normalized timestamps, every source cue ID is nonempty, and declared duration/last-cue/trailing-gap values reconcile;
- the item has at most 600 segments, at most 24,000 UTF-8 bytes of segment text, and at most 50,000 Unicode code points of segment text;
- the normalized JSON file is at most 1 MiB and contains no NUL byte; and
- no caller-provided model URL, Hugging Face repository, server endpoint, prompt text, schema, sampling option, or fallback is accepted.

Any failure is publication-safe and recoverable as `enrichment_unavailable_transcript_preserved`. It does not alter the saved transcript.

## Stable segment identity

The harness derives, rather than trusts, one stable ID per normalized segment:

```text
<item_id>:S<index padded to six decimal digits>
```

For example, normalized index `7` for `YT-02` becomes `YT-02:S000007`. The mapping is one-to-one and follows the locked segment order. Model output may cite only these IDs.

## Deterministic prompt serialization

The normalized file's raw SHA-256 becomes `input_sha256`. The harness then writes a mode-`0600` temporary prompt in a fresh mode-`0700` private run directory using UTF-8 and LF newlines:

1. fixed header lines for schema version, item ID, input SHA-256, language tag, transcript completeness, source method, and total segment count;
2. fixed chunk headers; and
3. one compact JSON object per line with keys in this exact order: `segment_id`, `start_ms`, `end_ms`, `text`.

JSON escaping is the standard `JSON.stringify` representation. Text is not cleaned, translated, summarized, reordered, deduplicated, or interpreted. The final line ends with LF.

## Deterministic chunks

Chunking is prompt framing, not separate inference and not truncation. Starting from the first segment, append whole segments to the current chunk while both limits remain satisfied:

- at most 128 segments; and
- at most 12,000 UTF-8 bytes of segment text.

When the next whole segment would exceed either limit, close the current chunk and start the next. A single segment over 12,000 UTF-8 bytes is rejected. Chunk IDs are `CHUNK-001`, `CHUNK-002`, and so on. Every chunk is concatenated into the one prompt file, so every admitted segment is presented in one `llama-cli` invocation.

The prompt-file SHA-256 is recorded for each publication-safe attempt. The same file is re-read after the child exits; any byte change fails the cell. The file is deleted in a `finally` cleanup after the raw private output is written and before the publication-safe report is emitted. The original normalized transcript is never copied.

## Output and semantic checks

The model is constrained with `--json-schema-file ENRICHMENT_OUTPUT.schema.json`. The harness independently validates the returned JSON shape, exact item/header echo, identifier sequences, all segment references, ordering, chapter boundaries, and citation timestamp semantics.

For material claims and key points, `evidence_start_ms` must equal the minimum `start_ms` and `evidence_end_ms` the maximum `end_ms` of the cited segments. Chapter timestamps must exactly equal their start/end segment boundaries. Invalid or cross-item references fail the cell. This proves referential consistency, not semantic relevance; two blinded AI evaluators assess whether the cited text actually supports each claim.

Unsafe HTML tags, Markdown links/images, `javascript:` content, and control characters in generated prose fail semantic validation and are never copied to a public report.

## Retry contract

There is one initial attempt. Exactly one second attempt is permitted only when the process exits successfully but the response is not parseable JSON or fails the locked structural shape. The second prompt is byte-for-byte the initial prompt plus one LF and the sealed `FORMAT_REPAIR_PROMPT.txt` content. Model, runtime, input, system prompt, schema, seed, sampling, context, and output limits remain identical.

There is no retry for timeout, process failure, semantic-reference failure, unsafe markup, unsupported input, authorization failure, or bad runtime/model hash. There is no manual edit, semantic repair, model fallback, or post-result exclusion.

## Output paths and process boundary

The private output root is caller-supplied only because it is outside Git, but it must not exist yet; its parent must already be a non-symlink directory outside the worktree. The harness creates it mode `0700`. The publication-safe report path is not caller-selectable: it is written exactly once to `decisions/gate4-public-runs/<ITEM-ID>.json`, and an existing report blocks the run rather than being replaced.

The sandbox denies network and denies reads/writes under `/Users` except the bound runtime directory, model, output schema, system prompt, generated prompt, and private run directory. `/usr/bin/time -l` wraps the sandbox process and records per-attempt maximum resident-set size and peak memory footprint; missing measurements fail an otherwise valid cell. Timeout or output overflow kills the detached process group. Stream hashes cover all observed bytes even when retained private capture is capped at 4 MiB; the report distinguishes observed from retained byte counts. Overflow is a resource failure and can never trigger the format-only retry.

After the child exits and the private prompt cleanup runs, the harness re-verifies the lock, Gate 3 handoff, runtime ledger and extracted files, model, all locked files, attestation, and exact normalized bytes. Any mismatch makes the cell fail with `INPUT_CHANGED_DURING_EXECUTION`. This detects persistent path/file changes; it is not a claim of protection from a hostile same-user process that can change and restore bytes between checks.
