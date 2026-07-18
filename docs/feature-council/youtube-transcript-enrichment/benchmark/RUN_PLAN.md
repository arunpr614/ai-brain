# YouTube transcript benchmark — exact sealed run plan

> **STATUS: PROSPECTIVE OPERATOR CONTRACT — COMMIT-A AUTHORIZATION IS MACHINE- AND REVIEWER-GOVERNED; PRIMARY RUNS ARE PROHIBITED UNTIL THE TWO-COMMIT SEAL VERIFIES**

**Run-plan version:** 1.2<br>
**Protocol:** 2.4<br>
**Prepared:** 2026-07-16<br>
**Reconciled:** 2026-07-19<br>
**Incremental spend ceiling:** USD 0<br>
**New subscriptions:** 0

This file is the operator contract for the primary A1 cells and conditional Gate 3 repeat. The exact local-model package supplies the additional Gate 4 operator contract and may be used only if this plan records Gates 1 and 3 as passed under the same seal. Nothing authorizes A2, A3, STT, visual work, media download, YouTube transcript requests, external-model transfer, aliases, or fallback routing. `METHOD_ITEM_MATRIX.json` alone governs method/item and pre-run Gate states; this plan, `REFERENCE_LEDGER.json`, attestations, and the model package each govern only their declared fields. Any disagreement stops the run and requires a new prospective seal.

## 1. Frozen execution environment

| Component | Locked value |
|---|---|
| Node | `22.22.3` |
| V8 | `12.4.254.21-node.56` |
| Unicode | `17.0` |
| ICU | `78.3` |
| tsx | `4.22.4` |
| npm | `10.9.8` |
| OS | macOS `26.5.2`, build `25F84` |
| Platform / architecture | `darwin` / `arm64` |
| jq | `jq-1.7.1-apple` |
| External egress boundary | `/usr/bin/sandbox-exec`, profile `(version 1) (allow default) (deny network*)` |
| Process environment | `/usr/bin/env -i`; fixed minimal `PATH`, `TMPDIR`, DB path, and two disabled-worker flags only |

`LOCK.json` binds Node, V8, Unicode, ICU, tsx, platform, architecture, every tracked runtime source file under `src/`, dependency manifests, and the exact benchmark/audit/research/review/harness scope enumerated in its frozen manifest. It does not claim that mutable governance status files are immutable. `PRESEAL_READINESS.json` classifies `RUNNING_LOG.md`, `MASTER_EXECUTION_INDEX.md`, `TRACKER.md`, `DECISION_LOG.md`, `SPIKE_REGISTER.md`, and `RISK_REGISTER.md` as post-seal mutable only for append-only history, evidence links, and result status; those files cannot redefine any frozen denominator, gate, cap, attempt, threshold, right, or authority. Any conflict is resolved in favor of the verified lock and frozen machine authorities. Any committed or worktree change/addition/deletion in a protected runtime, model, tool, or harness tree invalidates the run.

## 2. Frozen cells

All paths below are logical identifiers relative to the repository or the mode-`0700` private benchmark root. Committing these logical private-root-relative identifiers is required for reproducibility; committing an absolute local path, user name, device identifier, credential path, or private file content is prohibited. A SHA-256 is over exact file bytes.

