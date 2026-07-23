# AI Brain Item Recovery Manual Enrichment PRD V1

**Date:** 2026-07-22
**Status:** V1 for Product Council and adversarial review
**Owner:** AI Brain
**Product surface:** AI Brain item detail following item-bound YouTube transcript recovery
**Upstream dependency:** YouTube browser-visible transcript capture V2, migration 026, and processing-hold enforcement
**Decision:** Conditional go for prototype and isolated planning; no-go for production enablement

## 1. Summary

Add a manual **Enrich transcript** capability after an inspected YouTube transcript has been attached to the exact AI Brain item that requested it.

Transcript storage and AI processing remain separate permissions. Attachment creates a durable active transcript source and an active processing hold. The item then shows **Transcript added. AI processing is paused.** The user reviews the actual enrichment and embedding provider plan and explicitly authorizes one exact transcript revision. Only then may Brain release that hold and queue an interactive background job.

The action authorizes:

- an AI digest from the current enrichment input contract;
- key quotes, category, and AI topics;
- a semantic index from the full current transcript and generated digest.

It does not authorize:

- capture of another transcript;
- processing of a future transcript revision;
- title replacement;
- manual note inclusion;
- future Ask prompts;
- an undisclosed provider or model;
- production browser capture or production processing.

## 2. Problem

The item-bound Chrome recovery concept deliberately ends with the transcript stored and downstream AI processing held. This preserves the distinction between reading visible page content, storing reviewed content, and sending content to AI processors.

The current application cannot truthfully support that experience:

- `repairItemWithText()` sets enrichment and its job to `pending` immediately.
- The always-on worker claims any pending job.
- The nightly batch selector independently selects pending items.
- The current manual endpoint can reset broad state or call a provider inline.
- Enrichment and embedding results apply without source/revision/claim fences.
- Current UI calls pending **queued** and says repair already queued enrichment.

A UI-only button would therefore be misleading. The product needs a real held state and a revision-bound processing authorization.

## 3. Opportunity

The missing capability is a natural continuation of the existing recovery flow:

1. User asks Brain to recover one video's transcript.
2. User inspects the visible transcript in Chrome.
3. User attaches it to the exact item.
4. User returns to the item and separately decides whether AI Brain may create derived content.
5. Brain performs the approved work in the background and reports truthful stages.

This makes the transcript useful without collapsing browser access, storage, model transfer, and semantic indexing into one opaque action.

## 4. Users

### Primary

The AI Brain owner and authorized research operator who has attached a complete transcript and wants an AI digest and semantic retrieval while retaining explicit control over data transfer.

### Secondary

- Lab operator verifying authorized versus held jobs.
- Privacy/security reviewer proving no provider transfer occurs before authorization.
- Product owner reviewing aggregate success, failure, comprehension, and cleanup evidence.

### Not designed for P0

- Shared workspaces or multiple approvers.
- Administrator-forced processing.
- Delegated billing or provider selection.
- General workflow automation.

## 5. Jobs To Be Done

1. When my transcript is stored, let me decide separately whether AI may process this exact version.
2. Before I decide, tell me every processor, what it receives, and whether it is local or external.
3. Let me start durable work without keeping the item page or Chrome open.
4. Show whether the transcript is paused, queued, enriching, indexing, complete, or blocked.
5. If content or provider details change, stop instead of silently continuing.
6. Preserve the transcript and any successful digest when a later stage fails.
7. Never imply the whole video was summarized when the digest currently uses only a bounded prefix.

## 6. Product Principles

1. **Storage is not processing.** Attachment cannot imply provider authorization.
2. **Three choices remain three choices.** Inspect, Add, and Enrich are separate controls.
3. **Consent is exact.** It applies to one item, active source, content revision, provider plan, purpose set, limits, retention terms, and copy version.
4. **Name both processors.** Digest and embedding can use different providers.
5. **Queue truthfully.** A successful click creates durable work; it does not claim work is already running.
6. **No silent substitution.** Provider identity changes require renewed review.
7. **No stale apply.** Late output for old content is discarded.
8. **Partial success remains useful.** Indexing failure does not erase or regenerate a successful digest.
9. **Ask remains separate.** Index readiness permits future retrieval but does not itself make an Ask provider call.
10. **Production remains blocked.** The feature cannot bootstrap production browser processing.

