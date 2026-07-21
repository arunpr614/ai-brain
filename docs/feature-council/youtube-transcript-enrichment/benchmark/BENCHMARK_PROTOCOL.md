# YouTube Transcript and Enrichment — Benchmark Protocol

> **PROTOCOL STATUS: PROSPECTIVE CONTROL PACKAGE — COMMIT-A AUTHORIZATION IS MACHINE- AND REVIEWER-GOVERNED; PRIMARY RUNS ARE PROHIBITED UNTIL THE TWO-COMMIT SEAL VERIFIES**

**Protocol version:** 2.4<br>
**Draft opened:** 2026-07-16<br>
**Reconciled:** 2026-07-19<br>
**Content-freeze commit (Commit A):** Recorded externally by `LOCK.json`; not yet created<br>
**Seal commit (Commit B):** Recorded by Git and validated against `LOCK.json`; not yet created<br>
**Seal record:** `LOCK.json` must not exist in Commit A and is generated only for Commit B

This protocol is prospective. Existing repository behavior, tests, smoke reports, prior research, and public-catalog observations are audit evidence only; none counts as a primary benchmark observation.

## 1. Decision question and claims boundary

The benchmark asks whether a narrowly declared, rights-safe class of saved YouTube links can receive a timestamped, provenance-preserving transcript and grounded enrichment without bypassing platform controls.

It cannot establish universal YouTube support, legal advice, platform approval, production reliability, or human validation. A result applies only to the exact method×item cells and Gate states frozen in machine authority `METHOD_ITEM_MATRIX.json`; `METHOD_ITEM_MATRIX.md` is its human-readable mirror. Other sealed inputs govern only their own fields, and any mismatch stops the run. The corpus is small, so even a passing result is directional engineering evidence.

Synthetic inputs are development/security fixtures only. They are excluded from every primary YouTube-acquisition denominator and cannot substantiate a YouTube feasibility claim.

## 2. Ordered gates and stop rules

1. Focused audit and independent review complete.
2. Protocol, real-item corpus, rights records, references, method matrix, scorers, schemas, safety fixtures, and evaluator forms receive the two-commit seal in section 12.
3. Gate 1 evaluates all nine predeclared A1 cells: five eligible positives and four truthful safe-rejection controls under their distinct oracles.
4. Gate 2 runs only when its locked trigger is met and source-origin media is independently authorized.
5. Gate 3 evaluates deterministic normalization and provenance preservation.
6. Gate 4 is **Conditionally eligible / Not run** for one exact, hash-verified local text candidate at USD 0. It may run only after Gates 1 and 3 pass under the same seal. External model transfer, aliases, routing, fallback, and server mode remain prohibited; see `../research/MODEL_COMPARISON.md` and `model/`.
7. Gate 5 is **Not triggered / Not run** before Gate 4 results. A valid Gate 4 transcript-only result below the locked visual-only threshold fires the trigger, but this seal contains no visual method or authorized visual-media set; if fired, Gate 5 is therefore **Triggered but blocked / Not run**, never eligible for a post-result method addition.
8. Gate 6 is mandatory and evaluates the available cost, reliability, security, policy, supported-input, and product-fit evidence without inventing missing results.
9. Three independent PM memos and council v1/review/v2 are mandatory for every upstream outcome and produce Go, Limited-go, Defer, or No-go.

A failed or blocked gate stops dependent work. A separately viable restricted class may proceed only when its independence is recorded before its runs. Gate 1 failure permits one clearly labeled development demonstration but prohibits a feasibility claim and downstream product package.

## 3. Candidate methods and exclusions

The acquisition cap is three. No alias, silent provider fallback, or undeclared helper is a fourth method.

