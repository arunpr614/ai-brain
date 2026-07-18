# YouTube Transcript and Enrichment — Decision Log

Decisions are append-only. A later correction supersedes an earlier entry without rewriting it.

## D-001 — Use the requested isolated worktree

- **Date:** 2026-07-16
- **Status:** Decided
- **Decision:** Use the requested Phase 21 directory as the clean research worktree.
- **Evidence:** The directory existed and was empty. The authoritative local checkout resolved to `https://github.com/arunpr614/ai-brain.git`; `origin/main` was fetched and independently matched GitHub at `ad78d77495dcaa90f62aab038fe63ae95cf36862`.
- **Consequence:** Unrelated modifications in the source checkout and personal-vault worktree remain untouched.

## D-002 — Use the brief's branch name

- **Date:** 2026-07-16
- **Status:** Decided
- **Decision:** Create `research/youtube-transcript-enrichment` from the refreshed `origin/main`.
- **Alternatives:** Repository history strongly favors `codex/*`, but no written rule requires it and the brief explicitly supplies this branch name.
- **Consequence:** Record the deviation from historical naming; do not rename without a concrete delivery reason.

## D-003 — Separate historical evidence from the prospective benchmark

- **Date:** 2026-07-16
- **Status:** Decided
- **Decision:** Treat existing YouTube implementation, tests, smoke reports, and research as audit/prior evidence only. Do not count them as results from the new locked benchmark.
- **Reason:** The current repository exposes prior outcomes before the new protocol can be frozen. Calling those results prospective or result-blind would be false.
- **Consequence:** The new corpus, run IDs, output hashes, and evaluation packets must be frozen before new method/model execution. Prior evidence may shape risks and candidate selection but cannot satisfy new benchmark thresholds by itself.

## D-004 — Prohibit experiments until the protocol lock

- **Date:** 2026-07-16
- **Status:** Decided
- **Decision:** No new live transcript acquisition, speech-to-text, OpenRouter/model, or visual run may begin while `benchmark/BENCHMARK_PROTOCOL.md` is marked Draft.
- **Consequence:** Audit and source research may continue. The lock commit must precede every new spike output.

## D-005 — Enforce zero incremental spend

- **Date:** 2026-07-16
- **Status:** Decided
- **Decision:** Spend USD 0 and create zero subscriptions. Existing free credits are not authorization.
- **Consequence:** Paid-only evidence is documented as missing or as a separately costed blocked experiment; it is not silently substituted with an assumption.

## D-006 — Accept the focused-audit v2 and narrow its P0

- **Date:** 2026-07-16
- **Status:** Decided
- **Decision:** Accept the focused-audit v2 and scope its P0 to shipping the active automatic InnerTube path unchanged.
- **Reason:** Independent review confirmed the active path’s policy/provenance blocker while correcting overclaims about manual rights, retention, retries, version history, input bounds, and concurrency.
- **Consequence:** Restricted creator-supplied or independently authorized-media strategies remain eligible for the prescribed gates; no current method is treated as feasibility-validated.

## D-007 — Use a two-commit benchmark seal

- **Date:** 2026-07-16
- **Status:** Decided
- **Decision:** Freeze all protocol/corpus/scorer/fixture/evaluator inputs in Commit A, then add `benchmark/LOCK.json` in Commit B with Commit A’s full SHA and the SHA-256 of every frozen file.
- **Reason:** A protocol cannot truthfully contain its own final content hash or commit ID. Separating content from the seal removes that self-reference and makes pre-result verification possible.
- **Consequence:** No experiment may begin until Commit B exists and a lock verifier confirms the checked-out frozen inputs match Commit A. Any frozen-input change requires a new two-commit seal.

## D-008 — Stop Gate 4 before inference

- **Date:** 2026-07-16
- **Status:** Blocked / Not run
- **Decision:** Make no enrichment-model calls under this goal.
- **Reason:** The zero-price free routes screened on 2026-07-16 did not provide a stable four-role ZDR roster or eligible free multimodal route, and the current adapter cannot enforce exact ZDR/route/schema/price controls or record provider/model/cost truthfully through enrichment.
- **Consequence:** Spend remains USD 0 and model calls remain zero. Gate 5 is not eligible. The product council must treat the missing comparison as a blocker, not as evidence of model quality.