## 7. Goals And Success Definition

### P0 goals

- Represent an attached browser-visible transcript as held and ready, not queued.
- Present a clear manual action in the AI Digest panel.
- Disclose both enrichment and embedding provider plans.
- Authorize one exact transcript revision through a durable, idempotent transaction.
- Execute in a user-priority background lane.
- Show truthful stage and recovery states on desktop and mobile.
- Fence every provider result against changed content, source, provider, generation, and claim.
- Preserve title, manual metadata, transcript, and successful partial output.
- Provide aggregate, content-free rollout evidence.

### Product success

- Zero unconsented claims or provider requests.
- Zero wrong-source, wrong-revision, or duplicate effective jobs.
- Zero silent provider/model substitutions.
- Zero stale output applies.
- Five of five moderated reviewers correctly explain all three permissions, both processors, bounded digest input, full-text embedding, and exact-revision scope.
- Approved deterministic fixtures complete the full chain 100%.
- Approved lab jobs complete at least 95% excluding declared provider outage/quota windows.

## 8. Non-Goals

- Enrichment from the Chrome side panel.
- Automatic enrichment after transcript attachment.
- A generic **Enrich now** shortcut to the current endpoint.
- User selection of provider, model, queue lane, or retry policy.
- Processing metadata-only, incomplete, inactive, or unheld sources.
- Title rewrite or title suggestion.
- Full-transcript summarization under P0.
- Future Ask request authorization.
- Inclusion of manual notes.
- Elective re-enrichment of a complete current revision.
- Cancellation after remote provider acceptance.
- Changing existing paste/upload behavior in this release.
- Production enablement or Chrome Web Store distribution.

## 9. Scope

### P0

- Active `browser_visible_transcript` source from fixture/local/test or manifest-authorized lab.
- Active processing hold for that source and current content revision.
- Item-level held state and action.
- Local and remote provider-plan disclosure.
- Remote review dialog/mobile sheet; local inline authorization.
- Idempotent authorization, hold release, and queue receipt.
- Immediate interactive background lane.
- Digest and semantic-index stages.
- Separate enrichment and embedding retries.
- Provider/content conflict states.
- Feature flags, production denial, audit receipts, aggregate metrics, cleanup.

### P1 candidates

- Apply hold-first behavior to pasted, uploaded, official, and owned-media transcripts.
- Full or representative long-transcript summarization.
- Digest-only and digest-plus-index choices.
- Re-enrich/refresh for complete revisions.
- Embedding-only reauthorization after provider changes.
- Queued cancellation.
- Remembered global provider consent with item override.

## 10. Eligibility

Show an active enrichment command only when the server proves all conditions:

1. Valid authenticated Brain session can access the exact item.
2. Item is a supported YouTube item.
3. Exactly one active `browser_visible_transcript` source exists.
4. Source is linked to a successful approved capture receipt and policy decision.
5. Source normalized text hash and current item body agree.
6. Active processing hold matches item, source, policy, hold reason, and current `content_revision`.
7. Held job generation exists and is not claimable.
8. No exact current-revision run is queued, running, indexing, or complete.
9. Provider plan is complete, approved, and displayable for both stages.
10. Browser-transcript processing and manual-enrichment feature gates are enabled.
11. Deployment is fixture/local/test or exactly manifest-authorized lab.
12. Production denial is false only through a separately reviewed code change, not configuration.

Never infer eligibility from `items.enrichment_state`, body length alone, missing summary, URL equality, client source claims, or button visibility.

### Ineligible presentation