| ID | Candidate | Declared class | Gate/state |
|---|---|---|---|
| A1 | Authorized source-published SRT or VTT locally associated with a saved YouTube URL | Official source page associates the exact sidecar/rendition with the exact link; processing makes no transcript or media request to YouTube | Gate 1 narrow strategy candidate; general creator/user upload and the current product route are not validated |
| A2 | Official YouTube Data API `captions.list` + `captions.download` | Authenticated user has OAuth authorization and permission to edit the video | Gate 1; **Excluded before run** because the supplied web client has no redirect, consent token, exact editor-authorized item, or sealed lifecycle plan; zero calls/quota |
| A3 | Local STT over independently authorized source-origin media | Media comes directly from an owner/rights-holder source or user upload; never downloaded from YouTube | Conditional Gate 2 only |

The active InnerTube/timedtext path, `youtube-transcript-api`, `yt-dlp`, scraping, browser-cookie reuse, proxy rotation, or extracting YouTube audio are rejected for production testing. They remain desk-research evidence and are excluded before run with reason; expected safe rejection is not an acquisition attempt.

### 3.1 A1 isolation and current-product boundary

The protocol-v2 A1 tool-supported class is an authorized source-published SRT or VTT that is valid UTF-8, has nonempty cue text, is no larger than 2 MB, has no more than 500,000 normalized text characters and 7,200 cues, is no longer than six hours, has official source-row publication association with the saved URL, and carries the locked rights/retention/version attestation plus an explicit `complete` or `partial` content-completeness state with evidence. `unknown` is not eligible for ingestion. The actual real positive claim is narrower: five official NASA VTTs spanning 54.997–752.384 seconds; SRT and longer-duration behavior have synthetic evidence only. Source-row association is not a YouTube byte/duration-equivalence claim.

Files outside the supported class are not quietly dropped. YT-04 must return the explicit supported-class safe-rejection report. The three predeclared empty-cue cells must terminate with `PREFLIGHT_REJECTED/INVALID_STRUCTURE`, zero network/provider/service activity, and no private DB/output. Their expected nonzero process status counts as a truthful negative-control success, not a candidate-method failure or a post-result exclusion.

The repository’s current `/api/capture/transcript` route does not collect an explicit rights/retention attestation. Its policy layer automatically records a user-provided rights basis and full-text retention class, while its file parser replaces invalid UTF-8 and can skip malformed cues. Separately, ordinary YouTube item creation calls the legacy InnerTube path and the recovery worker is enabled unless both flags are explicitly disabled. Therefore a passing parser/strategy spike cannot be reported as a passing current-product path.

Any A1 run must use a throwaway local database and a publication-safe isolated harness that:

- locally seeds the saved YouTube item and never calls the URL-capture route;
- sets `YOUTUBE_TRANSCRIPT_RECOVERY_ENABLED=0` and `YOUTUBE_TRANSCRIPT_WORKER_ENABLED=0` before process start;
- calls the parser/service directly without booting full application instrumentation; enrichment, backup, note, batch, and other workers/providers must be absent or explicitly stubbed/stopped;
- observes or denies network egress and fails the run on any outbound request;
- requires the locked attestation record for provisional private-research rights classification, mandatory production/legal-policy review, source, retention/derived-data limits, attribution, and version association;
- rejects invalid UTF-8, every malformed/dropped cue, non-monotonic or out-of-duration timing, and unverifiable completeness; and
- records both strategy feasibility and current-product compatibility as separate outcomes.

The benchmark may add publication-safe spike-only validation around the existing parser, but it may not alter production code. A1 cannot support Go/Limited-go for the current route until the production design collects and enforces the same attestation and fail-closed completeness controls.

If Gate 2 triggers, no more than two local STT implementations may be frozen. If it does not trigger before Commit A, Gate 2 is recorded **Not triggered / Not run** and no STT candidate may be added after results are visible.

Gate 2 trigger: at least 2 of the 10 curated corpus items, and at least 20% of that corpus, have both `authorized_ingestible_sidecar=false` and `independently_authorized_source_media=true`. A strict-invalid/out-of-class sidecar is `false`, but conditional/link-only/review-required media is also `false`. Only YT-10 has the pair, so the frozen value is 1/10; A3 would add only one row and both aggregate requirements fail. This is a prospective corpus work-allocation rule, not a product-prevalence or market-coverage estimate.

