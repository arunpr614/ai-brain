# Transcript and Tool Research Recommendation — v2

**Decision-bearing artifact:** Reconciled after independent adversarial review<br>
**Status:** Final research recommendation; Gate 1 not yet sealed or run<br>
**Verified/Reconciled:** 2026-07-18<br>
**Revalidate no later than:** 2026-10-14, and earlier after a relevant YouTube/API/tool/product change

## Executive recommendation

Proceed only with a controlled Gate 1 feasibility test of the narrower **source-published timestamped-sidecar** strategy frozen in the corpus. This is not YouTube transcript retrieval and does not validate a general creator/user upload contract. The current product is not production-ready because it lacks explicit rights/retention attestation, fail-closed completeness, enforceable lifecycle controls, and complete isolation from background recovery/enrichment workers. A Gate 1 pass may advance remediation and product design; it cannot itself support Go or Limited-go for the shipping route.

Do not plan automatic transcripts for arbitrary public YouTube videos. Keep the official captions API as a blocked creator/editor-only possibility pending OAuth, compliance, lifecycle, and authorized-identity work. Reject undocumented/download-based behavior under this project’s production posture. Treat local STT as an unranked conditional inventory until a rights-safe corpus triggers Gate 2.

This is a technical/policy recommendation, not legal advice or approval.

## Method decisions

| ID | Strategy | Current classification | What a result can prove |
|---|---|---|---|
| ACQ-SIDECAR (benchmark A1) | Authorized source-published SRT/VTT locally associated with the source page's exact YouTube link | **Controlled narrow strategy-feasibility candidate; current product not ready** | Isolated sidecar parsing/preservation with zero egress, not automatic YouTube acquisition, general upload support, or shipping readiness |
| ACQ-OAUTH (benchmark A2) | Official `captions.list` + explicit `captions.download` track | **Blocked / Not run** | Nothing until an OAuth-authorized editor identity, approved lifecycle, quota, consent, and compliance posture exist |
| X-UNOFFICIAL | InnerTube, `youtube-transcript-api`, `yt-dlp`, cookies/proxies, or public-web extraction | **Rejected before run; not one of the three experimental methods** | No behavioral production claim; avoid universal claims about tool legality |
| STT-LOCAL (benchmark A3) | Local transcription of independently authorized source-origin media | **Conditional inventory only** | Eligible only if the locked two-part Gate 2 trigger fires; never a YouTube audio-download path |

## ACQ-SIDECAR locked requirements

### Rights and consent

The **future general owner/user-upload contract** must record the principal and authority role; underlying-content and transcript-rights bases; original-sidecar/Studio-export/synthetic/licensed-third-party source class; evidence/hash and exact version equivalence; allowed storage, normalization, quotation, derivation, embeddings, and provider transfer; retention/expiry/deletion trigger; acceptance time and policy version; attribution; and separate consent for later external-model enrichment.

Protocol v2 tests a narrower official source-published class. Its attestations bind source page/asset, exact bytes, provisional private-research rights classification, mandatory production/legal-policy review, no provider transfer, expiry, attribution, source-row association, and explicit completeness. That narrower evidence contract must not be relabeled as validation of the future general upload contract.

An “authorized user,” a public file, or YouTube edit permission alone is insufficient. Third-party files fail closed without an explicit downstream grant.

### Isolated run posture

Use a fresh disposable database and directly seed YouTube-shaped items. Do not call URL capture or start full application instrumentation. Disable both transcript-recovery flags before process start; omit/stub enrichment, embedding, backup, note-index, batch, and other workers/providers; load no credentials/secrets; deny and observe egress; fail on every attempted external call.

### Parser/completeness posture

Require fatal UTF-8, zero unreported cue loss, raw/input and normalized-output hashes, input-cue/output-segment counts, explicit completeness, finite safe timestamps, `end > start`, frozen overlap/duplicate/order behavior, source-duration/cue/request limits, and pre-buffering bounds. Any malformed cue fails the whole file. Gate 1 fixtures must include Unicode/BOM/bidi, VTT metadata/settings/markup/entities, SRT variants, overlap/duplicates/out-of-order/zero/huge times, mixed valid+malformed cues, MIME mismatch, and oversize cases.