| Condition | UI |
| --- | --- |
| No transcript | Existing recovery actions; no enrichment command |
| Transcript attached, no release policy | **AI processing remains paused**; no dead button |
| Provider plan incomplete | **AI enrichment is not configured** with Settings navigation |
| Current job queued/running | Stage status; no second action |
| Current digest and index complete | Render result; no P0 rerun action |
| Source/revision changed | Refresh to latest held state and require new review |
| Production browser item | Keep browser capture and processing unavailable |

## 11. End-To-End Experience

### 11.1 Transcript missing

The existing item recovery panel remains. Chrome recovery appears only in authorized research contexts. Paste/upload remain available according to existing policy.

AI Digest copy:

> Add a transcript before creating an AI digest for this video.

### 11.2 Inspect and attach in Chrome

The existing three-step extension flow remains Open, Inspect, Add. No provider details or enrichment state appears before attachment.

Review copy continues to state that attachment creates a research processing hold.

### 11.3 Extension attachment success

**Heading:** Transcript added
**Body:** 286 timed segments were added to the exact Brain item that started this request. AI enrichment has not started.
**Privacy:** No browser session data was shared. Caption type remains unknown.
**Primary:** Open item in Brain
**Secondary:** Done

Opening the item is navigation, not processing consent.

### 11.4 Held item

Item banner:

> **Transcript added from Chrome**
> The confirmed transcript is attached to this exact item. AI enrichment has not started.

AI Digest panel:

> **Transcript added. AI processing is paused.**
> Create an AI digest and semantic index for this exact transcript version.

The panel shows both processor summaries and a revisit-able **What is sent?** disclosure.

### 11.5 Local-only plan

When both stages run on the Brain server:

- Button: **Enrich on this Brain**
- Copy: **Ollama processes the digest and index on this AI Brain server. Transcript content is not sent to an external AI provider.**
- The visible inline disclosure is the authorization context; no second dialog is required.

Do not say **on this device** because Brain may run on Hetzner.

### 11.6 Any remote stage

Button: **Review and enrich transcript**

Desktop opens a focused dialog; mobile opens a review sheet. It contains:

- exact item and current transcript label;
- digest provider/model and local/external boundary;
- embedding provider/model and local/external boundary;
- exact data categories per stage;
- 12,000-character digest limit;
- full-text transcript chunk coverage for embedding;
- outputs stored in Brain;
- approved retention/deletion wording;
- explicit exclusions;
- exact-revision and future-Ask limits;
- queue behavior.

Actions:

- **Agree and queue enrichment**
- **Keep AI processing paused**

Focus begins on the review heading. Closing or canceling changes nothing. Focus returns to the invoking button.

### 11.7 Queue acknowledgement

After the transaction commits:

> **Enrichment queued**
> Brain will use the provider plan you reviewed. You can leave this page.

The UI must not say queued from an optimistic button state alone. Before receipt, it says **Starting enrichment...** and keeps the hold authoritative.

### 11.8 Processing

Named stages:

1. Queued
2. Creating AI digest
3. Digest ready, building search index
4. Ready for search and Ask

No percentage appears. Page refresh reconstructs state from durable rows.

### 11.9 Completion

Render summary, key quotes, category, and topics. Footer states the transcript is current and names both processors. Do not show a rerun action in P0.

### 11.10 Partial success

If indexing fails after digest success:

> **AI digest ready. Search indexing needs attention.**
> The digest is safe. Retrying the index will not call the digest provider again.

Primary: **Retry semantic indexing**
Secondary: **Check provider settings**

### 11.11 Changed transcript or provider

Provider change before start:

> **AI provider details changed**
> Nothing was sent. Review the updated plan before continuing.

Transcript change in flight:

> **Transcript changed while enrichment was running**
> The older result was rejected. Review the latest transcript before starting again.

Old output must never flash as current.

## 12. Provider And Data Contract

### Purpose set

- `youtube_transcript_digest`
- `youtube_transcript_semantic_index`

No other purpose is implied.

### Data inventory