## D-009 — Separate sidecar strategy feasibility from current-product readiness

- **Date:** 2026-07-16
- **Status:** Decided
- **Decision:** Evaluate A1 only in a locally seeded, direct-service, recovery-disabled, worker-free, egress-observed harness with explicit six-part attestation and fail-closed parsing. Record strategy and current-product outcomes separately.
- **Reason:** The current upload route collects no rights/retention attestation, auto-records policy fields, tolerates invalid UTF-8/malformed cue loss, and can coexist with default-enabled legacy recovery. Its repair call also schedules enrichment; full application instrumentation starts an ungated enrichment worker that probes a provider even before claiming a job.
- **Consequence:** A passing sidecar preservation spike cannot support Go/Limited-go for the shipping route. Production readiness requires an explicitly reviewed future design; production implementation remains prohibited in this research branch.

## D-010 — Accept transcript/tool recommendation v2 and reject v1’s release trajectory

- **Date:** 2026-07-16
- **Status:** Decided
- **Decision:** Preserve v1, accept the independent `REVISE` verdict, and use v2 as the decision-bearing recommendation.
- **Reason:** v1 correctly rejected arbitrary public extraction but incorrectly described target attestation/completeness controls as current behavior, preferred an STT implementation too early, and allowed a sidecar parser pass to imply a Limited-go trajectory.
- **Consequence:** Gate 1 can establish only isolated ACQ-1 strategy feasibility. Current-product readiness and automatic YouTube acquisition remain failed/not evaluated; ACQ-2 is blocked/not run; ACQ-3 is rejected for this production posture; Gate 2 has no preferred implementation until triggered.

## D-011 — Treat the supplied OAuth client as configuration evidence, not caption authorization

- **Date:** 2026-07-16
- **Status:** Blocked / Not run
- **Decision:** Inspect only the non-secret structure of the newly supplied Google OAuth client and keep A2 at zero calls/zero denominator for protocol v2.
- **Reason:** The client is a web application credential with no authorized redirect URI in its downloaded configuration. Even after that is corrected, official caption listing requires OAuth and caption download requires the consenting user to have permission to edit the exact video. No owned/editor-authorized test video or consent token is available.
- **Consequence:** The client ID and secret are never copied into Git or logs. A2 may be reconsidered only before Commit A if redirect, API enablement/quota, explicit consent, an editable non-sensitive video, and a sealed token/data-lifecycle plan are all verified. Otherwise it remains `excluded-before-run`; changing it after Commit A requires a new seal. Rotate the disclosed secret after exploration.

## D-012 — Separate A1 preservation oracles from independent speech references

- **Date:** 2026-07-16
- **Status:** Decided before results; pending lock-input adversarial review
- **Decision:** Require at least four trusted timestamped reference artifacts, but name their metric role. An A1 source sidecar is an input-preservation oracle only. WER and audio-relative timestamp accuracy require a separately produced independent speech reference and are mandatory only for A3.
- **Reason:** The corpus audit found that official NASA SRT and VTT files are serializations of the same cue set; calling either independent of the other would be false. A1's evaluated operation is authorized sidecar ingestion/normalization, for which exact input preservation is the relevant accuracy question. No experiment has run, so the distinction is frozen prospectively rather than changed after seeing results.
- **Consequence:** Protocol v2 will make no A1 speech-recognition/WER claim. If the two-part Gate 2 trigger does not fire, WER and audio-relative timestamp accuracy are `Not applicable / Not run`. If A3 becomes eligible, each A3 row must have an independent reference before Commit A or be excluded.

## D-013 — Bind A1 execution to the attestation and cap anchors by timed evidence

