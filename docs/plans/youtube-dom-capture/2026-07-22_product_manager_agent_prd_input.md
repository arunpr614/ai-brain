# Product Manager Agent Input - YouTube DOM Capture

**Created:** 2026-07-22 13:28 IST<br>
**Agent:** Gibbs, product-manager reviewer<br>
**Mode:** Independent read-only repository audit<br>
**Verdict:** Production no-go; conditional go for fixture-only and allowlisted research<br>

## Evidence Inspected

- `docs/research/youtube-transcripts/2026-07-22_11-05-48_IST_ai_brain_chrome_companion_github_landscape_v1.md`
- `extension/src/popup.html`
- `extension/src/popup.ts`
- `extension/src/capture.ts`
- `extension/manifest.json`
- `extension/package.json`
- `src/app/api/capture/url/route.ts`
- `src/lib/capture/youtube.ts`
- `src/lib/capture/policy.ts`
- `src/db/transcripts.ts`
- `src/lib/capture/transcripts/recovery-options.ts`
- `src/db/items.ts`
- `src/lib/backup.ts`

## Priority Inputs

### P0

1. **Governance remains production-blocking.** The current research recommendation is fixture/lab only. A version-controlled decision must supersede that position before production work.
2. **Make `Save link only` truthful.** The current URL route still invokes legacy YouTube extraction and can queue transcript recovery. A link-only command must have an explicit metadata-only contract before the companion flow promises that fallback.
3. **Correct the policy model.** `lab_public_caption` can become production-allowed when a legal approval ID is present. Add a distinct `browser_visible_transcript` method and block it in production regardless of runtime configuration.
4. **Add two distinct consent actions.** Current popup behavior has one Save action. Inspection and transmission require separate user gestures.
5. **Keep caption source class honest.** DOM inspection does not prove manual versus ASR. Store `unknown` and do not claim this resolves the S02 `en:asr` evidence gate.

### P1

1. Define popup-close behavior and retry identity.
2. Define durable idempotent upgrade behavior.
3. Define complete typed states and support diagnostics.
4. Define accessibility, deletion, and backup-retention disclosures.
5. Reconcile no-identifier observability with existing URL capture logs that include `source_url`.

### P2

Defer Shorts, live streams, embeds/mobile routes, panel auto-opening, full transcript previews, broader localization, and Chrome Web Store distribution until the standard watch-page flow is stable.

## Recommended Product Definition

### Problem

Brain cannot safely use the transcript already visible in the user's authenticated Chrome session without manual copying or undocumented server-side YouTube interfaces.

### Primary Job

Save an analysis-ready transcript intentionally, understand when text is read and when it is sent, recover clearly when captions are unavailable, and upgrade a metadata-only item without duplication.

### Desired Outcome

A complete, timestamped, searchable transcript tied to the correct video, with inspectable provenance and no YouTube credentials crossing into Brain.

## Required User Journey

1. User opens a supported standard watch page, opens the transcript panel, and selects the desired visible language.
2. Popup may read tab title/URL but does not inspect transcript DOM.
3. User chooses `Inspect visible transcript`.
4. Review shows video identity, visible language label, segment/character counts, timing coverage, bounded completeness, and `source class: unknown`.
5. User chooses `Save transcript`.
6. Extension revalidates tab/video identity and sends the fixed-schema payload.
7. Receipt is `created`, `upgraded`, or `duplicate_same_transcript`, with `Open in Brain`.

Closing the popup discards inspected text. Retry while the popup remains open reuses the same request ID.

## Required State Families

```text
setup_required
unsupported_tab
ready
panel_not_open
transcript_unavailable
inspecting
review_ready
unsupported_dom
incomplete
navigation_changed
payload_too_large
saving
created
upgraded
duplicate
stale_review
unauthorized
policy_blocked
rate_limited
network_error
server_error
```

## Recommended Consent Copy

### Inspect

> Brain will read the transcript currently visible in this YouTube tab. The inspected text stays in this popup until you save it or close the popup.

### Confirm

> Saving sends the transcript text and cue times, video title and URL, visible language label, and your note to your Brain server.

