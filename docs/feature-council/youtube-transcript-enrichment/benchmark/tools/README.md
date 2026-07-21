# Publication-safe benchmark tools

Preparation and scoring modules remain deterministic and network-free. Sealed operator tools may orchestrate private A1, Gate 3, and conditional local-evaluator processes only after their lock and gate prerequisites pass; they enforce fixed evidence selection, bounded capture, and write-once output. No tool authorizes a pre-seal primary run. The package does not fetch YouTube, read credentials, use OAuth, transfer corpus content to an external provider, or boot the application server. `DEV-*` fixtures are synthetic/publication-safe and excluded from every primary denominator.

## Frozen tool contracts

### Subtitle preflight v1.0.0

`preflightSubtitleBytes` accepts bytes plus the locked format, item duration, raw SHA-256, cue count, explicit input-file integrity attestation, and a caller-supplied content-completeness state and basis. Matching bytes/count prove only the exact locked input file; they never infer that the transcript covers the full audiovisual work. Content completeness remains `complete`, `partial`, or `unknown` with source `caller_supplied_not_inferred`. The parser rejects before returning a partially parsed result.

Limits:

- input: 2,000,000 UTF-8 bytes;
- cues: 10,000;
- declared item duration: 6 hours;
- one cue duration: 6 hours (still bounded by the declared item duration);
- one cue's text: 2,000,000 UTF-8 bytes (still bounded by the entire input and supported-class text caps).

The parser inspection ceiling is 10,000 cues so a locked boundary cell above the supported service class can still be classified truthfully. The A1 supported class itself is 2,000,000 input bytes, 500,000 NFKC-normalized Unicode scalar text characters (cue text joined with one newline), 7,200 cues, and 21,600,000 ms. An otherwise valid inspectable file above a supported-class limit returns `expected_safe_rejection` plus explicit reasons; it is never mislabeled eligible.

Invalid UTF-8 is fatal. The parser supports a strict SRT/VTT subset; empty cues, malformed timing/settings, missing/gapped SRT indices, unsupported VTT metadata/NOTE/STYLE/REGION blocks, bare carriage returns, decreasing starts, unsafe integers, and out-of-duration cues are fatal. Overlaps and exact duplicates are preserved in source order. The tool never sorts, merges, deduplicates, repairs, replaces, or drops cues. Each result includes the exact raw hash and a canonical normalized-output hash, original timing text, integer millisecond timing, locked-file integrity, and the separate caller declaration about content coverage.

### Transcript scorer v1.1.0

The `unicode-whitespace-v1` profile applies Unicode NFKC, default Unicode lowercase, removes intra-word apostrophes, converts remaining Unicode punctuation to spaces, collapses whitespace, and preserves repetitions, negation tokens, names, numbers, symbols, and diacritics. It is for whitespace-tokenized languages only.

The scorer provides exact LCS token preservation, word-level Levenshtein WER with deterministic tie-breaking, exact unique contiguous timestamp-anchor matching, nearest-rank p90, ordinary median, and 95% Wilson score intervals. Before the LCS cell bound is applied, identical common token prefixes and suffixes are counted and removed; exact LCS runs only on the remaining middle, then the common counts are restored. This is exact and lets long identical or near-identical A1 inputs pass while divergent over-cap middles still fail. WER remains untrimmed so its existing edit-count tie semantics do not change.

The scorer requires callers to label references as either `a1_input_preservation_oracle` or `a3_independent_speech_reference`. WER accepts only the A3 role, preventing an A1 preservation oracle from being presented as speech-recognition accuracy.

Scoring is fail-closed above 2,000,000 text bytes, 50,000 tokens per combined input, 25,000,000 untrimmed-middle comparison cells, 10,000 segments, 1,000 anchors, or 6 hours. The base anchor count is `max(10, ceil(duration_ms / 300000))`; the required count is `min(base, sealed distinct nonempty reference-start count)`. At least three distinct starts and successful beginning/middle/final-third coverage are mandatory. The scorer requires the sealed distinct-start count explicitly and reports it; the private packet binds the value so a caller cannot silently apply the sparse rule without the sealed input. An anchor matches only when its normalized tokens occur exactly once in the ordered output token stream; an absent or repeated utterance is unmatched.