## 4. Corpus, rights, and authorization freeze

The primary corpus targets 10 real, stable YouTube videos and may include at most 12. One unavailable/private/restricted YouTube identifier may be included only as a safe-rejection control and never accessed beyond the declared public request. Non-video security fixtures are counted separately.

The manifest must separately record, for every item:

1. underlying-content rights and attribution;
2. caption/transcript rights and source;
3. source-origin media authorization, if A3 could apply;
4. authorization for each YouTube access mechanism;
5. retention, deletion, derived-data, and model-disclosure constraints; and
6. exact version equivalence between the source asset/sidecar and the linked YouTube publication.

Public availability alone is never rights evidence. Eligible classes are user-owned, explicitly permissioned, compatible Creative Commons, public domain, or wholly synthetic only for non-primary controls.

At least four real items require trusted, locally held, timestamped reference artifacts appropriate to the metric being claimed. For A1, the exact authorized source sidecar is a valid **input-preservation oracle** for token and cue-timestamp fidelity, but it cannot substantiate speech-recognition accuracy or WER. WER and audio-relative timestamp accuracy may be reported only when a separately produced, pre-lock independent speech reference exists; this is mandatory for every A3 item. Complete media and non-public or copyrighted transcripts stay outside Git; the manifest records only publication-safe metadata and SHA-256 hashes.

`CORPUS_MANIFEST.md` and `METHOD_ITEM_MATRIX.md` freeze the exact inputs, rights evidence, eligible-supported cells, expected-safe-rejection cells, excluded-before-run cells, and denominators before any experiment.

## 5. Run controls and retry accounting

- Every eligible method×item cell has one planned **primary attempt**. Primary success rates use that first attempt only.
- Recovery is reported separately and never replaces the primary outcome. At most two recovery attempts may follow the same failure, only for a predeclared transient I/O, rate-limit, or format-serialization condition.
- A recovery attempt records the unchanged and changed conditions, reason, elapsed time, request ID when applicable, and possible selection bias. Changing method, model, source, prompt, reference, or scorer is a new protocol version, not a retry.
- A1 is local deterministic ingestion; it has no network retry. Gate 3 has one planned repeat on identical input for determinism, which is not a failure retry.
- A1 must start in a fresh direct-service process with both transcript-recovery flags disabled, no application instrumentation/background workers, all external providers stubbed absent, and egress observation active. A network or model/provider attempt is a critical failure even if no response is received.
- A future Gate 4 permits at most one format-only retry after schema-invalid output. It must keep model, provider, content, prompt, schema, and limits fixed; only an already sealed repair instruction may be appended.
- Maximum effort to make one failing tool operational: 60 minutes. Exceeding it records a blocker.
- Incremental external spend is USD 0 and new subscriptions are prohibited. Free credits do not expand authorization.
- No run may use credentials, cookies, private videos, private repository content, sensitive information, or access-control bypass.
- Transcript/media content is untrusted data. It cannot change instructions, call tools, fetch URLs, reveal secrets, or select a provider.
- Raw machine outputs and complete transcripts remain in the private benchmark workspace when rights require. Git receives hashes and publication-safe derived measurements only.

## 6. Acquisition, preservation, and accuracy metrics

### 6.1 Frozen cell states and denominators

Every method×item cell has exactly one pre-run state:

- `eligible-supported` — included in that method’s primary positive denominator;
- `expected-safe-rejection` — scored only for truthful rejection and non-circumvention; or
- `excluded-before-run` — not executed, with a locked reason.

No post-result exclusion is allowed. Report every denominator per method and content class; do not pool methods into a single success claim.

### 6.2 Primary acquisition success

An `eligible-supported` cell succeeds only when the first planned attempt:

- returns the correct item and non-empty transcript;
- emits monotonic, in-duration usable timing;
- records method, source, language, caption kind, version, and explicit completeness provenance;
- preserves at least 95% of normalized reference-input tokens for A1 or independent reference tokens for A3;
- matches at least 90% of the locked timestamp anchors; and
- performs no prohibited access behavior.