| Item | Video ID | Attestation SHA-256 | Input SHA-256 | Language | Cues | Duration / last end ms | Completeness / basis | Locked class | Private preparation SHA-256 | Anchors actual/base |
|---|---|---|---|---|---:|---|---|---|---|---:|
| YT-01 | `8GEIN8WPTJ4` | `35a1eaa09f29953e6dd44bae209c8af557fdded5ddd9ed49324d6b3c73c62432` | `f8b2dbe1c9ec0521f1589453c2399c558241ba5a6b351f7f7b7fa691f0d14c1b` | `es-LA` | 7 | 68,395 / 57,357 | complete / explicit_source_assertion | eligible | `ff507d573114c8a7321a679059c894aaf57b102026d9d9f0a19e7d62923f7c07` | 7/10 sparse |
| YT-02 | `aMTwtb3TVIk` | `e5f7d74181946977ecd1091e1d995b3c37eacd4475929735ce9c0fb96bbc9b05` | `4341e975b77c42a4e15cf1368336f02f29031b462fd8da52a03209fa45e9689d` | `en-US` | 39 | 159,744 / 159,744 | complete / explicit_source_assertion | eligible | `b5c13d572f12313a516853cf8bb42267a4526f8ad8895fce16ac6b521e5a125a` | 10/10 |
| YT-03 | `bSt5peITUBo` | `89e7ed10133556a2bb78193c35b56495a024f88f95cab214334d7f105dc6087d` | `fd66f8e62779561047f57f505e24916cbf6293f6de8c775d7df30407f69ddbb5` | `en-US` | 108 | 478,293 / 478,293 | complete / explicit_source_assertion | structural rejection | N/A | 0/10 |
| YT-04 | `Kdwyqctp908` | `cbf40747e733f2ab4fc504b211065172c0fadacf979106827306e5f26a771c8f` | `5ef1a804dbffdabe9349dc8efef79dbdbb183cfa183f115498aee8f9b3ff1250` | `en-US` | 8,974 | 12,077,589 / 11,971,826 | unknown / unknown | supported-class rejection | `9c367575412e0564d6c66e2b1ec1d466cde59c11f5465bf4d3a03265cfcf86a6` | 0/41 |
| YT-05 | `n-Z5XRD8j3I` | `c9e22b634062e87a81f55fb2f9dbbaf6e713dff369a698d1074835de17ff173a` | `431edebc537261748bce67d1ae099da6160d88e8dc2d3450b58cafcef303ada8` | `en-US` | 814 | 3,550,037 / 3,504,466 | partial / source_coverage_record | structural rejection | N/A | 0/12 |
| YT-06 | `uwnOO54_m3o` | `ca313982858721875770e36808ca3d20df33376a84166d8605689f79bd5ae2c5` | `a537b3352459728a99785fdae94ea372e0552c32ee0efd688c134a7253442a36` | `es-US` | 15 | 77,525 / 77,525 | complete / explicit_source_assertion | structural rejection | N/A | 0/10 |
| YT-07 | `QFfZe9Zq2mY` | `37207aef5c4db8df36418a9edda922429b9e4e042914fe7d8fca83c1adafa1e9` | `6d8efa75edbbdb6bded8413445903bc5e049833b7f73ed99d5dbf42dc73f44cc` | `en-US` | 421 | 752,384 / 742,708 | complete / explicit_source_assertion | eligible | `7bd0e1f7e96d5ff51bc4df8dfe46dab79877fdad59851d476c546e87aa2a838f` | 10/10 |
| YT-08 | `UETFgQMLxZo` | `f43c4da27e204036a035ecbf8c55a5d8cf6c2a7cece2454a0c5d854c658b8678` | `9bd59a52838db6b8030b3a5fb128f60fd2340f1226e96863d3366ee840fee06f` | `en-US` | 13 | 54,997 / 53,760 | complete / explicit_source_assertion | eligible | `a2515518f7a66a5b6c4d41b1622aa47b3272b6e14061d3c3a0bac2c50303d685` | 10/10 |
| YT-09 | `Inxe5Bgarj0` | `4715cc1e53bb1d8ed0769e4a2a07a4578caae823d223f95d00cc1e47b54998b4` | `b2deffeae00423fad86435395f72bfa18cd143ba4fb1789ca13c93b023c80539` | `en-US` | 15 | 89,792 / 89,380 | complete / explicit_source_assertion | eligible | `29f4a5faa0a6ba638b945fa0739f8ba93ae14aa19c714976fee0a2245837d383` | 10/10 |

YT-10 has no sidecar and is excluded before run. A2 has zero cells because there is no consented editor-authorized identity/callback. A3 has zero cells because its prospective corpus trigger failed. These exclusions never invoke a command.

## 3. Mandatory preflight

From the exact repository root at Commit B:

```sh
node --import tsx \
  docs/feature-council/youtube-transcript-enrichment/benchmark/tools/verify-lock.ts \
  "$PROJECT" \
  docs/feature-council/youtube-transcript-enrichment/benchmark/LOCK.json
```

The command must report `valid: true`, the expected Commit A/B pair, runtime match, and the full frozen-file count. Then verify:

- `PRIVATE_ROOT` is the authorized non-Git benchmark root and mode `0700`;
- every input/preparation byte hash matches `REFERENCE_LEDGER.json`;
- no credential, cookie, token, API key, proxy, or provider variable is present in the child environment;
- the macOS sandbox executable exists;
- the canonical seal-scoped claim/terminal paths, fixed private receipt, and fixed private cell are absent before each attempt; and
- spend and external-request counters remain zero.

One optional post-seal synthetic `DEV` smoke is permitted before the first primary cell. Any defect requiring a frozen-file change invalidates the seal; no primary run may continue under that seal.

## 4. Exact write-once A1 operator v1.1.0 command