- **Date:** 2026-07-17
- **Status:** Decided before results; pending lock-input adversarial review
- **Decision:** Attestation schema 1.1 binds format, language, duration, cue count, last-cue coverage, completeness, and expected supported-class outcome. Eligible A1 inputs may be explicitly complete or partial, but never unknown. The base timestamp-anchor count remains `max(10, ceil(duration_minutes / 5))`; when a sparse source has fewer distinct nonempty cue starts, the sealed count is capped by that evidence, requires at least three anchors, and must still cover all duration thirds.
- **Reason:** Run-time flags must not be able to redefine a sealed cell. Separately, YT-01 has seven official timed cues, so ten distinct cue-start anchors would require inventing timing evidence. Preserving seven source-backed anchors is more rigorous than manufacturing three additional timestamps. No application-path experiment or primary result has run.
- **Consequence:** The harness rejects any option/attestation mismatch, rejects unknown completeness for eligible ingestion, and stops a predeclared safe-rejection before application imports. Every actual anchor count and private packet hash is frozen before Commit A; sparse counts remain an explicit power limitation rather than being pooled or hidden.

## D-014 — Correct the locked corpus denominator and evidence identifiers

- **Date:** 2026-07-18
- **Status:** Decided before results; independent pre-lock review pending
- **Decision:** Freeze ten stable real-item identifiers, A1 attestation schema 1.2, five A1 positive cells, four A1 safe-rejection cells, zero A2 cells, and zero A3 cells. Treat the resulting `5/5` positive and `4/4` rejection requirements as exact, per-cell denominators rather than as a broad success-rate estimate.
- **Reason:** Strict offline preflight established that YT-01, YT-02, YT-07, YT-08, and YT-09 are eligible for the declared VTT class; YT-03, YT-05, and YT-06 contain predeclared empty-text cue failures; YT-04 exceeds the 7,200-cue supported-class boundary; and YT-10 has no ingestible source sidecar. These are preparation facts, not candidate-method results.
- **Consequence:** Any first-attempt positive failure or any untruthful rejection fails Gate 1. The evidence is explicitly under-powered, affected by screening attrition, and limited to the five eligible source-published VTT inputs; it is not a prevalence, market-coverage, SRT, arbitrary-public-video, or production-readiness claim.

## D-015 — Make the machine-readable denominator and independent review part of the seal

- **Date:** 2026-07-18
- **Status:** Decided before results; implementation and review closure pending
- **Decision:** Add a machine-readable method-by-item matrix and require the lock verifier to reconcile it with the reference ledger, attestation set, lock denominator totals, gate eligibility, exact runtime identity, protected worktree, and a completed independent pre-lock review.
- **Reason:** A file-hash-only seal can preserve the wrong but internally plausible denominator. The seal must prove both byte identity and the cross-artifact semantic invariants that decide which cells may run.
- **Consequence:** Commit A is prohibited until the independent reviewer closes every P0/P1 finding and every machine-readable reconciliation test passes. Commit B may add only `LOCK.json`; any protected-file or denominator drift invalidates the seal and requires a fresh A/B pair.

## D-016 — Supersede D-008 with one zero-spend local Gate 4 candidate

- **Date:** 2026-07-18
- **Status:** Decided before inference; conditional on Gate 1 and Gate 3
- **Decision:** Supersede D-008's inference stop only for one frozen local text candidate executed through an exact, hash-verified `llama.cpp` runtime and Qwen3-8B Q4_K_M model package. Keep external provider transfer, aliases, fallback routing, multimodal work, and all model inference prohibited until the seal verifies and Gates 1 and 3 pass.
- **Reason:** A reproducible Apple-arm64 local path became available at USD 0 after D-008. It can enforce offline execution, a fixed prompt and JSON Schema, exact settings, and truthful runtime/model hashes without transferring corpus text to an external provider. Availability is not evidence of quality, latency, or production suitability.
- **Consequence:** Gate 4 has one conditionally eligible, single-model comparison cell set rather than an exact-four-model requirement. Its small-corpus, quantization, single-machine, and single-model limits must be reported. Gate 5 remains conditional on a measured visual-only coverage trigger; no visual approach is pre-authorized merely because a local text model exists.