For A1, successful strategy ingestion and current-product readiness are distinct fields. Missing attestation capture, silent input repair/cue dropping, possible legacy recovery activation, or accepting a known file outside the 2 MB/500,000-character/7,200-cue/six-hour supported class fails current-product readiness even when the isolated sidecar strategy preserves another file.

Metadata-only output, wrong-video output, missing timing/provenance, a falsely complete partial transcript, or prohibited access behavior is a failure.

`primary_success_rate = first-attempt successful eligible cells / all eligible-supported cells`

The frozen positive denominator is five and the frozen safe-rejection denominator is four. Gate 1 requires `5/5` positive successes and `4/4` truthful rejections without circumvention. Because rights screening and strict preflight left fewer than the originally targeted 10 eligible positives, any pass is explicitly under-powered and directional; a proportion alone cannot support a broad release claim.

### 6.3 Input preservation versus independent accuracy

A1 input-preservation scoring compares normalized output with the exact supplied file and measures parser/normalizer loss. It is not WER and makes no speech-recognition claim.

WER is reported only where an independent, pre-lock trusted speech reference exists. The reference must not be the A1 input subtitle, a reformatted serialization of that cue set, or generated from candidate output. Protocol v2 makes no WER claim for A1. If Gate 2 is not triggered, WER and audio-relative timestamp accuracy are explicitly `Not applicable / Not run` rather than inferred from preservation scores.

### 6.4 WER implementation

The sealed scorer must be versioned and hashed. For English and other whitespace-tokenized languages it must apply Unicode NFKC, script-appropriate lowercase, punctuation removal that preserves lexical meaning, and whitespace collapse. It must not remove filled pauses, repetitions, negation, names, or numbers. Standard word-level Levenshtein distance applies:

`WER = (substitutions + deletions + insertions) / reference words`

A language needing a different deterministic tokenizer must have the implementation and rationale sealed per item. Translation is never scored as same-language transcription.

### 6.5 Timestamp anchors

The base target is `max(10, ceil(duration_minutes / 5))` locked anchors. A reference cannot supply timing it does not contain: when it has fewer distinct nonempty timed starts than the base target, the actual sealed count is `min(base target, distinct timed starts)`. The sparse-reference exception requires at least three anchors, at least one in each duration third, a deterministic generator result, and a pre-lock private packet hash; otherwise the item is ineligible for timestamp scoring. The actual count is disclosed per item and is never pooled as if it were the base target.

For A1 preservation, error is the absolute difference between the locked input-sidecar cue start and the normalized output segment start containing the matched utterance. For A3 accuracy, it is the difference from the independent reference start. Report the reference role, actual/target count, match rate, median error, p90 error, and unmatched count. Unmatched anchors stay in coverage/citation denominators. An A1 preservation-anchor result must never be relabeled audio-relative timestamp accuracy.

## 7. Gate 3 normalization requirements

On identical locked input, two planned normalization runs must produce the same canonical-output SHA-256. The result must preserve ordered segments, source and normalized timing, language, caption kind, method, source URL/ID, explicit completeness, and version identifiers. It must not imply that item-level search is segment-level search.

Required parser fixtures cover SRT and VTT cues, multiline text, Unicode, overlapping/repeated cues, hours-long timestamps, malformed timing, empty cues, and partial input. A format error must be deterministic and recoverable; it cannot silently discard or invent text/timing.

Gate 3 evidence is valid only when the sealed generator/verifier rechecks the exact five Gate 1 positives, four rejection controls, five repeat artifacts, all 14 write-once operator receipts, source/reference/normalized/options/score/database hashes, scorer bytes and semantics, canonical normalized hashes, model-input identity, zero-activity counters, and one verified A/B seal. The result is written once to the canonical decision path, records an operator-derived timestamp, and becomes model-admissible only after it is committed, clean, and Git-bound. A manually composed or self-asserted pass document is never authoritative.