### Anchor generator v1.1.0

`generateTimestampAnchors` consumes a successful subtitle-preflight result and the same declared duration. It counts distinct starts only for cues whose normalized text is nonempty, binds that count as `source_distinct_timed_start_count`, and creates exactly the sparse-rule number of midpoint-bin targets. It considers cues by target distance with source-order tie-breaking and expands a candidate across at most eight contiguous cues until its normalized token sequence occurs exactly once in the full ordered reference. Chosen starts must increase strictly and the finished set must pass the scorer's beginning/middle/final-third and uniqueness checks. If fewer than three usable starts or no valid distributed set exists, it fails without emitting a partial anchor file.

The JSON result records the A1-preservation or A3-independent-speech reference role, source raw/canonical hashes, caller-supplied content-completeness declaration, sealed distinct-start count, selection policy, targets, exact reference starts, normalized utterances, and source cue ordinals. A1 generation accepts `complete` or explicitly `partial` content with a nonempty basis; it rejects `unknown`. Generated anchor files can contain transcript text and therefore remain in the private benchmark workspace; Git receives only their hashes and publication-safe metadata. The low-level generator CLI reads a local JSON object containing `preflight`, `durationMs`, and `referenceRole`, writes JSON only, and performs no network access.

### Private reference preparation CLI v1.2.0

`prepare-private-reference.ts` is the preferred network-free preparation boundary. It accepts one bounded regular non-symlink options JSON and one bounded regular non-symlink raw SRT/VTT, runs strict preflight entirely in memory, and writes exactly one JSON document to stdout. `expected_class` is mandatory. The observed preparation class is `expected_safe_rejection` when strict preflight places the input outside the A1 supported class or when content completeness is `unknown`; otherwise it is `eligible_supported`. A declared/observed mismatch is fatal.

For `eligible_supported`, completeness must be `complete` or explicitly `partial`, the normalized input remains subject to the scorer's 50,000-token cap, deterministic anchors are generated, and `private_anchor_packet` contains selected transcript utterances and remains private. For `expected_safe_rejection`, anchor generation is deliberately skipped and `private_anchor_packet` is `null`; this lets a predeclared boundary cell retain a publication-safe preflight record without attempting an ineligible anchor set. Preparation still counts normalized tokens when the total is at most 50,000. If a safe-rejection input exceeds that eligible-scoring cap, it does not fail merely for that reason: `normalized_token_count` is `null` and `normalized_token_count_state` is `not_scored_above_eligible_cap`. Strict raw-byte/cue/duration bounds and all parsing, hash, and classification checks still apply. In both cases, `publication_safe_summary` contains only token/cue/normalized-character counts or the explicit token not-scored state, hashes, completeness state, structural supported-class state/reasons, expected/observed preparation class, distinct nonempty timed-start count, and anchor count. The public summary never contains cue text, anchor utterances, the completeness basis, file paths, credentials, or environment values.

Options use this exact schema:

```json
{
  "schema_version": "1.2",
  "format": "srt",
  "declared_duration_ms": 60000,
  "expected_raw_sha256": "<64 lowercase hex characters>",
  "expected_cue_count": 7,
  "input_file_integrity_attested": true,
  "content_completeness": "complete",
  "content_completeness_basis": "explicit_source_assertion",
  "reference_role": "a1_input_preservation_oracle",
  "expected_class": "eligible_supported"
}
```

Reproducible invocation, with the output path kept outside Git:

```sh
node --import tsx docs/feature-council/youtube-transcript-enrichment/benchmark/tools/prepare-private-reference.ts \
  --options /absolute/private/options.json \
  --subtitle /absolute/private/reference.srt \
  > /absolute/private/generated-anchor-packet.json
```

The command reads no environment variables or credentials and imports no networking client.

### Frozen private A1 scorer CLI v1.0.0

