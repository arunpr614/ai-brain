# AI Brain → NotebookLM Synchronization — Decision Log

## D-001 — Work from an isolated research worktree

- **Date:** 2026-07-21
- **Decision:** Use the requested `Phase21-NotebookLM-sync` worktree on `research/notebooklm-sync`, based on refreshed `origin/main` commit `ad78d77495dcaa90f62aab038fe63ae95cf36862`.
- **Reason:** The matching source checkout contains unrelated user modifications. A separate worktree preserves them and gives the research PR a clean diff.
- **Evidence class:** Verified local Git state.

## D-002 — Do not propagate local environment files

- **Date:** 2026-07-21
- **Decision:** Do not copy or symlink `.env` files or credentials into the research worktree.
- **Reason:** Public research and code audit do not require credentials; the goal requires explicit account eligibility and an official local authorization flow before authenticated spikes.
- **Evidence class:** Scope and security constraint.

## D-003 — Gate implementation strategy on NotebookLM edition

- **Date:** 2026-07-21
- **Decision:** No API adapter or authenticated spike will be selected until consumer/Workspace NotebookLM is distinguished from Gemini Notebook Enterprise and the user's eligibility is known.
- **Reason:** Documented Gemini Notebook Enterprise Preview APIs do not by themselves establish a supported consumer NotebookLM API.
- **Evidence class:** User-supplied platform distinction plus completed official Google research; target-account eligibility remains unresolved.

## D-004 — Unofficial paths remain research-only

- **Date:** 2026-07-21
- **Decision:** Internal APIs, cookie-based connectors, and browser automation may be documented but will not be executed without separate user approval.
- **Reason:** These approaches carry account-security, policy, reliability, and maintainability risks outside the current authorization.
- **Evidence class:** Scope constraint.

## D-005 — Treat the nested parent repository as out of scope

- **Date:** 2026-07-21
- **Decision:** Run all Git and file operations from the nested AI Brain worktree root and never use broad add/status/cleanup operations from its `Arun_AI_Open_Brain` parent.
- **Reason:** The requested worktree is nested inside a separate dirty checkout of `arunpr614/open-brain-web`, where the whole `Phase21/Phase21-NotebookLM-sync/` directory appears untracked. Existing Phase 21 worktrees use the same pattern, but a parent-level operation could accidentally absorb or disturb unrelated work.
- **Evidence class:** Verified local Git state.

## D-006 — Keep two supported architecture lanes through Gate 0

- **Date:** 2026-07-21
- **Decision:** Carry a direct Gemini Notebook Enterprise Preview API lane and a consumer/Workspace Google Docs/Drive staging lane. Do not map paid consumer or ordinary Workspace tiers onto the Cloud API.
- **Reason:** Current Google documentation exposes `v1alpha` notebook/source management only for the separately licensed Cloud product. Current consumer help describes periodic/on-open Drive-source refresh after import, without an observation API or freshness SLA.
- **Evidence class:** Official Google documentation.

## D-007 — Reject one-source-per-item as the default

- **Date:** 2026-07-21
- **Status:** Partially superseded by D-015 and council v2: aggregation remains preferred, but no Enterprise cadence is selected.
- **Decision:** Model daily aggregation for Enterprise and a bounded rolling Google Doc for consumer/Workspace as the leading strategies. Per-item sources remain a traceability comparator, not the default recommendation.
- **Reason:** The Enterprise 300-source limit is exhausted in 30, 6, or 3 days at 10, 50, or 100 items/day; lower consumer tiers are tighter. The API also has no documented idempotency key or source-update operation.
- **Evidence class:** Official limits plus capacity arithmetic.

## D-008 — Do not execute an unofficial consumer connector in this goal

- **Date:** 2026-07-21
- **Decision:** Retain unofficial connectors as documented contingency research only. Do not install, authenticate, or execute one without separate approval.
- **Reason:** Every reviewed consumer connector relies on undocumented internal RPCs or browser automation backed by bearer-equivalent Google session state. Current release histories demonstrate recurring interface breakage.
- **Evidence class:** Primary open-source repositories, releases, and security documentation.

## D-009 — Limit the MVP to new eligible items after connection

- **Date:** 2026-07-21
- **Decision:** The first feasible product scope is append-only synchronization of new explicitly eligible items created after the connection baseline. Historical backfill, edits, and deletions are excluded.
- **Reason:** Current item state has no trustworthy ordered content cursor, general content version/hash, or deletion tombstone.
- **Evidence class:** Verified current-code audit and adversarial review.

## D-010 — Split Enterprise and Drive success semantics

- **Date:** 2026-07-21
- **Decision:** Enterprise may report `Synced` only for an exact mapped source in documented `COMPLETE` state. Consumer/Workspace may report only `Drive document updated — NotebookLM refresh unverified` unless the user supplies a separate manual observation.
- **Reason:** Consumer NotebookLM exposes no supported refresh-observation API; Enterprise processing status is observable but create idempotency is undocumented.
- **Evidence class:** Official Google documentation plus adversarial review.

