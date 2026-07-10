# Feature Android A1 Shell Library More Offline PRD - Adversarial Review

**Created:** 2026-06-16 08:39:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_PRD_V1_2026-06-16_08-37-12_IST.md`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_PRD_ADVERSARIAL_REVIEW_2026-06-16_08-39-00_IST.md`

## Executive Verdict

No-go for implementation as written. A1 is the right next slice, but PRD v1 still lets the team claim the shell/library foundation complete without proving the exact fixed-layer collisions that A1 is supposed to solve. It also leaves mutation safety, More/provider truth, and offline-origin validation under-specified.

## Evidence Inspected

- `UX_v2/features/FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_PRD_V1_2026-06-16_08-37-12_IST.md`
- `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md`
- `UX_v2/execution/ANDROID_A0_EVIDENCE_STRATEGY_2026-06-16_08-32-30_IST.md`
- `src/components/sidebar.tsx`
- `src/components/sidebar-routing.ts`
- `src/components/sidebar-routing.test.ts`
- `src/components/library-list.tsx`
- `src/components/mobile-library-filters.tsx`
- `src/app/more/page.tsx`
- `public/offline.html`
- Magic Patterns source snapshot files for `MobileBottomNav`, `MobileLibrary`, `MobileMore`, and `MobileOffline`
- `adversarial-review` report template and path script output

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Safe-area and fixed-layer acceptance is too vague to catch the real collision risk

**Evidence:** PRD v1 requires raised Capture to clear "content, filter sheets, selection bars, and page actions" at lines 87-88, but validation at lines 154-157 asks only for screenshots of Library default/filtered/selected/More/offline and one raised-Capture route. Current code has multiple fixed layers: bottom nav at `src/components/sidebar.tsx:255-305`, raised Capture at `src/components/sidebar.tsx:278-289`, and the Library bulk action toolbar at `src/components/library-list.tsx:320-409`. The mobile filter sheet is another fixed bottom layer in `src/components/mobile-library-filters.tsx`.
**Why it matters:** A1's core product promise is stable Android shell and safe-area clearance. If the PRD does not force explicit layer-state evidence, the implementation can pass with a pretty Library screenshot while the selected toolbar, filter sheet, flash, or raised Capture overlaps the nav on real phone sizes.
**Failure mode:** A user selects items, opens filters, or lands on a raised-Capture route and loses access to clear/select/Ask/filter actions behind the bottom nav or gesture area. Browser QA says "passed" because it never captured the conflicting state.
**Recommendation:** PRD v2 must add a fixed-layer collision matrix for at least Library default, filter sheet open, selected toolbar, flash/status, More, search, Needs Upgrade, item detail, topic, collection, and offline fallback across 390x844 and 430x932. Each row needs expected layer order, required bottom spacing, and pass/fail evidence.

### P1 - High Risk

#### 1. Mutation safety for existing Library bulk actions is under-specified

**Evidence:** PRD v1 allows existing bulk tag and add-to-collection controls to remain if tests validate them at line 102, while later saying A1 must not add new mutation actions at line 187. Current `LibraryList` exposes tag and collection mutations through fixed mobile UI at `src/components/library-list.tsx:344-397`. The PRD does not require local fixture isolation, cleanup, or interaction evidence for those mutation controls.
**Why it matters:** These controls are real data mutations, and A1's browser QA will likely exercise selected mode. Without a fixture/cleanup rule, local or production evidence can pollute real saved content or falsely treat untested mutation UI as safe.
**Failure mode:** A1 ships a mobile bulk bar that works visually but mutates the wrong fixture/live database, has no cleanup proof, or remains impossible to use on mobile because the tag input/select are cramped.
**Recommendation:** PRD v2 must choose one: either keep only Ask/clear in the mobile selected bar for A1, or require explicit local fixture mutation tests, cleanup proof, and mobile interaction screenshots for tag/add-to-collection.

#### 2. More/status truth cleanup can still produce fake or blocking provider states