`score-private-a1.ts` is the exact network-free post-run evaluator for eligible A1 cells. It accepts four bounded regular non-symlink files: strict options, the raw sidecar, the complete private preparation document emitted above, and the private `a1-normalized-transcript.private.json` emitted by the isolated A1 harness. Every file has an expected hash or locked parsing options. The evaluator re-runs strict subtitle preflight, requires an eligible `complete`/`partial` A1 input, deterministically regenerates the anchor packet and compares it in full, validates the private harness schema plus ordered in-duration segment timing, then runs the frozen preservation and timestamp scorers.

Options use this exact schema:

```json
{
  "schema_version": "1.0",
  "format": "srt",
  "declared_duration_ms": 60000,
  "expected_raw_sha256": "<locked raw-sidecar SHA-256>",
  "expected_cue_count": 7,
  "input_file_integrity_attested": true,
  "content_completeness": "complete",
  "content_completeness_basis": "explicit_source_assertion",
  "reference_role": "a1_input_preservation_oracle",
  "expected_anchor_packet_sha256": "<SHA-256 of the complete private preparation JSON>",
  "expected_normalized_transcript_sha256": "<SHA-256 of the private harness JSON bytes>",
  "comparison_canonical_output_sha256": null
}
```

The completeness basis is one of `explicit_source_assertion`, `source_coverage_record`, or `user_attestation`, matching the private A1 harness contract. The low-level CLI accepts `--options`, `--subtitle`, `--anchors`, and `--normalized-output`, then emits exactly one JSON document to stdout. It is an internal boundary used by the fixed parent operator. Direct invocation, caller-selected output, or shell redirection is not valid primary evidence.

Successful stdout is exactly one publication-safe JSON document. It contains evaluator/scorer/preflight/generator versions; raw and canonical input hashes; private anchor-packet and output-file hashes; a canonical, key-sorted normalized-output hash; reference/output/LCS token counts and preservation rate; actual and base-target anchor counts; matched, unmatched, and ambiguous counts; match rate and Wilson interval; and median/p90 timing error. It contains no transcript text, anchor/result IDs, source cue IDs, URLs, private paths, or completeness basis.

For the Gate 1 primary score, `comparison_canonical_output_sha256` is `null` and the operator retains the emitted `canonical_normalized_output_sha256`. For the one Gate 3 repeat, the operator sets the comparison field to that Gate 1 digest; inequality fails with `CANONICAL_OUTPUT_HASH_MISMATCH`, while equality is published as `verified_equal`. The current canonical digest is always emitted, so the comparison does not require publishing either private normalized artifact. The evaluator imports no application, environment, credential, or networking module and never writes a private artifact.

### Sealed write-once A1 cell operator v1.1.0

[`run-sealed-a1-cell.ts`](run-sealed-a1-cell.ts) is the sole primary interface for all nine Gate 1 cells and five conditional Gate 3 repeats. The CLI accepts only `--project-root`, `--private-evidence-root`, `--stage gate1-primary|gate3-repeat`, and one fixed `--item-id`. It verifies the current A/B seal, loads the exact ordered ledger/attestation authority, reads the fixed private source/reference bytes—including YT-04's non-scoring safe-rejection preparation record—and derives every child option and destination. No caller can select an input, command, report, scorer-options file, or evidence path.

Before any private write or child, it durably creates `decisions/a1-attempt-claims/<seal>/<stage>/<item>.publication-safe.json` with `O_EXCL`, `O_NOFOLLOW`, and file/parent synchronization. It then captures harness/scorer streams without a shell, recomputes every eligible score in the trusted parent, enforces the distinct eligible/supported-class/structural-rejection oracles, and writes bounded mode-`0600` private files plus receipt schema `1.1` under `outputs/<seal>/operator-receipts/<stage>/<item>.publication-safe.json`. A caught failure durably creates a canonical public hash/count-only terminal under `decisions/a1-attempt-terminals/<seal>/<stage>/<item>.publication-safe.json`; ENOBUFS capture is bounded and explicitly marks the affected truncated stream, while raw content is never published. A hard termination after the claim and before a terminal is `aborted_no_pass`. Any existing claim, terminal, fixed cell, or receipt rejects the rerun before another attempt write or child.

