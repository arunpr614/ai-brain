# Transcript and Tool Recommendation v1 — Independent Adversarial Review

**Review date:** 2026-07-16<br>
**Reviewer role:** Independent adversarial research reviewer<br>
**Artifact reviewed:** `2026-07-16_transcript-tool-research-recommendation_v1.md`<br>
**Verdict:** **REVISE — do not approve v1 or seal Gate 1**

The strategic direction is sound, but v1 conflates a feasible sidecar-import strategy with current-product readiness and presents target controls as if the shipping path already implemented them. Gate 1 is legitimate only as an isolated, egress-observed sidecar-import feasibility test.

## Required status corrections

| Area | Correct status |
|---|---|
| ACQ-1 | Controlled strategy-feasibility candidate: user-supplied timestamped sidecar import. Not automatic YouTube acquisition. Current product not ready. |
| ACQ-2 | Creator/editor-only official API path; blocked/not run pending OAuth, compliance, lifecycle, and an authorized test identity. |
| ACQ-3 | Rejected under this project’s production posture; desk classification only. Do not make universal claims that the software itself is unlawful. |
| Gate 1 pass | Establishes isolated ACQ-1 strategy feasibility only. It cannot yield Go/Limited-go for the current product. |
| Gate 2 STT | Candidate inventory only; no preferred implementation until the locked trigger is met. |

## Findings

### P0 — v1 describes proposed attestation as current behavior

The multipart route accepts item ID, title, language, and file but no rights/retention attestation. Service inputs likewise contain no attestation fields. The policy layer automatically records `rights_basis=user_provided_transcript` and `retention_class=full_text_allowed`.

Required locked attestation:

- principal/user ID and authority role;
- underlying-content and transcript-rights bases;
- source-origin enum: original pre-YouTube sidecar, official Studio export, synthetic, or explicitly licensed third-party source;
- rights-evidence reference/hash and exact version-equivalence evidence;
- permissions for storage, normalization, quotation, derivation, embeddings, and provider transfer;
- retention class, expiry/deletion trigger, acceptance timestamp, and policy version; and
- separate consent for later external-model enrichment.

### P0 — full application startup is not an isolated A1 test

User transcript repair schedules or resets an enrichment job. Full application instrumentation starts enrichment and other background workers; the enrichment worker has no environment enablement gate and probes its configured provider before claiming a job. Disabling only transcript recovery is insufficient.

Required harness:

- fresh disposable database with locally seeded YouTube-shaped items;
- no URL-capture or metadata path;
- both transcript-recovery flags disabled before process start;
- direct parser/service invocation without full instrumentation;
- enrichment, embedding, backup, note-index, batch, and other workers/providers absent or stubbed;
- no credentials, cookies, provider keys, or unrelated secrets loaded;
- deny and observe egress; fail on any attempted YouTube, Google, OpenRouter, LLM, model-host, or other outbound request.

### P1 — current parser can silently produce false-complete partial output

Invalid UTF-8 is replacement-decoded, malformed cues/blocks can be skipped while the file still succeeds, timestamps lack sufficient finite/safe/duration/order bounds, raw-byte SHA is absent from stored provenance, and multipart parsing buffers before the service file-size check.

Gate 1 requires fatal UTF-8 decoding; no unreported cue loss; input/output cue counts; explicit completeness; raw-byte and normalized hashes; finite safe timestamps with `end > start`; frozen order/overlap/duplicate policy; duration/cue/request limits; and fixtures covering BOM/Unicode/bidi, VTT settings/markup/entities, SRT variants, duplicates/overlap/out-of-order/zero/huge timing, mixed valid+invalid cues, MIME/extension mismatch, and oversize inputs.

### P1 — “authorized user” is not a rights basis

Possessing a subtitle or having YouTube edit permission does not by itself prove permission to retain, derive, quote, embed, or transfer it. Creator-owned sidecars, official Studio exports, synthetic fixtures, and third-party files require separate classes. Third-party/public files must fail absent an explicit grant.

### P1 — Gate 1 scope was overstated

A parser/sidecar pass is not automatic YouTube acquisition, and there is no eligible three-way behavioral comparison when ACQ-2 is blocked and ACQ-3 is desk-rejected. Results must be separate:

- `isolated_strategy_feasibility`;
- `current_product_readiness`; and
- `automatic_youtube_acquisition = not evaluated`.

A pass may justify continued remediation/design only.

### P1 — lifecycle enforcement is missing

Retention columns do not prove expiry or revocation. Transcript text is duplicated into `items.body` and can flow to FTS, chunks/vectors, summaries, chapters, quotes, tags/entities, jobs/results, caches, logs, exports, benchmark artifacts, and backups. A source-specific deletion graph must test immediate logical deletion separately from backup expiry. YouTube’s API-data refresh/delete rules must not be copied onto independently supplied sidecars without source-specific analysis.

### P1 — derived-data posture needs an output matrix

The June 2026 [derived metrics/storage policy](https://developers.google.com/youtube/terms/derived-metrics-policy) describes some amendment/audit-controlled analytics uses; it does not clearly authorize persistent transcript summaries, chapters, quotes, or embeddings. Raw captions, normalized text, summaries, chapters, quotes, tags, entities, embeddings, search indexes, and aggregate metrics each require `permitted`, `prohibited`, or `unresolved` status with a governing source.

### P1 — official API production planning is incomplete

The repository adapter accepts a caller-supplied raw token and makes deterministic selection depend finally on API input order. No active OAuth/consent/revocation route or user-visible caption-ID selection exists.

A future plan needs minimum scopes, CSRF state/PKCE where applicable, exact redirects, preferably one-time online access, encrypted tokens if unavoidable, channel/user binding, tenant isolation, reauthorization/revocation, model-transfer consent, explicit caption ID, frozen `tfmt=vtt`, no silent translation/fallback, hashes/provenance, public-app verification, and quota accounting. One list+download pair costs 250 units, roughly 40 pairs within the common 10,000-unit daily allocation before other API use.

### P1 — the corpus must validate sidecar import, not YouTube caption availability

Each sidecar requires exact origin, rights, source↔YouTube version equivalence, format, encoding, byte hash, cue count, duration/language, expected outcome, and reference hash. Never query the unavailable/private control during A1. With fewer than ten eligible positives, require 100% and label the result under-powered.

### P1 — no preferred Apple-Silicon STT exists yet

`faster-whisper` relies on CTranslate2, whose macOS ARM path is CPU-based; WhisperX uses faster-whisper and is not an independent engine. [`whisper.cpp`](https://github.com/ggml-org/whisper.cpp) has direct Apple Silicon/Metal/Accelerate/CoreML support and belongs in a future candidate screen. If Gate 2 triggers, freeze no more than two implementations—likely faster-whisper CPU and whisper.cpp Metal/CoreML—with the same model family/settings and exact dependency/model hashes.

## Verified v1 claims that may remain

- `captions.list` returns metadata, requires OAuth, and costs 50 units.
- `captions.download` is edit-permission scoped, costs 200 units, and supports the documented output formats.
- Caption resources distinguish ASR, forced, and standard tracks.
- Current Developer Policies support the documented undocumented-API, scraping, audiovisual-download, deletion/refresh, and derived-data concerns.
- The listed package versions/headline licenses were current on the review date.
- Rejecting InnerTube/downloader behavior is defensible as this project’s production posture.
- Software licensing does not establish content or platform rights.

## Review integrity

The reviewer made no transcript, media-acquisition, or model-inference call and edited no project file. Findings were reconciled into recommendation v2 and the benchmark protocol; v1 is preserved.