The sealed operator, not the shell, derives every input, option, oracle, child command, output path, and comparison hash from the verified lock, ledger, and attestation. The caller supplies only the two roots, fixed stage, and fixed item ID. Before any private cell write or child start, it durably creates the canonical public claim at `decisions/a1-attempt-claims/<seal>/<stage>/<item>.publication-safe.json` using exclusive/no-follow creation plus file and parent synchronization. It then runs the fixed 120-second children with TSX caching disabled inside the deny-network/default-deny-filesystem sandbox and the exact root-owned path `/Library/Developer/CommandLineTools/usr/bin:/usr/bin:/bin`. Private artifacts and receipt schema `1.1` use exclusive no-follow writes. A caught failure creates one canonical public hash/count-only terminal at `decisions/a1-attempt-terminals/<seal>/<stage>/<item>.publication-safe.json`; bounded overflow evidence records truncation and termination without publishing child content. A hard termination after the claim but before the terminal is `aborted_no_pass`. Manual creation of a cell, caller-selected evidence paths, and shell redirection of harness or scorer output are prohibited for primary evidence.

The exact mandatory frozen identities are `benchmark/model/A1_EXECUTION_CONTRACT.json` (SHA-256 `7601a0335c32c230ad13311ff88475102db52112a4f13c437742e13173a81f3e`), `A1_EXECUTION_CONTRACT.schema.json`, `A1_OPERATOR_RECEIPT.schema.json`, `A1_ATTEMPT_CLAIM.schema.json`, and `A1_ATTEMPT_TERMINAL.schema.json`. The sealed harness explicitly fixes `BRAIN_TRANSCRIPT_ENV=lab`. Only the default sealed dependency boundary is publication-eligible; every injected synthetic seam is permanently `development_test_only` and excluded from primary denominators.

Run exactly once for each of `YT-01` through `YT-09`, in that order:

```sh
node --import tsx \
  docs/feature-council/youtube-transcript-enrichment/benchmark/tools/run-sealed-a1-cell.ts \
  --project-root "$PROJECT" \
  --private-evidence-root "$PRIVATE_ROOT" \
  --stage gate1-primary \
  --item-id "$ITEM"
```

The operator derives the canonical private cell as `outputs/<seal-commit>/gate1-primary/<item>` and the mandatory private receipt as `outputs/<seal-commit>/operator-receipts/gate1-primary/<item>.publication-safe.json`; the public claim above is the authoritative attempt denominator. A claim is consumed even if the process crashes or fails; it, its terminal, private cell, and receipt are never repaired, deleted, or retried under the same seal. Uniqueness is enforced within the authoritative worktree. Copied repositories, malicious claim deletion, and same-user forgery remain procedural external-audit limitations. Any operator error stops dependent work and is preserved as the truthful first attempt.

### 4.1 Eligible-cell oracle

For YT-01, YT-02, YT-07, YT-08, and YT-09, require all of:

- process exit `0`, report `status=pass`, `claim_scope=locked_cell_only`;
- attestation/input/schema/lock hashes exactly match the seal;
- `classification.locked` and `classification.observed` are `eligible_supported`;
- persisted segment count equals locked cue count and exact persisted-segment match is true;
- source and normalized timing are one-to-one and equal for every A1 cue;
- network attempt count and all transcript/enrichment/LLM/provider attempt counts are zero;
- normalized private output and fresh SQLite DB exist only in that cell directory with private permissions;
- isolated A1 strategy feasible is true; and
- current-product readiness remains false with all known gap codes. It is never substituted for the isolated result.

Any mismatch is the first-attempt cell failure. A1 has no recovery retry.

### 4.2 Supported-class rejection oracle

YT-04 must exit `0` with `status=safe_rejection`, locked/observed class `expected_safe_rejection`, service invocation false, network/provider attempt counts zero, and no SQLite or normalized-output file. Any other result fails the control.

### 4.3 Structural-rejection oracle

YT-03, YT-05, and YT-06 must each exit nonzero and emit exactly one publication-safe report with:

- `status=fail`;
- `error_code=PREFLIGHT_REJECTED`;
- `detail_code=INVALID_STRUCTURE`;
- network attempt count `0` and no network target records;
- no SQLite or normalized-output file.

The first failing cue is predeclared in `REFERENCE_LEDGER.json`. A nonzero status is the expected control outcome, so the operator captures it without re-running or repairing the file.

## 5. Frozen eligible scorer boundary