### Boundary

> Brain does not send YouTube cookies, account identifiers, browser history, player responses, or signed caption or media links.

Avoid unqualified claims such as `no account data` or `complete YouTube transcript`. Access-limited content can reveal account context, and completeness is proven only against the bounded visible DOM.

## Product Requirements Added By Review

| Area | Requirement |
|---|---|
| Link-only | Context-menu and popup link-only capture perform no transcript fetch, inspection, or recovery scheduling. |
| Extraction | Isolated-world `chrome.scripting.executeScript`, `textContent` only, three stable passes, fail closed on missing/duplicate/truncated/changing cues or video identity. |
| Limits | 15 seconds, 150 scrolls, 7,200 segments, 500,000 normalized characters, 2 MiB request. |
| API | Dedicated bearer route rejects cookies, HTML, raw player response, media/signed-caption URLs, and unknown fields. |
| Persistence | Distinct `browser_visible_transcript` source with hash, segments, timing mode, visible label, extractor version, completeness evidence, and source class `unknown`. |
| Security | Add only `scripting`; keep token extension-local; no remotely hosted executable code. |
| Accessibility | Keyboard operation, visible focus, announced status, non-color-only states, 200% zoom/reflow, and at least 24px targets. |
| Testing | Extractor fixtures, popup states, API contract, idempotency, privacy/logging, deletion, and MV3 E2E. |

## Metrics And Guardrails

| Metric | Formula/gate |
|---|---|
| Inspection success | `review_ready / inspect_started`, segmented by extractor version and renderer; diagnostic only |
| Confirmed save success | `(created + upgraded + duplicate_same_hash) / confirm_started`; 100% in fixture matrix |
| False success | `wrong_video_or_incomplete_success / all_success_receipts`; hard gate 0 |
| Privacy violations | Identifier/content/session data in logs or analytics; hard gate 0 |
| DOM drift | `unsupported_dom / eligible_inspections`; stop after three consecutive known-layout failures or >5% once n >= 20 |
| Performance | 15-second hard timeout; canary p95 <= 10 seconds after at least 20 authorized attempts |
| Comprehension | User identifies when text is read, sent, and stored; research gate 5/5 moderated participants |

Do not optimize inspect-to-save conversion or transcript volume; those incentives conflict with informed consent.

## Rollout And Operations

1. Governance/data map.
2. Fixture-only extractor.
3. Disabled lab endpoint.
4. Extension/local-fixture E2E.
5. Allowlisted owned/authorized canary.
6. Separate production decision.

Kill switches are required in the packaged extension and server endpoint. Any privacy leak, wrong-video save, incomplete-success receipt, token exposure, or platform complaint stops the experiment.

Support diagnostics may contain only error code, extractor version, renderer class, elapsed-time bucket, and request ID. Selector changes must ship only through packaged extension updates.

## Contradictions Requiring Resolution

| Conflict | Required resolution |
|---|---|
| Current plans prohibit productized browser extraction | Preserve research-only state or explicitly supersede it through a new approved decision |
| Current URL route still runs InnerTube/extraction and recovery | Add a true metadata-only link capture contract before promising `Save link only` |
| Policy code can production-allow a lab method | Unconditionally block browser research methods in production |
| DOM cannot prove manual/ASR | Persist `unknown`; keep S02 separate |
| Existing URL logs include source URLs | New flow must use allowlisted aggregate diagnostics and privacy tests |
| Recovery UI says public extraction is blocked | Preserve production wording; label lab behavior as research-only |
| Popup note preservation across steps is undefined | Keep final title/note values in memory and display/commit them at confirmation |

## Unresolved Decisions

### P0

- Production ambition versus research-only scope.
- Rights basis, per-video attestation, and private/unlisted eligibility.
- Sideloaded extension versus Chrome Web Store distribution.
- Exact metadata-only behavior.
- Existing item upgrade/versioning policy.
- Retention and backup-expiry disclosure.

### P1

- Supported routes.
- Selected-language representation.
- Context-menu behavior.
- Popup-close and network-retry behavior.
- Separate transcript deletion.
- Post-baseline metric thresholds.