**Evidence:** PRD v1 says the identity block should use "real app/workspace status" at line 112 and provider health should show only "real status" at line 115. Current `src/app/more/page.tsx` awaits `getProviderStatusReport()` on render and shows provider/model strings; the PRD does not define timeouts, cache behavior, unconfigured copy, or exactly what "workspace status" means for a single-user private app.
**Why it matters:** More is a trust surface. Undefined real-status copy lets implementation invent "workspace" or "server healthy" language, while provider probing can slow or fail page render if the path is not bounded.
**Failure mode:** More appears to show trustworthy real health but is actually stale/fake, or the More route becomes fragile because provider status blocks page rendering under network/provider failure.
**Recommendation:** PRD v2 must define the exact More identity/status rows and failure copy: app name, package/web version source, provider statuses from existing status helper, unconfigured/unreachable/quota labels, no raw provider errors, and no blocking probe beyond existing bounded behavior.

#### 3. Offline fallback validation does not cover Android origin rewriting

**Evidence:** PRD v1 says Pair Device and Library links must resolve to the correct app origin in Android WebView and browser at line 128. Current `public/offline.html` has origin-switching behavior for Capacitor local origins and `https://brain.arunp.in`, but the PRD does not require a browser/unit-style check of those computed links or the 200/401/403/network branches.
**Why it matters:** The offline page is served when the app is already in a degraded state. Wrong origin rewriting strands Android users on `https://localhost` or sends them to the wrong setup route.
**Failure mode:** Retry works in desktop browser but Android offline fallback cannot recover to the production app or pairing flow.
**Recommendation:** PRD v2 must require an offline fallback harness or browser assertions for `https://localhost`, `http://localhost`, and normal web origin cases, plus response-state checks for 200, 401, 403, timeout, and network failure.

#### 4. Route matrix expands `/setup-apk` behavior without acknowledging entry/session scope risk

**Evidence:** PRD v1 includes `/setup-apk` as a More-highlighted route at lines 86 and 181, while the same PRD declares login/setup/pairing state redesign out of scope at line 56. Current `getMobileShellTarget` maps `/settings` to More but does not map `/setup-apk`.
**Why it matters:** Highlighting `/setup-apk` as More may be right, but it touches a public pairing/setup surface. If A1 changes route classification there without unauthenticated evidence, it can regress pairing while claiming A1 was only shell polish.
**Failure mode:** The setup APK route gains the bottom nav/More state in a public flow where it distracts from pairing, overlaps setup content, or changes auth expectations.
**Recommendation:** PRD v2 must either defer `/setup-apk` route classification to the entry/session slice, or explicitly require unauthenticated browser evidence and no content overlap for `/setup-apk` if A1 changes it.

### P2 - Medium Risk

#### 1. Forbidden-copy scan is too broad and too loose at the same time

**Evidence:** PRD v1 forbids multiple strings unless they are in a "disabled roadmap explanation" at line 138. That exception can accidentally allow `offline sync`, telemetry, crash reports, E2EE, and delete-all-data to stay visible across A1 surfaces, while the raw string scan will also match docs/tests/comments and generate noisy failures.
**Why it matters:** A1 needs a reliable scan that distinguishes visible production UI from docs and deliberately disabled explanatory copy.
**Failure mode:** A1 either wastes time chasing false positives in docs/comments or ships disabled roadmap text that looks like an active feature because the exception was too permissive.
**Recommendation:** PRD v2 should define a bounded scan target set and an allow-list for exact disabled-copy strings. If offline sync is not necessary in A1, prefer removing that phrase from visible UI entirely.

#### 2. More tab badge behavior is not specified

**Evidence:** Current mobile nav passes `needsUpgradeCount` as a badge on More at `src/components/sidebar.tsx:298-304`. PRD v1 describes Needs Upgrade entry in Library/More but does not say whether the bottom More tab should show the Needs Upgrade count.
**Why it matters:** A badge on More for Needs Upgrade can confuse users into thinking More itself has alerts or settings issues.
**Failure mode:** The nav remains technically functional but semantically noisy, and future screenshots argue over whether the badge is intentional.
**Recommendation:** PRD v2 must decide: remove the More badge, move Needs Upgrade status to Library only, or explicitly keep it with rationale and validation.