| Data | Digest processor | Embedding processor | Stored in Brain |
| --- | --- | --- | --- |
| Source type | Yes | No direct field | Existing item |
| Title/current YouTube context | Yes | Included with chunks | Existing item; unchanged |
| Transcript | First 12,000 characters under current contract | Chunked full body | Existing source/body/segments |
| Generated summary | Output | Summary chunks | Digest |
| Quotes/category/topics | Output | Not separate fields | Digest/topics |
| Manual note | No | No | Separate and unchanged |
| Browser session/cookies/history/player/signed URLs | No | No | No |
| Stable Brain item/source/video/account identifier | No provider alias | No provider alias | Internal only |

### Provider-plan invalidation

Require renewed review when any changes:

- source/body/content revision;
- provider or model;
- endpoint local/external classification;
- OpenRouter downstream/fallback identity;
- purpose or received-data categories;
- prompt/index coverage limit;
- retention/delete-by terms;
- manifest authorization;
- consent copy or provider-plan version.

Temporary health changes do not invalidate identity but may produce retryable operational errors.

## 13. Output Contract

P0 writes:

- three-paragraph AI digest under the current bounded input contract;
- key quotes;
- category;
- auto tags/AI topics;
- current-version original-content and summary chunks/vectors;
- content-free usage and attempt records.

P0 does not write:

- a replacement item title;
- transcript/body/source/segments;
- manual tags, notes, collections, workflow fields;
- future Ask content.

The UI uses **AI digest**, not **complete video summary**.

## 14. Functional Requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| ME-F01 | P0 | Attachment creates a held, non-claimable state and no provider call. |
| ME-F02 | P0 | Extension and item UI explicitly say AI enrichment has not started. |
| ME-F03 | P0 | Command appears only for a server-proven exact held browser transcript. |
| ME-F04 | P0 | Both digest and embedding provider plans are visible before authorization. |
| ME-F05 | P0 | Local-only and remote review behavior follows the data-boundary rule. |
| ME-F06 | P0 | Disclosure states bounded digest input, full-text embedding, outputs, retention, and exclusions. |
| ME-F07 | P0 | Final action binds item, active source, content revision, input fingerprint, provider plan, purposes, limits, manifest, and copy version. |
| ME-F08 | P0 | Authorization receipt, exact hold release, and interactive job transition commit atomically. |
| ME-F09 | P0 | Mutation replay creates at most one effective job and never changes its binding. |
| ME-F10 | P0 | POST returns after durable queue receipt and never awaits a provider. |
| ME-F11 | P0 | Legacy bodyless and `force=realtime` requests perform no work. |
| ME-F12 | P0 | Interactive work never enters nightly batch selection. |
| ME-F13 | P0 | Workers require released hold, current source/revision, accepted plan, generation, and claim token. |
| ME-F14 | P0 | Every apply rechecks all gates and discards stale output without derived mutation. |
| ME-F15 | P0 | Manual path preserves item title, transcript, provenance, notes, workflow, collections, and manual tags. |
| ME-F16 | P0 | Provider-facing job/result aliases contain no stable Brain identifier. |
| ME-F17 | P0 | Status exposes awaiting permission, reviewing, queueing, queued, enriching, indexing, ready, retry, conflict, and blocked states. |
| ME-F18 | P0 | Digest and indexing are separate durable stages; indexing-only retry does not rerun digest. |
| ME-F19 | P0 | HTTP responses and logs use safe typed codes and never raw provider content. |
| ME-F20 | P0 | Desktop and mobile experiences remain usable without Chrome after attachment. |
| ME-F21 | P0 | Keyboard, focus, screen-reader, 200% zoom, high-contrast, and reduced-motion journeys pass. |
| ME-F22 | P0 | Production denial wins over flags, manifest, and environment overrides. |
| ME-F23 | P0 | Item deletion cancels authority and prevents in-flight output recreation. |
| ME-F24 | P0 | Analytics and operational logs contain only allowlisted content-free fields. |
| ME-F25 | P0 | Kill switches apply at authorization, claim, and apply. |

## 15. State Model

