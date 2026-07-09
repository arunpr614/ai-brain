# Web Capture, Settings, Pairing, Export, and Provider Health PRD v1 - Adversarial Review

**Created:** 2026-06-15 23:33:35 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_WEB_CAPTURE_SETTINGS_PAIRING_EXPORT_PROVIDER_PRD_V1_2026-06-15_23-31-53_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_WEB_CAPTURE_SETTINGS_PAIRING_EXPORT_PROVIDER_PRD_ADVERSARIAL_REVIEW_2026-06-15_23-33-35_IST.md`

## Executive Verdict

No-go for execution. PRD v1 identifies the right feature area and many of the right risks, but it still leaves several release-critical choices as open questions. It is not yet strict enough to prevent raw token exposure, false backup confidence, network-dependent capture QA, unsafe export inspection, or provider-health false positives.

## Evidence Inspected

- PRD v1: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_WEB_CAPTURE_SETTINGS_PAIRING_EXPORT_PROVIDER_PRD_V1_2026-06-15_23-31-53_IST.md`
- Device pairing page and client actions:
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/settings/device-pairing/page.tsx:20`
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/settings/device-pairing/actions-client.tsx:131`
- Settings page and trust copy:
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/settings/page.tsx:95`
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/lib/settings/trust-copy.ts:28`
- Capture UI/action/API:
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/capture/tabs.tsx:73`
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/capture-actions.ts:26`
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/api/capture/url/route.ts:118`
- Export and provider status:
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/api/library/export.zip/route.ts:58`
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/lib/providers/status.ts:43`
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/api/settings/provider-status/route.ts:13`

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Raw bearer token exposure is still allowed by the PRD flow

**Evidence:** PRD v1 says raw bearer tokens must not be visible in evidence, but leaves the advanced token setup as an open question at lines 172-173. Current code loads the token on the page (`device-pairing/page.tsx:20`) and renders it directly in a `<code>` block (`actions-client.tsx:172-175`).
**Why it matters:** This is a credential exposure risk in the exact browser evidence this slice requires.
**Failure mode:** Browser screenshots or DOM snapshots capture the bearer token; reports or logs accidentally preserve it.
**Recommendation:** PRD v2 must make token display non-negotiable: no raw token is visible by default, no raw token is written to reports, and all token/API exchange evidence must assert shape/redaction rather than print values.

#### 2. Capture QA still depends on live external URL extraction unless a deterministic substitute is mandated

**Evidence:** PRD v1 requires "valid URL success" at line 58 and "created full text" evidence at line 75, while also saying no external network dependency is allowed at line 52. Current web server action calls `extractUrlCapture()` directly (`capture-actions.ts:35-38`), and API success also reaches extraction (`api/capture/url/route.ts:118-120`).
**Why it matters:** Browser QA can become flaky, slow, or impossible without internet/source availability.
**Failure mode:** A local run passes on one machine and fails on another because the target site blocks extraction or changes markup.
**Recommendation:** PRD v2 must require either a local HTTP fixture server or seeded item-detail capture-state routes for browser success states, while API unit tests cover extraction contracts separately.

### P1 - High Risk

#### 1. Backup copy is still too permissive and can imply validated restore capability

**Evidence:** PRD v1 says backups should not imply user-managed restore at line 90, but acceptance does not force a concrete UI decision. Current Settings renders backup status, interval, retention, and path (`settings/page.tsx:95-121`), while trust copy says snapshots use a configured backup job and to confirm backup status (`trust-copy.ts:28-30`).
**Why it matters:** A backup status panel without restore validation can give false recovery confidence.
**Failure mode:** Release claims "backup enabled" while rollback/restore has not been tested.
**Recommendation:** PRD v2 must require either hiding backup status from this slice or renaming it to internal server snapshots with explicit "restore not validated in this UI" copy. Release cannot treat this as user backup/restore.

#### 2. Export validation can leak real private content if not tied to a seeded database

**Evidence:** PRD v1 requires zip content inspection at lines 107-111 and says export zips must stay local at line 128, but does not require a temporary seeded DB. The export route includes item body and metadata in Markdown (`export.zip/route.ts:25-51`).
**Why it matters:** Inspecting export contents from the real local database could expose private saved content in logs, reports, screenshots, or tool output.
**Failure mode:** QA prints Markdown filenames/body snippets from Arun's actual memory library.
**Recommendation:** PRD v2 must require export validation only against a temporary seeded DB, and reports may include counts, filenames from synthetic fixtures, manifest shape, and redaction scan results, not private body content.

#### 3. Provider-health validation is underspecified around cache and live provider state

**Evidence:** PRD v1 requires provider-down evidence at line 121, but `getProviderStatusReport()` caches results for 60 seconds (`providers/status.ts:37-48`) and Settings calls it server-side (`settings/page.tsx:42-43`).
**Why it matters:** Browser QA can show stale "ok" after changing provider env or stale degraded state after recovery.
**Failure mode:** QA claims provider-down or provider-ok state while the UI is showing a cached prior result.
**Recommendation:** PRD v2 must require a deterministic provider-status test seam: reset cache in tests, run the dev server with forced unreachable providers before first Settings load, or add a QA-only seeded status path that cannot ship as fake production data.

### P2 - Medium Risk

#### 1. Pairing code screenshots are allowed without enough redaction rules