For an eligible cell, the same write-once operator derives the exact private scorer-options object from the frozen authority, invokes the scorer inside the deny-network/minimal-environment boundary, captures its stdout without shell redirection, independently recomputes the score in the trusted parent, and requires byte-for-byte equality. It then requires reference-token preservation of at least `0.95`, timestamp-anchor match of at least `0.90`, and no WER field or claim. The resulting canonical normalized-output hash is the item's Gate 1 comparison authority for its one Gate 3 repeat.

The fixed positive cell contains only the normalized transcript, scorer options, scorer report, harness report, and throwaway SQLite database. A rejection cell contains only its harness report. Every file is a bounded, private, single-link regular file, and the receipt binds all present artifact hashes, exact child exit codes, expected outcome, content/seal commits, and lock hash.

## 6. Gate decisions and stop rules

### Gate 1

The isolated strategy passes Gate 1 only when:

- eligible first-attempt successes are exactly `5/5`;
- every eligible cell independently meets 95% token preservation and 90% locked-anchor match;
- expected rejection controls are exactly `4/4` under their distinct oracles;
- prohibited network/provider/YouTube/model activity is `0`; and
- spend is USD `0`.

With fewer than 10 eligible positives, any failure makes Gate 1 fail. A `5/5` pass is under-powered directional evidence for the exact five-VTT source-published class only. Current-product readiness is separately expected to remain `0/5`; therefore even a Gate 1 strategy pass cannot establish a production-ready path.

If Gate 1 fails, do not run Gate 3 on real inputs, Gate 4, Gate 5, or any replacement cell. Record the failure and proceed only to evidence-bound Gate 6/council reporting.

### Gate 2

`Not triggered / Not run`. No STT implementation, source media, or independent WER reference is frozen. WER, audio-relative timestamp accuracy, and diarization are `Not applicable / Not run`.

### Gate 3

Gate 3 runs only after Gate 1 passes. Re-run the five eligible items once, in new directories under:

`outputs/$SEAL_ID/gate3-repeat/$ITEM`

Use the same operator with `--stage gate3-repeat`, once for each fixed positive item:

```sh
node --import tsx \
  docs/feature-council/youtube-transcript-enrichment/benchmark/tools/run-sealed-a1-cell.ts \
  --project-root "$PROJECT" \
  --private-evidence-root "$PRIVATE_ROOT" \
  --stage gate3-repeat \
  --item-id "$ITEM"
```

Before it can claim the repeat, the operator re-verifies all nine Gate 1 cells, receipts, artifact hashes, rejection oracles, and deterministic scores. It derives `comparison_canonical_output_sha256` from the matching Gate 1 cell and requires `canonical_output_comparison=verified_equal`, identical provenance/completeness/timing, no provider/network attempt, and no source-to-normalized timing change. There is no third run or determinism retry.

After all five repeats pass, create the publication-safe Gate 3 result schema `2.1` with generator `1.1.0` using the fixed operator command below. It records its own timestamp, exact-enumerates all 14 canonical public claims and requires all corresponding failure terminals absent, re-verifies all 14 write-once receipts and every source/anchor/normalized/options/score/database hash, independently recomputes both scores, and exclusively creates `decisions/GATE_3_RESULT.json` against `benchmark/model/GATE_3_RESULT.schema.json`.

```sh
node --import tsx \
  docs/feature-council/youtube-transcript-enrichment/benchmark/tools/gate3-result.ts \
  generate \
  --project-root "$PROJECT" \
  --private-evidence-root "$PRIVATE_ROOT"
```

Ensure `GATE_3_RESULT.json` and all 14 canonical claim files are committed without modifying any protected benchmark input. Gate 4 remains ineligible until the result plus every claim are tracked, clean, and byte-identical to `HEAD`; verify that state with the same command using operation `verify` and the same two root arguments. If any attempt fails, commit its already-created claim and its canonical terminal if one was durably created as truthful audit evidence, but do not create or commit a passing Gate 3 result.

### Gate 4

Gate 4 is `Conditionally eligible / Not run`. It may start only after Gate 1 and Gate 3 pass under the same verified seal. The only eligible candidate is the exact local Qwen3-8B Q4_K_M file executed through the exact frozen Apple-arm64 `llama.cpp` CLI package, prompt, JSON Schema, rubric, settings, and offline wrapper in `benchmark/model/` and `spikes/model-harness/`. External provider transfer, HTTP server mode, model aliases, automatic routing, fallback, tools, and transcript-directed actions are prohibited.