## 8. Conditional local Gate 4 enrichment protocol

The only eligible candidate is the exact local Qwen3-8B Q4_K_M GGUF revision executed by the exact frozen Apple-arm64 `llama.cpp` CLI release. One model is within the cap of four; it does not provide a comparative model ranking. Its official source/revision/license, byte size and SHA-256, runtime archive digest, executable/library hashes, prompt, schema, settings, resource stops, and offline command are frozen in `model/`. Availability or successful loading is not a quality result.

If Gates 1 and 3 pass, run one primary cell for each of the five eligible normalized transcripts under the same seal. The acceptance contract is:

- same private normalized transcript representation, prompt, native JSON Schema, temperature, seed/sampling settings, output limit, reasoning setting, context policy, and truncation/oversize stop for every item;
- exact local model/runtime; CLI process mode only; no HTTP listener, provider, external transfer, alias, automatic routing, fallback, tool execution, or transcript-selected instruction;
- actual runtime/model/config hashes, process status, latency, peak resource evidence, attempts, input/output hashes, and zero-network/zero-transfer counters recorded truthfully;
- structured-output validity ≥90% on first attempt and 100% after at most one sealed format-only retry; no manual edits or model fallback; every segment/timestamp reference must exist and be semantically relevant; and
- every failure remains in the five-cell denominator.

The single allowed retry applies only to a schema-invalid serialization and appends the already sealed format-only repair instruction without changing content, model, prompt contract, schema, or limits. Runtime/resource/content/grounding failures receive no retry.

## 9. Blind qualitative evaluation

Evaluator A and evaluator B are fresh local `llama-cli` processes using the same pinned Qwen model under distinct frozen prompts, seeds, and blinded ordering. Each receives an exact-five packet that omits method, model, provider, price, latency, private paths, file names, and run order, and neither sees the other result. One optional fresh adjudicator process receives only deterministically identified A/B disputes after both results are final. No role has tools, network access, an external provider, or external content transfer. Packet assignments, contracts, prompts, schemas, claims, results, and process attestations are hash-bound and preserved privately. Same-model-family evaluator bias is a material reproducibility limitation; the roles are not statistical or human independence. All AI scores are **provisional pending human stakeholder review**.

The packet/result verifiers require the exact five fixed items, every exact claim/citation/rubric decision, bounded evidence references, role identity, chronology, runtime/prompt/schema/sandbox bindings, and trusted wrapper-supplied execution attestation. Pooled and macro rates, denominators, threshold states, Gate 4 outcome, and Gate 5 trigger state are recomputed by the deterministic aggregator from the verified role results; an evaluator cannot enter or override them.

### 9.1 Material-claim support

A material claim could change understanding, action, attribution, causality, quantity, chronology, or recommendation. Each claim is fully supported, partially supported, unsupported, or contradicted. Only fully supported claims count. Report both pooled claim support and macro per-item support with denominators and 95% Wilson intervals where meaningful.

### 9.2 Critical hallucination

A critical hallucination is an unsupported or contradicted claim materially misstating safety, rights/policy status, identity/attribution, a numerical result, chronology, recommended action, or source evidence. Required count: zero.

### 9.3 Timestamp citation accuracy

A citation is correct when its interval, clipped to the item duration, intersects the locked evidence interval expanded by ±5 seconds and supports the claim. A missing required citation counts once as incorrect. Report pooled and macro per-item accuracy; preserve items with zero citations in the coverage analysis rather than awarding an automatic perfect score.

### 9.4 Key-point coverage

Each rubric separates text-groundable key points from visual-only key points. A point counts only when essential meaning is present without contradiction. Report text, visual-only, overall, pooled, and macro coverage separately. Transcript-only output is never penalized for a visual-only point in the text-groundable denominator.

### 9.5 Adjudication

The deterministic dispute detector sends every A/B metric-decision disagreement to the single optional adjudicator, including claim support, citation correctness, key-point coverage/cause, and critical-hallucination decisions. This stricter rule contains every threshold-changing or material disagreement and prevents a crossed set of small differences from evading review. Preserve both originals and rationales alongside each adjudicated decision. If there is no disagreement, no adjudicator process is eligible.