The exact mandatory frozen identities are the [A1 execution contract](../model/A1_EXECUTION_CONTRACT.json) (SHA-256 `7601a0335c32c230ad13311ff88475102db52112a4f13c437742e13173a81f3e`), its [schema](../model/A1_EXECUTION_CONTRACT.schema.json), the [receipt schema](../model/A1_OPERATOR_RECEIPT.schema.json), [attempt-claim schema](../model/A1_ATTEMPT_CLAIM.schema.json), and [attempt-terminal schema](../model/A1_ATTEMPT_TERMINAL.schema.json). SEALED children use a 120-second timeout, explicit transcript-policy environment `lab`, disabled TSX cache, deny-all network/default-deny file access, only exact verified repository reads, canonical local non-symlink `node_modules`, and root-owned PATH `/Library/Developer/CommandLineTools/usr/bin:/usr/bin:/bin`. Only default sealed dependencies are publication-eligible; injected tests are permanently `development_test_only`. Attempt uniqueness is enforced in the authoritative worktree; copied repositories, malicious deletion, same-user forgery, and hostile administration remain procedural external-audit limitations.

For `gate3-repeat`, the operator first re-verifies all `9/9` Gate 1 cells and receipts, independently recomputes the five positive scores, and derives the comparison digest from the matching Gate 1 cell. The focused synthetic suite includes a real two-process race and proves exactly one harness child starts and every loser leaves the winner tree byte-identical.

### Gate 3 evidence chain and result operator v1.1.0

[`gate3-evidence.ts`](gate3-evidence.ts) and [`gate3-result.ts`](gate3-result.ts) derive the only admissible Gate 3 schema `2.1` / generator `1.1.0` handoff. The generator requires the verified lock and private evidence root, exact-enumerates the 14 canonical public claims and requires their failure terminals absent, checks the exact five positives, four rejection controls, five repeats, all 14 operator receipts, source/reference/normalized/options/score/database hashes—including YT-04's non-scoring preparation hash—exact preflight overlap/duplicate counts, scorer bytes and semantics, preservation/anchor thresholds, byte-identical run-1/repeat normalized files, canonical equality, and zero network/provider activity, then exclusively and durably creates `decisions/GATE_3_RESULT.json` through canonical non-symlink repository parents, a synchronized staging file, verified hard-link identity/bytes, and parent-directory synchronization. The command records its own creation timestamp; callers cannot supply one.

The `verify` operation additionally requires the result and every one of the 14 claims to be tracked, clean, byte-identical to `HEAD`, and bound to the same A/B seal; that contract survives a fresh checkout. The local-model harness independently runs the full chain again and admits only the exact run-1 normalized bytes named for the requested fixed item. A manually composed result, claim-only hard-kill, failed terminal, missing claim, or self-asserted pass cannot unlock Gate 4.

### Exact-five blinded evaluation package (mechanically validated prospective controls)

[`blinded-evaluation.ts`](blinded-evaluation.ts) implements deterministic exact-five packet construction, strict evaluator/adjudicator result verification, full A/B dispute derivation, pooled/macro aggregation, threshold evaluation, and Gate 5 calculation. [`blinded-packet-operator.ts`](blinded-packet-operator.ts) derives packets only from the committed Gate 3 v2.1/generator-v1.1 handoff, its complete reverified private chain, five canonical Gate 4 first-attempt claims/reports, and their exact private output hashes. [`local-blinded-evaluator.ts`](local-blinded-evaluator.ts) is the local pinned-runtime role boundary. Successful public package terminals bind both the canonical bundle hash and its exact private file hash. Successful public role terminals bind the exact private claim and run-report file hashes in addition to canonical result and full-stream process hashes.