Run one primary enrichment attempt for each of YT-01, YT-02, YT-07, YT-08, and YT-09 using the exact private normalized file whose SHA-256 is bound for that item in the committed Gate 3 result. The command-line harness must use execution class `SEALED`, independently reverify the canonical lock, and reject any caller-selected public-report destination. A schema-invalid response alone may receive the single already-sealed format-only retry; content failure, model/runtime failure, timeout, resource failure, or grounding failure receives no retry. Preserve every failure in the denominator. Require exact runtime/model/input/prompt/schema/config/output hashes, process status, peak resources, latency, attempt count, zero-network/zero-transfer counters, and publication-safe deterministic scores before blinded qualitative evaluation. The local package's exact operator commands and resource stops are co-authoritative; any mismatch stops the run.

Gate 4 passes only if the locked groundedness, critical-hallucination, timestamp-citation, key-point-coverage, structured-output, truthful-failure, cost, and measurable-latency requirements all pass for this five-item/single-model class. A pass remains under-powered and cannot support a model-comparison, cross-hardware, unquantized-model, long-video, production-capacity, or external-provider claim.

### Gate 5

Gate 5 is `Not triggered / Not run` before results. It becomes eligible only if the sealed Gate 4 transcript-only baseline is otherwise valid and macro visual-only key-point coverage is below 80% solely because essential visual evidence is missing. If that trigger does not fire, record `Not triggered / Not run`. Execution would additionally require the pre-result seal to contain the single allowed visual approach, exact rights-authorized inputs, privacy/storage/resource contract, blind comparison, and uplift thresholds. This seal deliberately contains no visual approach or authorized visual-media set, so a fired trigger must be recorded `Triggered but blocked / Not run`; results cannot be used to add a method post hoc. No visual work is implied by the existence of a text model.

### Gate 6

Gate 6 is mandatory regardless of upstream pass/fail/not-triggered state. It synthesizes the sealed acquisition/normalization/model evidence that actually exists, frozen executable security-test results, cost/reliability/resource evidence, current-product gaps, supported-input classifications, policy-review requirement, coverage limitations, secret/transfer posture, and data-lifecycle audit. It cannot upgrade a blocked/not-run gate, infer legal approval, or treat missing evidence as a pass.

### Product council

After Gate 6, three PM roles independently assess up to three evidence-bound strategies. Council v1, an independent adversarial review, and reconciled v2 must record `Go`, `Limited-go`, `Defer`, or `No-go`, including disagreements and minority views. This work is mandatory even after an upstream failure; only PRD, UX/prototypes, and technical implementation planning are conditional on `Go` or `Limited-go`.

## 7. Publication and retention boundary

Never commit or publish:

- input sidecars or complete transcript text;
- private preparation documents/anchor utterances;
- normalized private outputs or SQLite databases;
- scorer option files, private paths, credentials, environment dumps, or raw application logs.

Only the harness/scorer publication-safe JSON fields, aggregate gate tables, hashes, counts, stable error codes, timing metrics, and limitations may enter Git after an explicit secret/path/transcript-fragment scan. Private corpus and outputs are deleted no later than `2026-10-14`; research status expires/revalidates no later than 90 days after final verification.

## 8. Attempt and cost ledger

| Stage | Planned real attempts | Recovery attempts | External requests | Maximum spend |
|---|---:|---:|---:|---:|
| Gate 1 eligible | 5 | 0 | 0 | USD 0 |
| Gate 1 expected rejection | 4 | 0 | 0 | USD 0 |
| Gate 3 repeat, conditional | 5 | 0 | 0 | USD 0 |
| A2 official API | 0 | 0 | 0 | USD 0 |
| A3/STT | 0 | 0 | 0 | USD 0 |
| Gate 4 local text candidate, conditional | 5 | At most 5 sealed format-only retries | 0 | USD 0 |
| Gate 4 blinded local evaluators, conditional | 2 | 0 | 0 | USD 0 |
| Gate 4 local adjudicator, only if disputes exist | 0 or 1 | 0 | 0 | USD 0 |
| Gate 5 visual | 0 | 0 | 0 | USD 0 |

Maximum real A1 harness processes under a passing path: 14. Maximum conditional local-model processes are 13: up to 10 candidate invocations only if all five first outputs are schema-invalid and consume their one format-only retry, exactly two blinded evaluators, and at most one adjudicator when deterministic disputes exist. All 13 use the same single pinned model roster entry under their fixed roles; the model cap is not incremented by repeated invocations. A process that returns the predeclared structural-rejection status is one completed control attempt, not a retry. Synthetic development tests are excluded from all real denominators.