## 10. Locked thresholds

| Measure | Pass threshold |
|---|---:|
| A1/A3 primary success, 10 eligible positives | ≥90% first attempt |
| A1/A3 primary success, fewer than 10 eligible positives | 100%; directional only |
| Reference/input token coverage | ≥95% per successful cell |
| Timestamp-anchor match | ≥90% per successful cell |
| Clear-audio A3 WER | ≤15% |
| Challenging-audio A3 WER | ≤25% |
| Median timestamp error | ≤3 seconds |
| Gate 4 schema validity | ≥90% first attempt; 100% after one format-only retry |
| Material summary claims fully supported | ≥95% pooled and macro |
| Critical hallucinations | 0 |
| Timestamp citation accuracy | ≥90% pooled and macro |
| Text-groundable key-point coverage | ≥80% pooled and macro |
| Truthful, recoverable failure states | 100% |
| Expected-safe-rejection controls without circumvention | 100% |

Gate 5 requires a sealed, otherwise-valid transcript-only Gate 4 baseline below 80% macro visual-only coverage due solely to missing visual evidence. The single visual approach would then need ≥20 percentage-point macro visual-only uplift and ≥10 percentage-point macro overall uplift without breaking any other threshold. Pre-run state is `Not triggered / Not run`. If the measured trigger fires but no already sealed, rights-authorized visual approach/media set exists, record `Triggered but blocked / Not run`; do not add an approach after results are visible.

## 11. Security and development fixtures

The sealed, publication-safe safety set and its executable evaluator are separate from the real-video corpus and excluded from acquisition rates. It includes:

- invalid host, malformed ID, playlist, live/scheduled, unavailable/private redirect, and unsupported media;
- private, loopback, link-local, metadata-service, DNS-rebinding, redirect, IPv4-mapped IPv6, and arbitrary-fetch attempts;
- oversized/repetitive subtitle, excessive cues, malformed timestamps, and false-completeness input;
- transcript prompt injection, secret extraction, tool invocation, malicious HTML/Markdown/URLs, and false timestamp citations.

Required controls are host/video-ID allowlisting; validation of every redirect and resolved address; strict input/media/duration/cue limits before expensive processing; transcript-as-data separation; no transcript-directed tools; schema and semantic-reference validation; output sanitization; tenant/credential isolation; safe logs; enforceable retention/deletion/export/indexing rules; and provider data-policy enforcement.

Publication-safe synthetic `DEV-*` unit/integration fixtures may run before the seal solely to develop and validate the prospective tools; they never use real corpus content and never enter any primary denominator. One optional post-seal `DEV` smoke may prove that the exact frozen harness and external deny-network boundary still start correctly. Any configuration, scorer, protocol, or harness change learned from that smoke invalidates the seal and requires a new Commit A/Commit B before primary runs.

## 12. Two-commit seal

Self-referential hashes in a file being hashed are prohibited. Locking uses two commits:

1. **Commit A — content freeze.** Contains the final protocol, corpus manifest, human and machine method matrices, rights evidence, attestations, reference ledger/hashes, scorers, schemas, executable safety fixtures/evidence contract, output-independent evaluator packet generator/forms/result schemas/aggregator/execution-transfer contract, exact run plan, machine-readable pre-seal readiness and authority boundary, completed independent pre-lock review with closure, A1 harness, local model package/harness, complete tracked `src/` runtime tree, dependency manifests, and runtime record. Output-dependent evaluator packets are created only after Gate 4 outputs and therefore are not Commit-A inputs. Commit A contains no primary experimental output and no unresolved placeholder. After Commit A, its frozen files are immutable for that benchmark version.
2. Compute SHA-256 for every frozen artifact from the exact Commit A tree.
3. **Commit B — seal.** Adds only `benchmark/LOCK.json`, validated against `LOCK.schema.json`, recording Commit A’s full SHA, every frozen path/hash, exact denominators, Gate 1–6 eligibility states, runtime/model versions, and creation timestamp. It may not alter or add any other file.
4. No primary command may start before Commit B exists and `verify-lock` confirms direct A→B ancestry, the checked-out files, protected history/worktree, complete runtime source tree, dependency manifests, model/harness/tool trees, machine-matrix/ledger/attestation semantics, independent-review closure, and Node/V8/Unicode/ICU/tsx/platform/architecture match the seal. Later result commits may add evidence files outside protected trees but cannot change or add protected runtime/model/tool/harness files.