Before creating any adjudicator claim, packet, private role directory, or child process, the local runner exact-enumerates the fixed package and A/B role trees and re-verifies both complete chains: each public claim through successful terminal, each private claim through run report and result, the saved generation decisions, and both raw streams. Permissions, byte and canonical hashes, process outcome, chronology, seal/package/packet/runtime/prompt/schema/sandbox bindings, and receipt/bundle bindings must all agree. Disputes are derived only from those verified results, and both chains are verified again after the adjudicator child. Missing, failed, nonterminal, mistimed, mismatched, or permission-invalid A/B evidence fails before any adjudicator artifact or child side effect.

[`gate4-finalizer.ts`](gate4-finalizer.ts) is the only aggregate writer. Before reading evidence, it requires `decisions/gate4-public-runs` to contain exactly ten regular files—the five fixed claims and five fixed reports—and the current seal's evaluation-claim directory to contain exactly the six base package/A/B files or exactly eight files when the nullable adjudication pair is present. Extras, subdirectories, symlinks, and wrong entry types are rejected. It then re-verifies the fixed package claim/terminal/receipt/bundle, exact private layout and `0700`/`0600` permissions, five bound public cell reports, A/B claims/terminals/private claims/run reports/raw streams/results, and the exact nullable adjudication chain. It derives every dispute and every deterministic/qualitative metric, performs a second complete pre-write evidence pass, validates the result against `GATE_4_AGGREGATE.schema.json`, and durably writes a mode-`0644` exclusive staging file before atomically publishing the canonical `decisions/GATE_4_AGGREGATE.json` by hard link and synchronizing the parent directory. The artifact has no caller timestamp or path and binds raw-file plus canonical-JSON hashes without publishing paths, excerpts, transcript text, generated prose, or rationales. A copied private root can finalize only if its exact file hashes still match the public terminals; concurrent or repeated finalizers yield one winner and no selectable alternative.

The SEALED-only command exposes no evidence or output override:

```sh
node --import tsx docs/feature-council/youtube-transcript-enrichment/benchmark/tools/blinded-evaluation-cli.ts finalize \
  --project-root "<ABSOLUTE-AUTHORITATIVE-WORKTREE>" \
  --private-evidence-root "<ABSOLUTE-PRIVATE-EVIDENCE-ROOT>"
```

The finalizer separately derives first-attempt/final structural validity, semantic-reference validity, truthful state, measurable latency/resources, and zero external cost/provider calls from the five bound public reports. With five cells, one format retry means first-attempt validity is `4/5 = 80%`, below the locked `>=90%` threshold: qualitative scores may still pass, but overall Gate 4 fails and Gate 5 cannot fire. Package construction admits only five structurally successful final cells, so a truthful failed cell blocks package/finalizer reachability rather than being substituted. Failure before the atomic link leaves no canonical aggregate and permits a clean retry; after the link, the canonical path is already complete and authoritative and rerun remains prohibited. An uncatchable hard kill can leave a randomly named staging orphan before or after the link, but the finalizer never reads or selects staging paths and a post-link orphan is the same inode as the complete canonical artifact. Same-user path replacement between the final stable read and exclusive publication, deletion/replacement of repository authority, copied repositories, and hostile administrator access remain procedural/audit limitations.

This interface's prospective mechanical and integrated validation is complete. It authorizes no invocation: exact Commit-A eligibility remains controlled by `PRESEAL_READINESS.json`, the independently reviewed reference ledger, and the same-reviewer closure marker, while every primary invocation additionally requires a verified two-commit seal and its upstream gates. The frozen [execution contract](../model/EVALUATOR_EXECUTION_CONTRACT.json), [contract schema](../model/EVALUATOR_EXECUTION_CONTRACT.schema.json), role prompts, generation/result schemas, and aggregate schema are indexed in the [local model package](../model/README.md).

### Safety fixture evaluator v1.0.0

`evaluate-safety-fixtures.ts` parses schema `1.2` fail-closed, rejects duplicate keys and any missing, additional, reordered, or remapped fixture contract, and evaluates the complete 33-ID publication-safe safety set. It calls only the current pure YouTube-ID and literal private-address helpers plus the frozen local preflight/scorer. It never calls DNS, fetch, a socket, a provider/model, an application route, or a real benchmark input.