## D-011 — Keep internal identity and content hashes local

- **Date:** 2026-07-21
- **Decision:** Do not publish raw AI Brain item IDs or deterministic content hashes in NotebookLM/Drive payloads. Use a connection-scoped opaque HMAC operation marker only when remote reconciliation needs a marker; sanitize public URLs.
- **Reason:** Raw correlators violate data minimization and can disclose equality or private URL data.
- **Evidence class:** Security/adversarial review.

## D-012 — Gate 0 asks only lane-selection facts

- **Date:** 2026-07-21
- **Decision:** Do not ask for target URLs/IDs, project numbers, screenshots, schedules, content policy, or edit/delete preferences during initial eligibility. Request only edition/entitlement, synthetic-target permission, official local-auth ability, and consumer manual-import acceptance.
- **Reason:** Extra fields do not select the first safe spike lane and unnecessarily invite sensitive account data into chat.
- **Evidence class:** Data-minimization review.

## D-013 — Continue credential-free validation while Gate 0 is unresolved

- **Date:** 2026-07-21
- **Decision:** Run only local synthetic mapping, file-backed SQLite lifecycle, fake-provider failure/recovery, fake authorization-state, and mathematical capacity cases while the one Gate 0 response remains pending. Make no Google call and create no remote object.
- **Reason:** These cases reduce architecture and safety uncertainty without requiring account facts, credentials, undocumented behavior, production data, or external mutation.
- **Evidence class:** Scope constraint plus reviewed spike protocol.

## D-014 — Require conclusive absence before any ambiguity retry

- **Date:** 2026-07-21
- **Decision:** After a potentially accepted create, an exact zero-result lookup permits one ambiguity retry only when a supported provider surface supplies a conclusive visibility horizon and it has elapsed. Otherwise the item stops at `manual_reconcile`.
- **Reason:** A temporarily invisible accepted source is indistinguishable from a rejected write. Treating a non-conclusive zero as absence can create duplicates.
- **Evidence class:** Credential-free lost-response and delayed-visibility simulation; official Enterprise absence semantics remain unverified.

## D-015 — Defer the product; preserve one gated research lane

- **Date:** 2026-07-21
- **Decision:** Product decision **Defer**, with High confidence. Gate 0 may later authorize one applicable official synthetic research lane only; a passing one-source/one-Doc spike cannot authorize a user-facing build.
- **Reason:** All three independent PMs found the application-side model credible but the supported account lane, live provider contract, aggregate knowledge outcome, token/privacy boundary, capacity/retention, and cleanup unproven.
- **Evidence class:** Three independent PM memos plus integrated council v1, independent adversarial review, and revised v2.

## D-016 — Do not create conditional product artifacts under Defer

- **Date:** 2026-07-21
- **Decision:** Do not create PRD, UX/UI, HTML product prototype, or production technical-plan artifacts.
- **Reason:** The governing brief permits those artifacts only after Go or Limited-go. Producing them now would manufacture unsupported downstream certainty.
- **Evidence class:** Scope gate plus final council decision.

## D-017 — Gate 0 authorizes exactly one selected resource

- **Date:** 2026-07-21
- **Decision:** Interpret the already-issued Gate 0 request conditionally. After edition selection, authorize either one private Enterprise test notebook or one consumer/Workspace test notebook plus one app-created Doc—never both lanes by default. Do not repeat the request.
- **Reason:** The original combined resource question was broader than needed to select one official lane.
- **Evidence class:** Council v1 adversarial finding P2-3 and v2 correction.

## D-018 — Publish only the deferred, publication-safe decision

- **Date:** 2026-07-21
- **Decision:** Publish the sanitized NotebookLM research page and six navigation/catalog updates to the live GitHub Wiki, preserving all newer live-only pages and making no product-availability claim.
- **Reason:** The research decision is useful documentation, but repository sources were behind the live Wiki. A fresh-baseline reconciliation avoids replacing unrelated remote work.
- **Evidence class:** Fresh Wiki clones at baseline `317e40e8de08fc492e0e2662b5f45b8bb7e48fcd` and published commit `6b0e90a91d374dc88a746ab6b11a1dcf2c091d3c`; 90-page privacy/link verification and live HTTP 200.

## D-019 — Deliver for review without merge

