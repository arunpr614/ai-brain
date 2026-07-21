# Gate 4 Local Enrichment Run and Evaluation Plan

**Version:** 1.1<br>
**Status:** prospective; run only after sealed Gate 3 passes<br>
**Evaluation claim:** one pinned local candidate's feasibility on five rights-reviewed A1-derived inputs; not a provider or production comparison

## Sequential eligibility

Gate 4 is ineligible until all of these conditions are evidenced:

1. Commit A freezes this entire model package, the isolated harness, the normalized-transcript contract, and every other benchmark input.
2. Commit B adds a valid lock whose direct Commit A parent and protected-path hashes verify.
3. Gate 1 passes all five eligible A1 positives and all four expected safe rejections.
4. Gate 3 produces identical canonical hashes on its predeclared repeat for all five positives, then commits one schema-valid `decisions/GATE_3_RESULT.json` that binds the five exact model-input file hashes to Commit A and Commit B.
5. `LOCAL_MODEL_RUNTIME_LEDGER.json` is `verified_ready_for_content_freeze`; every observed archive, extracted runtime file, model file, prompt, schema, authorization, rubric, and sandbox-profile hash matches.
6. The independent pre-lock reviewer confirms that the provisional local-derivation boundary is followed. This is not legal or production approval.

If any condition fails, Gate 4 is `Not eligible / Not run`. Nothing is substituted.

## Frozen matrix and limits

The matrix is one canonical local candidate by five eligible items: `YT-01`, `YT-02`, `YT-07`, `YT-08`, and `YT-09`. There are five primary cells, not 20. The governing cap is **up to four** models; it does not require four. Multimodal is conditional and is not part of this text-only Gate 4 baseline.

Each primary cell has one initial call. A second candidate call is allowed only for the sealed format-only condition in `INPUT_CONTRACT.md`. The blinded stage then uses exactly two fresh local evaluator invocations and, only when the deterministic dispute detector requires it, at most one fresh local adjudicator invocation. Therefore:

- primary cells: 5;
- maximum initial local invocations: 5;
- maximum format-only retries: 5;
- maximum candidate invocations: 10;
- blinded evaluator invocations: exactly 2;
- adjudicator invocations: 0 or 1;
- maximum total local inference invocations: 13;
- model roster: 1 pinned local model (the same model is reused under distinct locked role prompts and seeds);
- external model/provider inference requests: 0;
- paid requests: 0;
- incremental external-service spend: USD 0;
- server processes or listening sockets: 0.

No failed cell is replaced. Full denominators remain visible.

## Exact invocation boundary

The publication-safe command-line harness accepts only execution class `SEALED`. Before any private transcript read, it verifies the canonical lock at the current Git `HEAD`; it then requires the Gate 3 result to be tracked, clean, byte-identical to `HEAD`, and bound to that lock. It starts `/usr/bin/sandbox-exec` with the sealed network/user-home-denial profile and the locally hashed `llama-cli`. It supplies only local files:

- `--model <verified local GGUF>`;
- `--json-schema-file <sealed schema>`;
- `--system-prompt-file <sealed system prompt>`;
- `--file <private generated prompt>`;
- `--offline`, `--no-mmproj`, `--no-conversation`, `--single-turn`, `--simple-io`, and no server option;
- seed `424242`, temperature `0`, top-k `1`, top-p `1`, min-p `0`, repeat penalty `1`;
- context `16384`, output limit `4096`, threads `8`, batch threads `8`, GPU layers `all`; and
- reasoning off with budget zero.

The child environment contains no proxy, provider, OAuth, API-key, Hugging Face token, or home-directory credential variable. `HOME` and temporary directories point at the private run directory; common offline flags are set. Sandbox rules deny all access under `/Users` except the exact runtime/model/schema/system-prompt/generated-prompt/private-run bindings. `/usr/bin/time -l` supplies per-attempt maximum resident-set and peak-memory-footprint evidence. Standard output and error are captured separately with fixed retained-byte ceilings and full observed-stream hashes. Timeout or overflow kills the detached process group, and overflow is never retry-eligible. `llama-server`, `llama serve`, remote repository flags, URLs, aliases, fallback models, prompt caches, and tool calls are prohibited.

This macOS sandbox is a bounded benchmark control, not a general security proof: ordinary system files and OS/IPC services outside the denied user-home subtree remain a Gate 6 limitation.

## Deterministic validation

For every cell, retain privately the normalized input, generated prompt hash, raw standard output, raw standard error, and parsed enrichment output until 2026-10-14. Commit only hashes and content-free measurements.