Every fixture is frozen to one of four oracle mappings: an executable local check, an exact separately executable existing test, an explicit known gap, or an explicit dependent check not executed. Exact-test references are reported as `not_applicable` until run by their separate test command; a declarative reference is never promoted to `pass`. Output is one JSON line containing only evaluator/schema status, aggregate counts, and fixture ID/status/reason codes. The current prospective snapshot is 18 narrow passes, 8 known gaps, and 7 not-applicable rows; it is not a production-safety pass.

Run it from the repository root without arguments:

```sh
node --import tsx docs/feature-council/youtube-transcript-enrichment/benchmark/tools/evaluate-safety-fixtures.ts
```

The exact mapping, status semantics, external-test commands, and scope limitations are in [the Gate 6 safety matrix](../SAFETY_TEST_MATRIX.md).

### Lock verifier v3.3.0

`verifyLock` parses lock schema 1.4 fail-closed, rejects duplicate JSON keys and unsafe paths, and requires the exact prospective `5/4/0/0/0/10` denominator: five A1 eligible cells, four A1 expected-safe-rejection cells, zero A2 cells, zero A3 positive cells, zero A3 rejection cells, and ten rights-screened real items. The corpus record separately fixes 9 source-sidecar preparation records, 5 A1 preservation references, 4 safe-rejection records, and 0 independent speech references. The ten-item `METHOD_ITEM_MATRIX.json` schema 1.1 is the machine-readable method/item and gate authority. It fixes YT-01 through YT-10 in order, makes YT-10 the sole pre-run A1 exclusion, and fixes the prospective states as Gate 1 `eligible`, Gate 2 `not_triggered`, Gates 3 and 4 `eligible_conditional`, Gate 5 `not_triggered`, and Gate 6 `eligible`. The verifier derives Gate 2 from both item-level authorization booleans and its exact 1/10, 1,000-basis-point work-allocation worksheet. Exact conditional rules permit Gate 3 only after Gate 1 passes, Gate 4 only after Gates 1 and 3 pass with the local package frozen, and require a fired Gate 5 trigger to be recorded `Triggered but blocked / Not run` because no visual method/media is sealed.

The verifier reads the exact Commit-A blobs for `METHOD_ITEM_MATRIX.json` and `REFERENCE_LEDGER.json` through its duplicate-key-safe parser. It rejects a missing, duplicate, reordered, or mismatched item ID/state; recomputes the 5/4/1 A1 classification from the ten matrix rows; reconciles all six denominators and all six gates with `LOCK.json`; and requires the nine reference-bearing IDs/states to match the matrix exactly. It also validates every scorer-critical ledger field and relationship: exact preflight/generator versions, hashes, bounded counts, duration/last-end ordering, derived base/actual anchor counts, class-specific nullability, structural failure ordinals, exact item-derived preparation paths, and YT-04's passed-preflight/non-scoring cue-limit semantics. Each ledger attestation hash must equal its exact Commit-A public attestation blob, whose duplicated source hash, duration, cue count, last end, completeness, expected class, and rights-review state must reconcile. The five eligible item/hash triples, attestation paths, official source-page URLs, and source owners must also reconcile with `model/LOCAL_DERIVATION_AUTHORIZATION.json`. The reference-ledger review must be `independent_prelock_review_complete`, have a valid pre-seal timestamp, and point to an existing frozen review artifact under the project review tree. A pending review cannot be sealed.

`PRESEAL_READINESS.json` is a separate frozen machine gate. The verifier requires `ready_for_commit_a`, three nonzero test-suite totals with passed=total and an exact derived grand total, every schema/link/privacy/type/lint/diff validation flag true, zero Gate 1–5 primary benchmark external/provider requests, zero model inference, zero spend, no primary outputs, the exact immutable-versus-mutable governance boundary, both protocol readiness checklist rows checked, and no `decisions/` or `council/` output at Commit A. Its review path must equal the completed reference-ledger review path, its validation must predate review closure, and the frozen report must contain the same reviewer's exact `prelock_review_closure_complete` machine marker. Mutable tracker/risk/index/log documents may later record results but cannot redefine a frozen claim.