`PRESEAL_READINESS.json` is the machine authority for Commit-A readiness and for the governance boundary. `BENCHMARK_PROTOCOL.md`, `RUN_PLAN.md`, `METHOD_ITEM_MATRIX.json`, `REFERENCE_LEDGER.json`, the local derivation authorization ledger, the local model runtime ledger, `EVALUATOR_EXECUTION_CONTRACT.json`, `PRESEAL_READINESS.json`, and Commit B's `LOCK.json` control immutable prospective claims. `RUNNING_LOG.md`, `MASTER_EXECUTION_INDEX.md`, `TRACKER.md`, `DECISION_LOG.md`, `SPIKE_REGISTER.md`, and `RISK_REGISTER.md` remain post-seal mutable only to append history, evidence links, and result status; they may not redefine a frozen denominator, gate, cap, attempt, right, threshold, or authority. A conflict is resolved in favor of the verified lock and frozen machine authority.

Changing a frozen corpus item, right, source, method state, denominator, scorer, fixture, prompt, schema, model, provider, evaluator assignment, threshold, or run setting invalidates all not-yet-completed primary work and requires a new two-commit seal. Results from different seals are never pooled silently.

## 13. Required reporting

For every planned cell, preserve state, first-attempt outcome, recovery outcome, failure, retry, exclusion reason, version, hash, latency, spend, and missing evidence. Report per-item and per-class values, macro and pooled metrics where specified, and Wilson intervals for proportions when useful. Never generalize beyond the declared class.

The final report must name blocked/not-run gates, distinguish verified behavior from inference and recommendation, carry the USD 0 ledger, state that AI qualitative evaluation is provisional, and expire no later than 90 days after final verification.

## 14. Pre-seal checklist

- [x] Focused audit v2 complete.
- [x] Acquisition candidates and excluded methods declared.
- [x] Gate 2 trigger and Gate 5 uplift rule declared.
- [x] Gate 4 conditional eligibility and Gate 5 not-triggered state declared.
- [x] First-attempt, recovery, preservation, WER, anchor, qualitative, and schema rules declared.
- [x] Ten real source-associated videos and the absence of a safe real restricted control recorded without claiming YouTube-side equivalence.
- [x] Every rights/authorization dimension is provisionally classified for private research; production/legal-policy review and version-association limits remain explicit.
- [x] Five eligible timestamped preservation oracles are finalized outside Git and hashed, with role/independence explicit; four rejection inputs remain in their locked denominator.
- [x] Gate 2 is not triggered; independent speech references are zero and WER/audio-relative timestamp accuracy are not applicable/not run.
- [x] Every method×item cell and denominator is exact, with no post-result exclusion.
- [x] Gate 2 is marked not triggered; no STT implementation or media download is authorized.
- [x] Scorers, schemas, safety fixtures, reference ledger, write-once A1 operator, Gate 3 generator/verifier, exact-five packet/result/adjudication contracts, deterministic aggregate/Gate 5 calculator, evaluator execution contract/runner, local model package/harness, pre-seal readiness authority, candidate-tree inventory, and exact run plan complete and internally validated.
- [x] Protocol and all lock inputs pass independent adversarial review.
- [ ] Commit A created with no experimental output.
- [ ] `LOCK.json` generated, validated, and committed as Commit B without changing Commit A inputs.
- [ ] Lock verification passes before the first experimental command.