After each child process completes, the harness re-verifies the lock, Gate 3 handoff, runtime/model package, locked inputs, attestation, and normalized bytes. A persistent mismatch fails the cell; this detection does not claim protection against a hostile same-user process that can mutate and restore bytes between checks.

The harness produces a `PUBLIC_RUN_REPORT.schema.json` record with the Gate 3/lock binding, post-execution input-reverification state, exact attempts, exit/timeout state, hashes, observed and retained byte counts, structural and semantic-reference results, cost boundary, privacy boundary, cleanup state, and truthful recoverable failure. It never includes transcript, output prose, evidence excerpts, private paths, usernames, machine IDs, or credentials. The path is fixed at `decisions/gate4-public-runs/<ITEM-ID>.json`; an existing record is never replaced.

The deterministic pass requirements are:

- process exit 0 without timeout;
- parseable, locked-shape JSON on the first attempt or the one permitted format-only retry;
- exact item/input/language/completeness echo;
- all collection IDs sequential and unique;
- all cited stable segment IDs present and ordered;
- all cited timestamp bounds equal their referenced segment bounds;
- all chapter bounds present, chronological, nonoverlapping, and exact;
- zero unsafe-markup findings; and
- private prompt cleanup recorded.

A model-constrained schema does not replace independent validation.

## Blinded qualitative evaluation

After all five cell records and their canonical write-once `<ITEM>.attempt-claim.json` files are final, the sealed packet operator re-verifies their exact hashes, the committed Gate 3 chain, the actual pinned runtime/model, every role prompt, flattened generation schema, strict postparse schema, the sandbox profile, affirmative consent, and private storage. It derives its own generation timestamp and readiness record; neither may be supplied by the caller. Before creating or writing any private package, it atomically creates the repository-authoritative `decisions/gate4-evaluation-attempt-claims/<SEAL-COMMIT>/package.json` with `O_EXCL`. That publication-safe claim binds the exact five Gate 3 input, Gate 4 output, cell-attempt-claim, and public-report hashes; the fixed runtime/model/prompt/schema/sandbox identities; consent/readiness hashes; and the 1,800,000-millisecond per-role child timeout. Only the winning claimant may create `<PRIVATE-EVIDENCE-ROOT>/outputs/<SEAL-COMMIT>/gate4-evaluation/package`. The bundle and private package receipt bind the public package-claim hash, and every cell attempt-claim hash remains in the private coordinator manifest and receipt.

Both packets hide candidate, runtime, file names, run order, cost, latency, and hashes that could reveal identity. Each item receives a private blinded ID. The item order for role `R` is the lexicographic order of:

```text
SHA-256("G4-EVALUATOR-" + R + "\0" + Commit-B-SHA + "\0" + item_id)
```

Evaluator A and evaluator B are two fresh invocations of the same pinned local Qwen3-8B Q4_K_M model and llama.cpp b9637 roster entry. They use distinct locked system prompts and seeds `424243` and `424244`, work independently, and receive no other evaluator result. Same-model evaluator bias is a disclosed material reproducibility limitation; this is not an independent human evaluation. The model emits only the flattened decisions shape. The trusted local wrapper—not model-authored output—adds and verifies runtime, model, prompt, schema, sandbox, consent, chronology, and zero-transfer attestations against `BLINDED_EVALUATION.schema.json`. Both receive:

- the generated enrichment;
- the relevant publication-safe locked key-point rubric;
- only bounded claim/citation evidence excerpts permitted by `LOCAL_DERIVATION_AUTHORIZATION.json`; and
- the evaluation definitions and thresholds, without model or runtime identity.

Each evidence excerpt is associated with one claim/citation, contains no more than 40 words, and is selected only from cited segment windows. Per item, the packet may contain at most 12 excerpts, 240 words, and 35% of the transcript's unique word positions, and must not be complete or reconstructable transcript content. If adequate evaluation cannot fit this boundary, the qualitative cell is `insufficient authorized evidence`; the coordinator does not expand transfer scope post-output.

Evaluators classify every material claim as fully supported, partially supported, unsupported, or contradicted. They identify critical hallucinations, check citation relevance within the locked ±5-second evidence window, and score text-groundable and visual-only key points separately. Before any private role directory or child process exists, each A/B role atomically creates its fixed repository-authoritative `decisions/gate4-evaluation-attempt-claims/<SEAL-COMMIT>/<ROLE>.json`. That claim binds the public package claim, raw package-receipt hash, canonical bundle and packet hashes, runtime/model/prompt/generation/strict-schema/sandbox identities, and the exact 1,800,000-millisecond timeout. The winning claimant then creates its mode-`0700` private result directory; its private claim and run report bind the public role-claim hash. Exactly one deny-network, no-tools, packet-only process is allowed per role; format or semantic retry is prohibited, and sequential, concurrent, cross-private-root, or copied-package starts against the same authoritative worktree cannot create a second child. All conclusions are labeled **AI-evaluated and provisional pending human stakeholder review**.