## D-017 — Keep Gate 6 and the product council mandatory for every outcome

- **Date:** 2026-07-18
- **Status:** Decided
- **Decision:** Run Gate 6 evidence synthesis and the three independent PM reviews followed by council v1, adversarial review, and v2 whether upstream gates pass, fail, are blocked, or are not triggered. Only downstream PRD, UX/prototypes, and technical implementation planning are conditional on a council `Go` or `Limited-go` decision.
- **Reason:** A `Defer` or `No-go` outcome still requires an evidence-bound decision, supported-input classification, risk/cost/security assessment, disagreements, and an exit/revalidation path.
- **Consequence:** Upstream failure stops dependent experiments, not governance. No missing gate may be upgraded by inference, and no downstream product package may be manufactured for a `Defer` or `No-go` result.

## D-018 — Close D-015 implementation while preserving the independent-review stop

- **Date:** 2026-07-18
- **Status:** Machine implementation complete; independent review closure still pending
- **Decision:** Supersede only D-015's historical “implementation pending” status. Machine matrix 1.1 now derives Gate 2 from both per-item authorization booleans and records its non-prevalence scope; lock schema 1.4 binds protocol 2.4 from both frozen protocol headers, separates 9 source-sidecar records into 5 preservation references and 4 rejection records, and makes a fired Gate 5 trigger blocked because no visual method/media is sealed.
- **Reason:** Exact hashes cannot correct ambiguous labels. Positive denominators, preparation records, scoring references, safe-rejection records, and conditional trigger outcomes must remain separate machine-verifiable concepts.
- **Consequence:** Implementation completion does not authorize a seal or run. Commit A remains prohibited until the final integrated tests pass and the independent reviewer closes every P0/P1 against these exact bytes; any later frozen change requires that review to be refreshed.

## D-019 — Supersede the “machine implementation complete” status after formal review

- **Date:** 2026-07-18
- **Status:** Remediation in progress before results
- **Decision:** The formal No-Go review showed that D-018's completeness statement was too broad. Commit-A readiness additionally requires a derived Gate 3 evidence chain, write-once A1/scorer/repeat operation, exact-five blinded packet/result/adjudication/aggregate contracts, a pinned local evaluator execution boundary, and machine-enforced pre-seal readiness. Output-dependent evaluator packets remain post-Gate-4 artifacts and are not Commit-A inputs. Unsealed protocol 2.4 incorporates these pre-result control remediations; its thresholds, denominators, gate states, caps, rights boundary, and candidate roster are unchanged.
- **Current evidence:** Gate 3 generation/model admission, reference-ledger schema enforcement, readiness enforcement, and A1 write-once operation are implemented on synthetic fixtures. Blinded orchestration, final integrated counts, authority-document reconciliation, and same-reviewer closure remain pending. No primary, API, provider, model, STT, media, or visual run has occurred.
- **Consequence:** No self-authored result may unlock Gate 4, no primary evidence may be overwritten or post-selected, and no Commit A or primary run is authorized by this decision. Protocol 2.4 may become final only after the exact remediated package passes integrated validation and the same reviewer records closure.

## D-020 — Require public write-once attempt authority across A1, Gate 3, and Gate 4

- **Date:** 2026-07-18
- **Status:** Decided before results; independent hardening validation in progress
- **Decision:** Bind every A1/Gate 3 cell to one canonical seal-scoped public attempt claim, preserve successful outcomes in exclusive private receipts and caught failures in separate public terminals, require all 14 successful claims plus the generated Gate 3 result to be committed, clean, and identical to `HEAD` before model admission, and make the Gate 4 package/role claim chain plus the sole finalizer the only qualitative-result authority. An adjudicator may claim an attempt only after both A/B public terminals and their complete private chains verify, and the finalizer must reject any missing, extra, linked, replaced, or incorrectly typed evidence entry.
- **Reason:** Private-root exclusivity alone cannot prevent two same-user processes from selecting different roots, and a structurally plausible terminal is not proof of the private evidence it summarizes. Independent hardening also showed that crash-durable claims, exact tree enumeration, and preclaim validation order are part of first-attempt integrity rather than optional operational polish.
- **Consequence:** A public claim consumes the canonical attempt even after a hard termination; an automatic rerun under the same seal is prohibited. Preclaim validation failures must create no adjudication claim, private role directory, packet, or child process. These controls remain prospective and do not authorize Commit A, a primary run, or inference until focused tests, independent review, integrated validation, and same-reviewer formal closure all pass. Copied repositories, malicious deletion or forgery by the same user, and hostile administrator access remain explicit procedural/audit limitations.