The verifier also parses the frozen local runtime ledger and rejects a non-verified state, malformed timestamps, or `ledger_verified_at` earlier than `locked_files_hashed_at`. The model harness repeats this chronology check before any conditional inference.

The exact matrix and schema, reference ledger and schema, run plan, model research records, and all core protocol/tool inputs must be present in the path-sorted frozen manifest. The A1 execution contract, execution-contract schema, receipt schema, attempt-claim schema, and attempt-terminal schema are explicit mandatory frozen inputs and immutable pre-seal authorities; the verifier duplicate-key parses them and requires their exact path, document identity, and byte digest, so omission or Commit-A drift fails. Both Gate 4 trees—`benchmark/model/` and `spikes/model-harness/`—must be nonempty at Commit A. Every tracked file in both is frozen, and both trees are protected against later additions, modifications, deletions, and worktree changes. The verifier then verifies locally that:

- Commit A exists and is an ancestor of the checkout;
- Commit B has Commit A as its only direct parent, adds a previously absent `LOCK.json`, and changes no other path (including tracker, decision, and running-log files);
- the committed lock has never been modified and matches the working tree;
- every declared hash matches the exact Commit A blob;
- no frozen file changes in Commit B or any later commit, even if its bytes are later restored; and
- every current frozen file is a regular non-symlink file with the exact Commit A bytes.

#### Deterministic LOCK 1.4 draft generation

Create Commit A first, with `LOCK.json` absent, the two model trees nonempty, and the independent ledger review complete. Supply the full Commit-A SHA, protocol version, and an explicit RFC 3339 seal timestamp that is not earlier than the review. The generator reads only Git blobs from Commit A plus the active runtime-version record; it does not inspect working-tree or primary-result files and writes JSON only to stdout:

```sh
node --import tsx \
  docs/feature-council/youtube-transcript-enrichment/benchmark/tools/verify-lock.ts \
  --generate-draft \
  "$PROJECT" \
  "$COMMIT_A" \
  "2.4" \
  "2026-07-18T00:00:00Z" \
  docs/feature-council/youtube-transcript-enrichment/benchmark/LOCK.json \
  > "$PRIVATE_TMP/LOCK.json"
```

The draft derives protocol `2.4` from both the frozen protocol and run plan, the 10-real/9-sidecar/5-preservation/4-rejection/0-speech-reference corpus record, exact 5/4/0/0/0/10 denominators, six gate states, completed review, local-model paths, current Node/V8/Unicode/ICU/tsx runtime, fixed limits, and a path-sorted SHA-256 manifest of every required Commit-A blob. A caller version mismatch fails. The same arguments, Git objects, and runtime produce identical JSON bytes. Inspect the draft, place those exact bytes at the declared lock path, and make Commit B add only that file; do not update any log or tracker in Commit B.

The verifier uses only the local Git object database. Run it after Commit B with:

```sh
node --import tsx docs/feature-council/youtube-transcript-enrichment/benchmark/tools/verify-lock.ts /absolute/repository/root docs/feature-council/youtube-transcript-enrichment/benchmark/LOCK.json
```

Run the publication-safe unit suite with:

```sh
node --import tsx --test 'docs/feature-council/youtube-transcript-enrichment/benchmark/tools/tests/*.test.ts'
```

## Protocol choices made explicit

The protocol deliberately requires bounds and deterministic handling but does not supply numeric byte/cue/text/complexity limits, a precise punctuation table, an overlap/deduplication algorithm, an anchor-string matching algorithm, or a mathematical definition of beginning/middle/end distribution. The values and rules above are therefore frozen tool decisions that must be reviewed before Commit A. The run plan must also freeze the Node/Unicode/ICU runtime because Unicode normalization and lowercase tables are runtime data. The verifier interprets “two-commit seal” as a direct single-parent A→B pair and is stricter than the JSON Schema: it requires sorted paths, exact artifact locations, a completed independent ledger review, nonempty frozen Gate 4 trees, and byte-for-byte agreement among the lock, matrix, ledger, and Commit-A Git objects.