**Evidence:** PRD v1 allows pairing code screenshots at lines 126-127. Current pairing UI renders the temporary code in large type (`actions-client.tsx:93-110`).
**Why it matters:** A one-time code is less sensitive than a bearer token, but it is still an authentication material until expiry/use.
**Failure mode:** A report captures an active code and the code remains valid long enough for misuse.
**Recommendation:** PRD v2 should require local-only pairing-code evidence, avoid transcribing code text into reports, and prefer expired-code screenshots or cropped/redacted code screenshots where feasible.

#### 2. API exchange success returns a raw token, but PRD only discusses UI screenshots

**Evidence:** Device pairing exchange tests confirm a valid exchange returns `url` plus `token` (`device-pairing/exchange/route.test.ts:36-51`). PRD v1 focuses on browser evidence and does not explicitly forbid raw exchange-body logging.
**Why it matters:** API validation often writes JSON reports. That report can leak the token even if UI screenshots are clean.
**Failure mode:** Browser/API report includes a successful exchange body with bearer token.
**Recommendation:** PRD v2 must require exchange-success assertions to record only status, key presence, token length/fingerprint/redacted marker, cache headers, and no raw token.

#### 3. Capture UI acceptance does not require mobile affordance checks for file input and tab controls

**Evidence:** PRD acceptance says `/capture` URL/PDF/note desktop and mobile states captured at line 151 but does not require PDF keyboard/touch checks or tab selected-state checks. Current capture tablist uses buttons with `role="tab"` (`capture/tabs.tsx:41-63`), and PDF dropzone uses a custom role button.
**Why it matters:** Capture is an entry workflow; mobile or keyboard breakage would be highly visible.
**Failure mode:** Screenshots pass while users cannot reliably switch tabs or activate PDF upload with keyboard/touch.
**Recommendation:** Add explicit keyboard/touch acceptance for tab switching and PDF activation, even if real file chooser automation is limited.

### P3 - Low Risk Or Polish

#### 1. Settings tags/collections are included in route QA but not bounded

**Evidence:** PRD acceptance includes `/settings/tags` and `/settings/collections` at line 152, but the slice is primarily capture/settings/pairing/export/provider health.
**Why it matters:** This can pull mutation QA from an already completed organization slice into this one and blur scope.
**Failure mode:** The implementation burns time revalidating all tag/collection mutations instead of settings navigation and copy.
**Recommendation:** PRD v2 should state that tags/collections settings are route/navigation/copy smoke only unless new changes touch their mutation controls.

## What The Original Plan Or Work Gets Wrong

- It treats raw token handling as an open question rather than an execution blocker.
- It says "no external network dependency" but still requires capture success states without specifying a deterministic mechanism.
- It knows backup/restore is risky but does not force a concrete UI state.
- It treats export inspection as a simple validation step without explicitly isolating private data.
- It assumes provider-down can be forced without acknowledging cache and server-render timing.

## Missing Validation

- Token source/DOM/browser evidence scan after pairing page changes.
- API exchange success redaction check.
- Temporary seeded export DB with zip manifest/count validation.
- Provider-status cache reset or first-load forced-degraded evidence.
- Local fixture strategy for capture success/duplicate/weak/failure browser states.
- Backup copy screenshot and forbidden-copy scan specific to backup/restore claims.
- Mobile capture tab/dropzone interaction checks.

## Revised Recommendations

1. Make raw token display hidden by default or remove the advanced token panel from ordinary screenshot-ready UI.
2. Validate export only against a synthetic temporary DB.
3. Force provider states deterministically and account for cache.
4. Use local fixtures or seeded route states for capture browser evidence; do not rely on the public web.
5. Recast backup UI as internal snapshot status or hide it until restore validation.
6. Add a release-blocking forbidden-copy scan covering QR, sync, device list, backup/restore overclaims, raw tokens, provider secrets, and stale naming.

## Go / No-Go Recommendation

No-go for execution until PRD v2 closes the P0 and P1 gaps. Conditional go for implementation planning after PRD v2 adds explicit token, capture-fixture, export-isolation, provider-cache, and backup-copy gates.

## Plan Revision Inputs

### Required Deletions

- Delete the open-ended question that asks whether token setup should remain visible; PRD v2 must decide.
- Delete any acceptance path that implies live public URL extraction is required for local QA.
- Delete or narrow any settings scope that implies tags/collections mutation retest unless touched.

### Required Additions

- Token display default-hidden requirement.
- Token/API response redaction requirements for screenshots, logs, JSON reports, and Markdown.
- Temporary seeded export DB requirement.
- Provider cache/control requirement.
- Local capture fixture or route-state fixture requirement.
- Backup UI decision requirement.

### Required Acceptance Criteria Changes

- Add explicit token scan/redaction acceptance.
- Add export manifest validation from synthetic data only.
- Add provider status stale-cache prevention.
- Add capture no-public-network acceptance.
- Add backup no-overclaim acceptance.

### Required Validation Changes

- Add focused tests for pairing token conceal/reveal behavior if UI changes.
- Add export tests for empty and synthetic mixed libraries.
- Add provider status tests for every UI label mapping, not only classifier functions.
- Add browser checks for mobile capture tab switching and PDF invalid-file state.

### Required No-Go Gates

- Any raw bearer token visible in ordinary page load or evidence.
- Any export validation run against real private data.
- Any provider status claim based on stale cache or uncontrolled live state.
- Any backup UI that implies restore/user-managed backup without restore evidence.
- Any capture success evidence that depends on public website availability.

## Residual Risks

- Pairing code screenshots remain sensitive even if short-lived.
- Export validation can still produce private files if someone points the harness at the wrong DB.
- Provider health can only prove configured local conditions, not long-term provider reliability.
- Android pairing still needs separate device/emulator evidence before any Android claim.