## D-021 — Supersede D-019/D-020 implementation-validation status without authorizing the seal

- **Date:** 2026-07-19
- **Status:** Mechanical implementation validation complete; Commit-A authorization remains machine- and reviewer-governed
- **Decision:** Supersede only the current-status clauses in D-019 and D-020 that say integrated remediation or independent hardening validation is still in progress. The stabilized publication-safe synthetic evidence is 289/289 benchmark-tool tests across 18 suites, including the unskipped production-shaped SEALED path, plus 20/20 A1-harness tests and 29/29 local model-harness tests, for exactly 338/338. Typecheck, full lint, strict schema/reference/link/privacy checks, and candidate-tree diff/inventory checks are green. The prospective mechanisms now include durable public preclaims/terminals, exact Gate 3 derivation, consent-before-side-effect Gate 4 execution, strict A/B/adjudication evidence, atomic aggregate publication, strict machine-JSON decoding, and sealed synthetic app/SQLite/scorer/receipt exercise.
- **Correction evidence:** One intermediate final-development model-harness run failed 0/28 in fixture setup because the synthetic database retained single-newline paragraph joining and the old `development` environment after the frozen contract required double-newline joining and `lab`. Only the synthetic fixture was aligned to the already-frozen contract; the corrected suite passed 28/28, and an added malformed-runtime-ledger regression established the final 29/29. This failed validation is preserved rather than hidden and is outside every primary denominator.
- **Boundary:** No real/private corpus transcript body, primary benchmark cell, OAuth/API/provider request, external model call, local Qwen inference, media/STT/visual method, paid spend, or subscription was used. No `LOCK.json`, primary decision/council output, Commit A, or Commit B exists at this decision. Publication-safe synthetic text was exercised as declared.
- **Consequence:** This entry does not itself claim machine readiness or independent closure and authorizes no experiment. Exact Commit-A eligibility remains controlled by `PRESEAL_READINESS.json`, the reviewed `REFERENCE_LEDGER.json`, the protocol checklist chronology, and the same reviewer's exact closure marker. After those controls pass, only Commit A is authorized next; the LOCK-only Commit B and successful verification must still precede Gate 1.

## D-022 — Record the sealed Gate 1 failure and stop dependent execution

- **Date:** 2026-07-19
- **Status:** Decided after sealed execution; reconciled council v2 complete; publication package not yet committed
- **Decision:** Accept the valid prospective-input seal at content Commit A `6b829798101a59fadd9a1d0efd65428539f400ad` and lock-only Commit B `0ed1b13729802f4ded921f1a94369ddc110dabc3`, with lock SHA-256 `bef4437a05ac20418a49f3c06a99a1f74ad93c9395dcc780d1c0307aa354b8c3`. Record Gate 1 as **Fail**: 3/5 eligible first attempts passed while all 4/4 predeclared rejection controls passed. Preserve both eligible failures, permit no retry, repair, replacement, or denominator removal, and stop every dependent experiment under this seal.
- **Gate consequences:** Gate 2 was not triggered at 1/10 (10%). Gate 3 was ineligible, Gate 4 was blocked, and Gate 5 was not triggered; none ran. Gate 6 remained mandatory and completed with 18 narrow passes, 8 known gaps, and 7 not-applicable checks, plus exact 5/5 unavailable/retry and 11/11 A1 CLI integration suites. Production safety/readiness did not pass.
- **Boundary:** The seal proves the identity, chronology, and protected-tree integrity of prospective inputs. It does not by itself seal the later claims, terminals, gate narratives, council documents, or private receipts. Those post-seal artifacts remain uncommitted at this entry and require separate schema/link/privacy validation, a result commit, and unchanged-lock verification before delivery. Scoped execution remained at zero external/API/provider/model/STT/visual calls, zero subscriptions, and USD 0; the two public failure terminals do not expose per-cell network counters and are not safety passes.
- **Council and delivery consequence:** All three independent PMs and council v1 recommend **Defer**. The adversarial review returned Revise; reconciled council v2 records **No-go / not approved** for the current automatic route and any present supported-product claim, with **Defer** limited to separately authorized future exact-class research. No PRD, UX/UI or HTML prototype, technical implementation plan, merge, or deployment is authorized or created. Wiki publication, branch push, and the review-only pull request remain pending. Credential rotation/revocation remains an explicit owner action before any future OAuth work; no credential value or local credential location may enter repository evidence.