### P3 - Low Risk Or Polish

#### 1. Local completion wording could overstate Android readiness

**Evidence:** PRD v1 completion criteria at lines 195-202 are careful, but the route matrix still names Android release claim labels for many later-slice routes at lines 170-182.
**Why it matters:** This project has repeatedly had browser-vs-APK claim drift.
**Failure mode:** A later tracker row reads the Android labels and overclaims A1 as Android validated.
**Recommendation:** PRD v2 should keep Android labels, but add a local-completion wording rule: A1 tracker entries must say "browser/local complete; APK evidence pending" unless APK evidence actually exists.

## What The Original Plan Or Work Gets Wrong

The PRD v1 treats safe-area clearance as a general visual acceptance criterion, but the implementation risk is concrete fixed-layer state collision. It also says "existing tested controls may remain" without proving that existing desktop-style mutation controls are usable and safe in the mobile foundation slice.

## Missing Validation

- Fixed-layer collision matrix by route/state/viewport.
- Mobile selected toolbar interaction proof.
- Mobile filter sheet open/close/back/Escape proof.
- Local fixture mutation and cleanup proof if tag/collection bulk controls remain.
- Offline fallback origin rewriting checks.
- Provider status failure-mode evidence.
- Bounded visible-copy scan target and allow-list.
- Explicit `/setup-apk` decision and public-route evidence if included.

## Revised Recommendations

- Add a fixed-layer collision matrix as a P0 A1 gate.
- Decide mobile bulk mutation scope instead of leaving it conditional.
- Define exact More status rows and provider health failure copy.
- Add offline fallback origin/retry harness requirements.
- Either remove `/setup-apk` from A1 route changes or require unauthenticated evidence.
- Specify More badge behavior.
- Convert copy scan into a bounded, testable check.

## Go / No-Go Recommendation

No-go for implementation until PRD v2 addresses the P0 safe-area/fixed-layer gap and the P1 mutation, More/provider, offline-origin, and `/setup-apk` scope gaps.

## Plan Revision Inputs

### Required Deletions

- Delete the vague "no overlap" acceptance as a standalone criterion.
- Delete the open-ended "existing bulk actions may remain if safe" wording.
- Delete `/setup-apk` from A1 route changes unless public-route evidence is explicitly required.

### Required Additions

- Fixed-layer collision matrix.
- Explicit selected-bar scope decision.
- More identity/status source table.
- Provider status fallback and timeout/caching expectations.
- Offline fallback origin/retry branch validation.
- More badge decision.
- Bounded visible-copy scan target set and allow-list.

### Required Acceptance Criteria Changes

- A1 cannot pass if any fixed layer overlaps bottom nav, raised Capture, filter sheet, selected toolbar, flash/status, or Android safe area in required viewport states.
- Mobile selected mode must either exclude mutation controls or validate them with fixture mutation tests and mobile interaction evidence.
- More must show only named, source-backed status rows and known fallback states.
- Offline fallback must prove correct link/retry behavior for web and Capacitor-local origins.

### Required Validation Changes

- Add browser assertions for layer bounding boxes and horizontal overflow.
- Add screenshots for filter sheet open, selected toolbar, and raised Capture routes across 390x844 and 430x932.
- Add route-target tests for `/setup-apk` only if A1 keeps that route.
- Add bounded copy scan over A1 production UI files.
- Add local fixture seed/cleanup commands if mutation controls are exercised.

### Required No-Go Gates

- Any A1 state with fixed-layer overlap blocks local completion.
- Any visible offline item/read/count/sync claim blocks local completion.
- Any active privacy/telemetry/E2EE/delete-all-data control blocks local completion.
- Any fake account/email/version or `AI Brain` copy blocks local completion.
- Any production-data mutation smoke without cleanup proof blocks release.

## Residual Risks

Even after revision, A1 will still be browser/local complete unless authenticated APK evidence is collected. A1 should not be used to claim Android-complete status for Library or More until those protected routes are validated inside the APK with a real session.
