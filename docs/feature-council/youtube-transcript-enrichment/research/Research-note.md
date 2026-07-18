# YouTube Transcript and Enrichment — Research Note

**Status:** Pre-seal research in progress — not implemented; primary runs prohibited<br>
**Started:** 2026-07-16<br>
**Base:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`
**Reconciled:** 2026-07-18<br>
**Expiry:** 2026-10-14, or earlier after a material policy, API, tool, runtime, model, or corpus change

## Current question

What is the best compliant, reliable, secure, and cost-effective implementation strategy for producing a timestamped transcript and grounded enrichment when AI Brain saves a supported YouTube video?

The answer may be Go, Limited-go, Defer, or No-go. “Supported” must name an evidence-backed video class; it cannot mean arbitrary public YouTube content by implication.

## Current facts

- A clean, isolated worktree now exists on `research/youtube-transcript-enrichment` from refreshed `origin/main`.
- Current `main` already contains YouTube recognition/capture, transcript-recovery jobs, policy/provenance tables, transcript segments, manual transcript repair paths, owned-media speech-to-text scaffolding, enrichment, OpenRouter integration, search/indexing, and extensive historical documentation. The focused audit classifies each path and records the split between active unofficial automatic acquisition and policy-aware manual acquisition.
- Three historical YouTube branches were merged and are fully behind `main`.
- Draft PR #6 overlaps transcript recovery and repair but is open, conflicting, and not authoritative for current behavior.
- GitHub Wiki Git access is available.
- Historical smoke and research results were visible before the new benchmark protocol. They will not be relabeled as prospective evidence.
- No primary real-item transcript or model experiment has run under this research program. Publication-safe synthetic development tests have exercised only the prospective offline tools/harness and are excluded from every primary denominator.
- Current official documentation says `captions.list` returns metadata, while caption text requires `captions.download`, OAuth, and permission to edit the video. The official path is technically creator-authorized, not an arbitrary-public-video API.
- A newly supplied OAuth client is a web-application credential with no redirect URI in its downloaded configuration. It enabled a credential-safe desk check only: zero authorization tokens, API calls, and quota units. A2 remains blocked until redirect, consent, API enablement/quota, and an exact editable test video are verified.
- Current YouTube Developer Policies prohibit undocumented API use and scraping/obtaining scraped YouTube data. They also impose authorized-data refresh/deletion requirements and restrict new/derived data from API Data. Applying the derived-data language to transcript enrichment is an inference requiring compliance/legal review.
- The exact A1 candidate class is narrower than generic “creator-supplied SRT/VTT”: an authorized, source-published VTT with source-row association, a locked byte hash, explicit completeness, evidence-bound attestation, and no provider transfer. Five NASA VTTs are eligible for that class; three official VTTs are predeclared strict-structure rejections and one is a cue-limit rejection. The current product path is not production-ready: it lacks explicit attestation, fail-closed completeness, enforced lifecycle, and worker/provider isolation.
- The 10-item screening set produced five eligible A1 positives, four A1 rejection controls, and one no-sidecar NOAA coverage case. This attrition is a limitation, not evidence that 50% of YouTube videos are supported or that rejected structures are prevalent.
- Gate 2's prospective work-allocation trigger is only 1/10: one row lacks an authorized ingestible sidecar while having independently authorized source media. It fails both the ≥2-row and ≥20% requirements, so STT is not triggered and no speech reference/media/model is prepared.
- A hash-verified local `llama.cpp`/Qwen3-8B Q4_K_M package is prospectively frozen at USD 0 as the one conditional Gate 4 text candidate. Runtime/model availability makes no quality, latency, security, or production claim; inference remains prohibited until the two-commit seal verifies and Gates 1 and 3 pass.
- `youtube-transcript-api` 1.2.4 and `yt-dlp` 2026.7.4 remain technically capable tools, but their own documented mechanisms/reliability surfaces and the official policy evidence make them unsuitable production acquisition recommendations here.

## Consequential assumptions to verify

1. Any production-plausible future scope is narrower than “any public video”: the current evidence can address only the five-item source-published VTT class; official captions remain blocked/conditional; arbitrary public extraction is not a production candidate.
2. Speech-to-text is conditional on a supported and authorized audio path; model quality alone cannot unlock it.
3. Visual enrichment is likely valuable only for a small visually dependent class and must prove incremental value.
4. Current app code may contain partially implemented research scaffolding that is not active production behavior.

These are hypotheses/inferences, not conclusions.

## Immediate research lanes

- Validate the completed machine-readable `10/5/4/0/0/0` reconciliation, executable safety evidence, exact offline model package, protected-tree verifier, and final model-harness hardening as one pre-lock set.
- Obtain an independent pre-lock adversarial review and close every P0/P1 before Commit A; the same reviewer must confirm closure.
- Create and verify the exact Commit A/Commit B seal before Gate 1, then execute only the cells and conditional gates authorized by that seal.
- Preserve three separate outcomes throughout: `isolated_strategy_feasibility`, `current_product_readiness`, and `automatic_youtube_acquisition`.
- Complete Gate 6, supported-input classification, three independent PM reviews, council v1/review/v2, Wiki publication, research delivery, and final requirement audit even if an upstream gate fails.

## Prohibitions carried forward

No production code, dependency, migration, merge, deployment, subscription, paid spend, browser-cookie use, private content upload, access-control bypass, global tool installation, or copyrighted transcript/media commit. The user-supplied OAuth client may be used only for the explicitly requested, isolated official-API exploration after its prerequisites and lock are satisfied; identifiers, secrets, and tokens stay outside Git and publication-safe artifacts.