## D-023 — Publish the bounded research result for review and close in-scope delivery

- **Date:** 2026-07-19
- **Status:** Decided and delivered for review; unmerged and not deployed
- **Decision:** Accept post-seal result commit `01059dbd57d38d9b9ae1d63f121e85502c3b7ee2` as the Git publication binding for the nine claims, two terminals, six gate decisions, council chain, and reconciled governance. It remains later history than the prospective Commit A/B seal and does not expand the seal's scope.
- **Validation evidence:** Official verifier 3.3.0 remains valid for all 653 frozen files at the result commit. Claims are 9/9 schema-valid, terminals are 2/2 schema-valid, Markdown links/master reachability and publication privacy pass, TypeScript and lint pass, A1/model harnesses pass 20/20 and 29/29, and the Commit-A checkout passes the complete 17/17 production-shaped A1 operator file. The current sealed checkout's 288/289 benchmark-tools result has one disclosed pre-seal-only test that fails closed because `LOCK.json` correctly exists; no primary cell was rerun.
- **Publication consequence:** Publish the sanitized Wiki at `317e40e8de08fc492e0e2662b5f45b8bb7e48fcd`, push `research/youtube-transcript-enrichment`, and open draft review-only PR [#35](https://github.com/arunpr614/ai-brain/pull/35) against `main`. The Wiki was remote-head concurrency-checked and fresh-clone verified; the rendered research page returned HTTP 200. Do not merge or deploy under this decision.
- **Remaining boundary:** Research is complete — not implemented. Credential rotation/revocation, private-data deletion/backup-expiry evidence by 2026-10-14, and an explicit current-route product-owner/security/legal-policy disposition remain owner actions outside this delivery. No PRD, UX/prototype, implementation plan, production change, paid spend, or new subscription is authorized.

## D-024 — Keep the YouTube package outside the historical Feature Council Wiki generator

- **Date:** 2026-07-19
- **Status:** Decided after review-only PR CI diagnosis
- **Decision:** Add `docs/feature-council/youtube-transcript-enrichment` to the global Feature Council Wiki manifest's explicit excluded-source roots, alongside other independently governed feature packages. Do not add the 54 July research documents to a generator whose fixed artifact source, evidence date, lifecycle labels, and notices describe the 2026-06-28 planning package.
- **Evidence:** Initial PR #35 Agent documentation and Product CI checks both failed only because the manifest's 44 declared sources no longer exactly matched the non-excluded Markdown corpus. After the explicit exclusion, `smoke:agent-docs` and the full `check:agent-docs` chain pass: 44/44 generated historical pages, 118-file privacy scan with zero findings, 86/86 reachable Wiki pages, 238 inventory rows, 46 feature rows, 155/155 package scripts, and 17,989 project-inventory rows with no findings. Official seal verification remains valid for 653 frozen files.
- **Boundary:** The exclusion is not a publication or validation exemption. The YouTube package remains governed by its own master reachability, strict schemas, privacy scan, Wiki concurrency/fresh-clone checks, and draft review-only PR. No benchmark input, result, council decision, production code, live Wiki commit, merge, or deployment changes under this decision.