Every acquired package or role claim is terminal even if later work fails. `GATE4_EVALUATION_ATTEMPT_CLAIM.schema.json` is the strict public claim authority. On ordinary success or caught failure, the operator writes a separate publication-safe `<NAME>.terminal.json` governed by `GATE4_EVALUATION_TERMINAL.schema.json`. A successful package terminal binds the raw bundle file, canonical bundle, and raw receipt hashes. A successful role terminal binds the exact private claim and run-report files, canonical result, frozen timeout, invocation/exit/signal/timeout/overflow state, full and retained stdout/stderr byte counts, and full-stream hashes. It contains no private path, transcript, excerpt, generated prose, or rationale. Both claim and terminal schemas make `publication_eligible` explicit and require `false` for `DEV_TEST`. A hard kill or power loss may leave only the claim. That claim-only state is deliberately fail-closed: it permanently blocks an automatic rerun and does not imply pass, failure, or model quality.

The authoritative claim guarantee is bounded to one intact repository worktree. Exclusive files use handle-level permissions, file synchronization, and parent-directory synchronization, but these operations are not a transactional defense against a malicious same-user actor racing a parent-path swap. A copied repository has a different authority, and an actor who deletes or replaces claim evidence can defeat this local filesystem control. Published Git history, operator custody, and later human review remain necessary; this benchmark does not claim a distributed lock, tamper-proof ledger, or protection against hostile administrative access.

## Adjudication

Only after A and B are final does the deterministic dispute detector decide whether a fresh QA adjudicator is required. It conservatively includes every A/B claim, citation, or key-point metric disagreement, plus every critical-hallucination or schema/reference-record difference. This covers direct threshold changes, two-level support differences, and crossed disagreements where A and B each pass alone but their disjoint conservative combination would fail. All disputes are combined into at most one adjudicator invocation.

The adjudicator is at most one fresh invocation of that same pinned local roster entry, using locked seed `424245`. It remains blind to candidate identity and sees no additional transcript content beyond the already authorized excerpts. Its model output is decisions-only and its trusted wrapper supplies the same process evidence. Original scores and rationales remain immutable. The adjudicated result does not erase disagreement.

The only sealed orchestration entry point is `benchmark/tools/blinded-evaluation-cli.ts`: subcommand `package` derives and writes the canonical packet package; subcommand `run --role evaluator_a|evaluator_b|adjudicator` derives the canonical package/result paths and claims the named role; and subcommand `finalize` accepts only `--project-root` plus `--private-evidence-root`, re-verifies the complete chain twice, and exclusively writes `decisions/GATE_4_AGGREGATE.json`. No caller can select the aggregate path, evidence paths, execution class, timestamp, dispute set, scores, or Gate state. The command line exposes `SEALED` only; `DEV_TEST` fake-runtime and verified-lock injection are restricted to the Node test runner and are never publication-eligible.

## Gate 4 decision rules

The single candidate passes only if the locked benchmark thresholds all hold over the full five-item denominator:

- structural output valid on at least 90% of first attempts and 100% after permitted format-only retries;
- material claims fully supported at least 95% pooled and macro per item;
- zero critical hallucinations;
- citation accuracy at least 90% pooled and macro per item;
- text-groundable key-point coverage at least 80% pooled and macro per item;
- failures detectable and truthful; and
- latency measurable and external-service cost exactly USD 0.

The finalizer derives the deterministic criteria from the five hash-bound public reports before combining them with blinded qualitative scores. Because the denominator is five, one permitted format-only retry produces `4/5 = 80%` first-attempt structural validity and fails the `>=90%` criterion even if all five final outputs are valid. In that state `gate_4_qualitative_pass` may remain true, but `gate_4_overall_pass` is false and the Gate 5 trigger is forced to `not_triggered`. Package construction itself requires five structurally successful final cell records; any truthful failed final cell therefore blocks packet/finalizer reachability and cannot be replaced.

With five inputs and one local candidate, any pass is directional evidence for this exact candidate/runtime/corpus only. It does not establish production scalability, energy cost, arbitrary-video quality, provider quality, or human validation.

## Gate 5 trigger

Visual enrichment remains conditional. Compare the transcript-only result against the rubric's separate visual-only points only after Gate 4 completes. Gate 5 may test one visual approach only if transcript-only visual coverage is below 80% specifically because essential visual evidence is absent and all other prerequisites remain authorized. No frame or media access is authorized by this package.
