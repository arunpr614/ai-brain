# YouTube DOM Capture Planning Package - Final Report

**Date:** 2026-07-22<br>
**Package status:** Final V2, ready for implementation sequencing<br>
**Implementation status:** Not implemented by this planning package<br>
**Production decision:** No-go for browser-visible transcript capture<br>

## Objective And Outcome

The objective was to turn the approved research idea into an implementation-ready product and technical package for a small, explicit-click, DOM-first YouTube transcript path inside the existing Brain Chrome extension. The work had to include independent product and architecture input, V1 artifacts, adversarial review, disposition of every actionable finding, final V2 artifacts, an isolated worktree, a user-experience prototype, and GitHub delivery.

The final decision is deliberately narrower than a general YouTube extractor:

1. The existing extension may inspect an already-visible transcript only after a user clicks `Inspect visible transcript`.
2. Inspection remains local and sends nothing.
3. A second explicit click confirms saving the reviewed capture to a separately controlled Brain lab.
4. Every extension action literally named `Save link` uses a true metadata-only route.
5. Synthetic and local implementation may proceed after its named gates are built.
6. A retained live canary remains conditional on platform, privacy, lab-isolation, and Phase 0-5 evidence.
7. Production browser capture remains disabled pending a separate decision and scoped credential design.

## Final Artifacts

| Artifact | Purpose |
|---|---|
| [PRD V2 final](2026-07-22_ai_brain_youtube_dom_capture_prd_v2_final.md) | Product behavior, consent, states, gates, acceptance, ownership, and rollout posture |
| [Implementation plan V2 final](2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v2_final.md) | Architecture, contracts, migration, concurrency, privacy, tests, phases, and rollback |
| [Review resolution matrix](2026-07-22_youtube_dom_capture_review_resolution_matrix.md) | Finding-by-finding proof that V1 feedback changed V2 |
| [Interactive UX prototype](prototype/2026-07-22_ai_brain_youtube_dom_capture_ux_prototype.html) | Click-through extension experience and failure states |
| [Prototype QA](prototype/2026-07-22_ai_brain_youtube_dom_capture_prototype_qa.md) | Interaction, viewport, screenshot, and hash evidence |

The package [README](README.md) inventories the V1 drafts, specialist inputs, specialist reviews, adversarial reports, V2 finals, prototype, and screenshots.

## Review Process

- A product-manager specialist defined user value, success measures, scope, consent, and release gates, then reviewed PRD V1.
- A technical-architect specialist reviewed the proposed trust boundaries, data flow, schema, concurrency, extractor, diagnostics, and rollout plan.
- The `adversarial-review` skill independently reviewed both V1 core artifacts and produced timestamped Markdown reports.
- Every actionable finding was consolidated into the resolution matrix before V2 was designated final.
- No actionable P0 or P1 remains an open planning question. Some resolved requirements are intentional implementation or rollout blockers until their evidence exists.

## Material V2 Corrections

- Removed every pre-consent transcript-detection claim and prohibited DOM access or telemetry before inspect.
- Replaced global cue deduplication/sorting with ordered viewport-overlap proof that preserves repeated cues and fails on gaps or identity drift.
- Added top-frame, document, URL, video, renderer, panel, and track pinning plus scroll restoration.
- Added a bearer-only, exact-origin, versioned transcript endpoint with a streamed `2 MiB` request cap.
- Moved text, hash, timing, request hash, policy, and caption-class decisions to the server.
- Added immutable route receipts, one-active-source enforcement, item content revisions, recovery claim/CAS, and stale async-writer rejection.
- Split live validation into a separate worker-disabled lab DB/data root with an active processing hold, no provider credentials, AI-off notes, and a maximum seven-day target retention.
- Made the production marker authoritative, with immediate server disable as the forward-release rollback path.
- Restricted diagnostics to typed aggregate outcomes without content, URLs, account data, correlatable identifiers, IP address, or user agent.
- Added a target-specific platform determination before any live inspection and retained the production no-go.

## Prototype Result

The prototype demonstrates the two-click consent flow, true link-only choice, review disclosure, committed receipt, and five fail-closed states. It was exercised in Chrome at desktop and mobile sizes. No horizontal overflow or incoherent overlap was observed, and all simulated failure paths state that nothing was sent or saved.

The prototype is intentionally inert: it does not read YouTube, use an account session, call Brain, or persist data.

## Repository Validation

| Check | Result |
|---|---|
| TypeScript | Pass |
| ESLint | Pass |
| Full product test suite | Pass: `895/895`, `95` suites, zero failed/skipped/todo |
| Production application build | Pass; existing `unpdf import.meta` warning remains |
| Existing extension production build | Pass with Vite `6.4.2` |
| Environment ignore check | Pass |
| Agent documentation/privacy/structure/coverage gates | Pass; no findings |
| Prototype interaction and responsive QA | Pass for the documented throwaway scope |
| Relative-link, privacy, and diff-integrity checks | Recorded in the publication update below |

Dependency installation reported pre-existing audit debt: the root package reported six advisories (`1` moderate, `4` high, `1` critical), and the extension package reported one high-severity advisory. No forced dependency update was made in this documentation-only change.

## GitHub Publication

- Repository: `arunpr614/ai-brain`
- Base commit: `c8c3c215d1a5125c95ce0750895c956cca84da3f`
- Branch: `codex/youtube-dom-capture-prd-v2`
- Initial package commit: `c000d7c`
- Pull request: [#41 - docs(plans): finalize YouTube DOM capture product plan](https://github.com/arunpr614/ai-brain/pull/41)
- Protected checks: see PR for the latest result; all local gates listed above passed before publication
- Production/runtime changes: none

## Residual Risks And Next Decision

- YouTube DOM structure can drift without notice; drift must fail closed and stop an active canary.
- DOM-visible text cannot independently prove a manual-versus-ASR track class, so V0.1 stores `unknown` rather than inferring it.
- A shared bearer is acceptable only in the isolated single-user lab boundary described here. A scoped, rotatable extension credential is a production prerequisite.
- Platform terms, copyright, privacy, and retention decisions must be target-specific and current before live use.
- The implementation work has broad concurrency and policy impact despite the small UI; migration and stale-writer gates are not optional.

The next authorized milestone is the PR sequence in the V2 implementation plan, beginning with governance/baseline evidence and the true link-only route. Live or production enablement is not part of that authorization.