- **Date:** 2026-07-21
- **Decision:** Deliver the research package on `research/notebooklm-sync` through draft PR [#36](https://github.com/arunpr614/ai-brain/pull/36), leave it open and unmerged, and close the current goal at Defer without treating the absent Gate 0 response as authorization to broaden scope.
- **Reason:** The brief permits review-only delivery and makes downstream product artifacts conditional on Go/Limited-go. Defer completes the current product decision while retaining authenticated evidence as an explicit re-entry gate.
- **Evidence class:** Final delivery validation, live Wiki verification, and pull-request state.

## D-020 — Treat consumer one-click export as a separate, narrower decision

- **Date:** 2026-07-21
- **Decision:** Preserve the broad automatic/daily synchronization decision as **Defer**, while evaluating the user's clarified one-item, one-click, one-preconfigured-consumer-notebook feature independently.
- **Reason:** Explicit item selection and a frozen per-click payload remove discovery cursors, schedules, and aggregation from the first test. They reduce but do not eliminate source-capacity, frozen-snapshot retention, cleanup, unsupported-interface, and credential risks.
- **Evidence class:** User clarification plus current-code and architecture audit.

## D-021 — Select `teng-lin/notebooklm-py` as the repository foundation

- **Date:** 2026-07-21
- **Decision:** Rank `teng-lin/notebooklm-py` first for the one-click consumer export adapter. If one local synthetic feasibility spike is separately authorized, pin stable `v0.7.3` tag commit `a6c54417058bd5e43e0162dd93a390308d2f99f6` plus the package artifact hash behind an AI Brain-owned narrow local worker. Treat reviewed main commit `45fd4258e608fbb9685496f26cfcea48810c44ee` / `0.8.0rc1` and its experimental localhost REST server as reference/spike material until a stable `0.8` release is re-reviewed. This is not a product Go/Limited-go decision.
- **Reason:** It uniquely combines the complete notebook/source/readiness contract with operation-aware `NON_IDEMPOTENT_NO_RETRY` handling for copied-text creation. Other leading candidates either apply generic retry behavior or lack a text-specific policy that blocks every post-send replay, so an accepted write whose response is lost can be duplicated.
- **Evidence class:** Static source inspection at pinned revisions plus S11's credential-free ambiguity contract; no third-party package or Google interface was executed.

## D-022 — Keep consumer Google credentials off the hosted AI Brain server

- **Date:** 2026-07-21
- **Decision:** Use a durable server queue and a local connector in any later authorized work. Prefer the existing Brain Chrome extension for the narrowest credential boundary; use a local `notebooklm-py` polling worker as the practical feasibility-spike dependency. Reject primary-account cookies, Playwright storage, or a headless master token on Hetzner, and do not expose a full MCP/CLI/REST surface to the browser.
- **Reason:** Consumer automation has no narrow OAuth scope. Local Google session material is bearer-equivalent and creates broad account blast radius if copied to a remotely reachable process. The durable queue also permits truthful `waiting for desktop connector` behavior for Android-originated clicks.
- **Evidence class:** AI Brain deployment/extension audit, Chrome extension security documentation, and third-party credential-path inspection.

## D-023 — Export the saved AI Brain snapshot as minimized copied text

- **Date:** 2026-07-21
- **Decision:** Freeze an allowlisted copied-text payload at enqueue time. Include title, body, and only sanitized public provenance; exclude raw internal identifiers, hashes, capture internals, credential-bearing/private URLs, summaries, quotes, and attached notes by default. Gate weak captures and version changed content explicitly.
- **Reason:** Copied text represents what the user actually reviewed in AI Brain. URL or YouTube refetch may differ, and original PDF bytes are not guaranteed to remain available. An immutable snapshot also survives in-place item repair without relying on an unreliable general update timestamp.
- **Evidence class:** Current AI Brain schema/capture/export audit, official consumer source documentation, and S11 mapping/privacy cases.

## D-024 — Never blindly retry an ambiguous copied-text create

- **Date:** 2026-07-21
- **Decision:** Coalesce by target/item/content/mapper version and put an opaque HMAC marker in the source title. After any potentially delivered failed response, reconcile by exact marker: adopt one match, stop in conflict on multiple, and remain unresolved on an inconclusive zero. Retry only when non-delivery is confirmed.
- **Reason:** Consumer NotebookLM exposes no copied-text idempotency key or documented conclusive visibility horizon. Exactly-once cannot be guaranteed, but AI Brain can prevent automatic duplicate amplification and represent uncertainty honestly.
- **Evidence class:** `notebooklm-py` idempotency contract plus S11 accepted-response-lost, zero-match, and multiple-match cases.

## D-025 — Retain target privacy, capacity, retention, and cleanup as rollout gates

- **Date:** 2026-07-21
- **Decision:** A one-source synthetic feasibility spike does not authorize real-content rollout. Any later product proposal must add an immutable target-binding version; expected-account and sharing-posture checks; safe target disclosure; plan-aware source occupancy/headroom; explicit payload bounds; durable concurrent-click uniqueness; bounded frozen-snapshot retention; cancellation; and recorded-ID cleanup states. Unknown sharing posture blocks non-synthetic content.
- **Reason:** Explicit clicking removes scheduling and aggregation but still creates a provider source per content version and another local content copy while work is unresolved. A correct write to a shared/wrong target is still a privacy incident.
- **Evidence class:** Independent final audit, existing capacity/security evidence, and revised S11 limitations.