```text
transcript_committed
  -> awaiting_permission

awaiting_permission
  -> reviewing_plan       remote review opened
  -> queueing             local authorization or remote confirmation

reviewing_plan
  -> awaiting_permission  cancel/close/expiry
  -> queueing             confirm

queueing
  -> queued               atomic receipt + release + job commit
  -> awaiting_permission  pre-commit failure
  -> provider_review_required | content_changed | blocked

queued
  -> enriching
  -> content_changed | provider_review_required | blocked

enriching
  -> indexing             digest applies under all gates
  -> retryable_error | terminal_error | content_changed

indexing
  -> ready
  -> retryable_error | terminal_error | content_changed

retryable_error
  -> queued               same exact valid stage retry
  -> reviewing_plan       material binding changed
```

## 16. API Product Contract

### Read/status

`GET /api/items/:id/enrichment-status`

Returns private, no-store, display-safe fields:

- contract version and effective state;
- active transcript display metadata;
- current content/enrichment version labels;
- hold and job projection;
- both provider display plans and fingerprints;
- allowed action and typed blocked reason;
- stage, attempt, retry eligibility, and safe error code.

It returns no transcript text, internal policy document, claim token, provider endpoint, raw error, credentials, or legal approval ID.

### Authorize and queue

`POST /api/items/:id/enrich`

Strict `manual-enrichment-v2` JSON contains:

- UUID mutation ID;
- operation;
- expected content revision;
- active transcript source ID;
- provider-plan version;
- digest and embedding provider fingerprints.

The server derives all authority and configuration. Accepted effective requests return `202`; replays/no-ops return `200`; changed source/revision/provider returns typed `409`; mutation-ID mismatch returns `422`.

### Retry

Retry can use the same endpoint with a strict `retry_current_enrichment` operation. It reuses authorization only when every material binding remains identical; otherwise the UI reopens provider review.

## 17. Error And Recovery Copy

| Code | User copy | Recovery |
| --- | --- | --- |
| `provider_unavailable` | The enrichment provider is unavailable. Brain will retry. | Automatic retry |
| `quota_or_billing` | Provider quota or billing is blocking enrichment. | Settings/operator |
| `invalid_response` | The provider returned an unusable response. Your transcript was not changed. | Safe retry |
| `content_revision_changed` | This transcript changed before enrichment finished. The old result was discarded. | Review latest |
| `provider_plan_changed` | AI provider details changed. Nothing was sent under the new plan. | Review again |
| `indexing_failed` | The digest is ready, but semantic indexing failed. | Retry index only |
| `policy_expired` | This research approval expired before processing started. | Keep paused/operator |
| `manual_enrichment_disabled` | AI processing remains paused in this environment. | None |

Never render raw provider response, stack trace, prompt fragment, transcript fragment, item ID, source ID, token, or arbitrary error message.

## 18. Accessibility And Responsive Requirements

- Native buttons and dialog/sheet semantics.
- Minimum 44 px touch targets; existing compact desktop size may remain at least 32 px.
- Visible provider/privacy text linked with `aria-describedby`.
- Focus starts on review heading; cancel/close returns to invoking action.
- No automatic focus on an authorization button after Chrome return.
- Polite live announcements only on durable state changes.
- Alerts reserved for provider/content conflict and actionable failure.
- No focus theft when background work completes.
- No fabricated percentage or continuously resetting animation.
- At 320 CSS px and 200% zoom, provider/model names and actions wrap without clipping or horizontal scrolling.
- Reduced-motion path replaces pulsing/spinning motion with static status icons and text.
- High contrast and no-color modes retain explicit labels.

## 19. Metrics And Privacy

### Ship gates

| Metric | Gate |
| --- | ---: |
| Held claim before consent | 0 |
| Provider content request before consent | 0 |
| Wrong source/revision apply | 0 |
| Duplicate effective provider job after replay | 0 |
| Silent provider/model substitution | 0 |
| Stable identifier in provider alias | 0 |
| Stale output apply | 0 |
| Partial success represented incorrectly | 0 |
| Failed cleanup | 0 |
| Fixture transaction and chain completion | 100% |
| Consent comprehension | 5/5 reviewers |