### Result fields

- `isolated_strategy_feasibility`
- `current_product_readiness`
- `automatic_youtube_acquisition = not evaluated`
- primary first-attempt outcome and separate recovery outcome
- zero-egress and zero-provider-attempt evidence

A strategy pass cannot overwrite current-product failure.

## ACQ-OAUTH conditions before reconsideration

Official facts remain: [`captions.list`](https://developers.google.com/youtube/v3/docs/captions/list) costs 50 units and returns metadata; [`captions.download`](https://developers.google.com/youtube/v3/docs/captions/download) costs 200 units and requires the authorized user to be able to edit the video. A future design must add:

- scope minimization, public-app verification, truthful disclosures, privacy policy, and contextual consent;
- CSRF state and PKCE where applicable, exact redirect allowlist, channel/user binding, tenant isolation, revocation/reauthorization, and protected token handling;
- explicit caption-ID/track selection, `tfmt=vtt`, no translation/silent fallback, and exact request/track/quota/hash provenance;
- a source-specific lifecycle and output matrix for raw captions, normalized text, summaries, chapters, quotes, tags/entities, embeddings, indexes, and metrics; and
- a written compliance determination for each retained/derived output, including whether a [derived-metrics amendment/audit path](https://developers.google.com/youtube/terms/derived-metrics-policy) applies.

The [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), [server-side OAuth guide](https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps), verification/token guidance, YouTube terms/policies, and quota costs are mandatory sources. No official API call is authorized in this research.

## Retention/deletion requirement

A future design must trace source revocation/deletion through raw file, normalized segments, `items.body`, FTS, chunks/vectors, summaries, chapters, quotes, tags/entities, jobs/results, caches, logs, exports, benchmark artifacts, and backups. Immediate logical deletion and backup expiry are distinct tests. An independently supplied sidecar follows its own grant; YouTube API data follows the applicable API rules. A stored retention label without an executor is not enforcement.

## Gate 2 inventory, not preference

Do not preselect faster-whisper or WhisperX. Gate 2 would require at least two selected rows, and at least 20% of the fixed corpus, to each satisfy `authorized_ingestible_sidecar=false` **and** `independently_authorized_source_media=true`. This is a prospective corpus work-allocation trigger, not prevalence or product coverage. The frozen result is only YT-10 (1/10), so no STT comparison is triggered. If a future prospective seal met both conditions, compare at most two Apple-M1-relevant local implementations. Current inventory leads are:

- [`faster-whisper`](https://github.com/SYSTRAN/faster-whisper) on CTranslate2 CPU; and
- [`whisper.cpp`](https://github.com/ggml-org/whisper.cpp) with Metal/Accelerate/CoreML as applicable.

Freeze the same model family/decoding settings, package/commit, transitive lock/SBOM, model repository/revision/license/hash, cache/download behavior, local compute/storage, and engineering friction. WhisperX may be considered only when a separate alignment/diarization benefit justifies its additional dependencies; it is not an independent ASR engine.

## Gate and council consequence

Gate 1 remains ineligible until the exact rights-reviewed corpus, sidecar hashes, method cells, references, fixtures, scorers, run plan, and two-commit seal exist. The prospective matrix now has five eligible positives and four real expected rejections; the eligible threshold is therefore 100% and the result remains under-powered. Never query an unavailable/private control during A1.

Even a passing ACQ-SIDECAR isolated spike advances only design/remediation evidence. ACQ-OAUTH is blocked, X-UNOFFICIAL is rejected, STT-LOCAL is not triggered, and any later blocked gate must remain visible. The council must carry those missing paths into its decision rather than manufacturing a three-way comparison.

## Final recommendation status

- **Preferred controlled research path:** ACQ-SIDECAR isolated source-published-sidecar strategy.
- **Current product readiness:** Fail / not production-ready.
- **Automatic YouTube transcript acquisition:** Not evaluated and not recommended under present evidence.
- **Official API:** Blocked / not run.
- **Local STT:** Conditional, not triggered or ranked yet.
- **Incremental spend/model calls:** USD 0 / 0.

The complete correction trace is in `2026-07-16_transcript-tool-research-recommendation_adversarial-review.md`; v1 remains preserved as the reviewed artifact.