### Allowed analytics

- environment class;
- fixed source class;
- stage/outcome code;
- local/external destination class;
- consent-copy version;
- coarse duration, size, and retry buckets;
- stale guard and cleanup booleans.

### Forbidden analytics/log fields

Any item/source/video/account/request/mutation/provider-request ID, URL, title, language, transcript, prompt, output, text hash, endpoint, raw provider error, IP, user agent, cookie, token, or signed resource.

## 20. Rollout

### Stage 0: Final artifacts and governance

Finalize V2 PRD/plan/prototype after adversarial review. Approve exact provider/model/purpose/retention/deletion manifest mode. All runtime flags remain off.

### Stage 1: Inert prototype

Moderated desktop/mobile/keyboard review using synthetic transcript and provider data.

Exit: five reviewers explain the three permissions, both processors, limits, and exact scope.

### Stage 2: Fixture/local implementation

Implement dependencies and flow with fake providers, then local-only provider execution. Prove all failure barriers, privacy scans, deletion, and rollback.

### Stage 3: One-item isolated lab canary

Separate instance, database, data root, credentials, manifest, and approved target. Run one full success, conflict, retry, partial success, and verified deletion sequence.

### Stage 4: Expanded authorized lab

At least 20 unique approved jobs across five approved standard watch videos, including long, multilingual, provider unavailable, revision change, and policy-expiry cases.

### Stage 5: Separate production decision

Production requires a new packet covering browser capture approval, provider terms, retention/deletion/backups, cost/quota, incident response, support, distribution, canary evidence, and an explicit code change.

## 21. Immediate No-Go Gates

Do not enable live processing if any is true:

1. Migration 026 or hold/revision enforcement is only documented, not implemented.
2. More than one active transcript source can exist.
3. Attachment can create claimable pending work.
4. Any realtime, batch, or embedding claimant ignores holds.
5. Any apply path lacks source/revision/provider/generation/token/input checks.
6. Generic legacy endpoint behavior can bypass a hold.
7. Interactive work can enter the nightly batch.
8. Either processor or actual data coverage is omitted from disclosure.
9. Model output can rename the item.
10. Stable IDs appear in provider aliases, logs, analytics, or errors.
11. Digest/index partial success is collapsed into false completion or total failure.
12. Deletion can be followed by in-flight recreation.
13. Feature disable is not checked at write, claim, and apply.
14. Rollback can start a hold-blind old binary.
15. Production can be enabled through configuration alone.

## 22. Risks

| Risk | Mitigation |
| --- | --- |
| User assumes Add already authorized AI | Explicit held copy in extension, banner, pill, and Digest panel |
| User overlooks embedding destination | Two visible provider rows and full review for any remote stage |
| User assumes whole-video digest | 12,000-character disclosure and **AI digest** terminology |
| Existing endpoint bypass | Replace contract and reject legacy modes |
| Provider changes after click | Fingerprint at status, POST, claim, and apply |
| Old result overwrites new transcript | Source/revision/input/generation/token fences |
| Item title changes unexpectedly | Manual path ignores model title output |
| Indexing failure reruns digest | Separate durable embedding job and retry |
| UI says queued before commit | Queue receipt is the only queued authority |
| Lab change reaches production | Code-level production denial and negative matrix |

## 23. Definition Of Done

- Product Council V2, PRD V2, implementation plan V2, UX spec V2, and final prototype resolve every recorded V1 finding.
- Upstream migration 026 dependency is explicit and cannot be bypassed.
- Every P0 functional requirement maps to implementation work and deterministic evidence.
- Prototype demonstrates full journey, local plan, remote review, no-action hold, provider change, transcript change, partial indexing failure, feature off, mobile, and production denial.
- Adversarial reports and resolution matrix are stored beside the artifacts.
- Package validates, is committed, pushed, reviewed through PR, and reports CI status.
- Implementation enablement remains separately gated.
