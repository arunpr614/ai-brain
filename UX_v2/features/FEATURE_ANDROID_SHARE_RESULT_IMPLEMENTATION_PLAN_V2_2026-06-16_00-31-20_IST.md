# Implementation Plan v2 - Android Share Result Surface

Created: 2026-06-16 00:31:20 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Revised after adversarial review. Approved for local execution.

## Product Source

- `UX_v2/features/FEATURE_ANDROID_SHARE_RESULT_PRD_V2_2026-06-16_00-24-10_IST.md`
- `UX_v2/features/FEATURE_ANDROID_SHARE_RESULT_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_00-28-15_IST.md`

## Objective

Replace Android share alert-only outcomes with a durable `/capture/share-result` route and deterministic state-mapping helpers, while preserving existing capture APIs and avoiding private data in URLs, logs, sessionStorage safe payloads, screenshots, and reports.

## Execution Sequence

### 1. Source/Truth Gate

Create before code:

`UX_v2/execution/ANDROID_SHARE_RESULT_SOURCE_TRUTH_MATRIX_2026-06-16_00-31-20_IST.md`

Required rows:

- revised Android PRD/plan source paths;
- Magic Patterns mobile share source reference and current artifact ID from revised docs;
- current share handler alert branches with file/line evidence;
- Android manifest share filters;
- D-decision verification for D-007, D-008, and D-013;
- public route decision for `/capture/share-result`;
- local evidence label: `Implemented locally; Android native entry path validation pending`.

### 2. Pure Share Result Helpers

Add `src/lib/android-share/result.ts` and `src/lib/android-share/result.test.ts`.

Required helper shape:

```ts
classifyNativeSharePayload(payload): SharePayloadClassification
resultForPreflight(classification, hasToken): AndroidShareResultPayload | null
mapCaptureResponseToShareResult(data, sourceKind): AndroidShareResultPayload
mapCaptureFailureToShareResult(kind, statusOrError): AndroidShareResultPayload
createShareResultPayload(input, now): AndroidShareResultPayload
storeShareResult(storage, payload, key?): string
loadShareResult(storage, key, now): AndroidShareResultPayload
shareResultActions(payload): ShareResultAction[]
sanitizeShareLogMessage(code, details?): string
```

Classification must not depend on token state.

### 3. Exact Capture State Mapping

`src/lib/capture/result.ts` states must map as follows:

| Web capture state | Android share state | Action intent |
| --- | --- | --- |
| `created_full_text` | `saved_full` | Open item, Ask, Done |
| `created_transcript` | `saved_full` | Open item, Ask, Done |
| `created_preview_only` | `saved_limited` | Add text/Open item, Done |
| `created_metadata_only` | `saved_limited` | Add text/Open item, Done |
| `created_needs_upgrade` | `saved_limited` | Add text/Open item, Done |
| `duplicate_existing` | `duplicate_existing` | Open existing, Ask if id exists, Done |
| `updated_existing` | `updated_existing` | Open item, Add text if weak, Done |
| `error_with_saved_item` | `saved_limited` with `error_with_saved_item` code | Open item/Add text if id exists, Done |
| `failed_without_saved_item` | source-specific failure state | Try sharing again guidance, Done |
| Legacy `duplicate=true` | `duplicate_existing` | Open existing if id exists, Done |
| Malformed success without trusted item/result | `server_unreachable` | Try sharing again guidance, Done |

### 4. Public Result Route

Add:

- `src/app/capture/share-result/page.tsx`
- `src/app/capture/share-result/share-result-client.tsx`

Route behavior:

- route is public in `src/proxy.ts` because unpaired Android users may not have a web session;
- proxy test must cover `/capture/share-result`;
- page reads only the opaque key from query params;
- client component loads safe payload from sessionStorage;
- missing key, missing payload, bad JSON, or expired payload renders `expired_result`;
- route never fetches private item data server-side;
- no raw share content appears in URL or DOM.

### 5. Share Handler Rewrite

Update `src/components/share-handler.tsx`:

- remove production share result `alert()` calls;
- classify native payload first;
- if classification is multi-PDF, store `multi_pdf_rejected` result and route without reading files;
- read token after classification;
- if token missing, store `missing_token` result and route;
- if unsupported, store `unsupported_share` result and route;
- if PDF URI missing, store `pdf_missing_uri` result and route;
- call URL/note/PDF capture APIs only after preflight passes;
- map all success/failure outcomes through pure helpers;
- replace `read(${uri})` style logging with stable sanitized codes only;
- preserve cold-start duplicate suppression.

### 6. Browser QA Harness

Create a small deterministic script:

`scripts/ux-v2-browser-android-share-result-payloads.ts`

The script should print safe JSON fixtures for browser QA:

- saved full;
- saved limited;
- duplicate existing;
- updated existing;
- missing token;
- server unreachable;
- PDF read failed;
- PDF checksum failed;
- PDF upload failed;
- multi-PDF rejected;
- expired result.

Browser automation should use sessionStorage when the browser surface allows writes. If the browser surface cannot write sessionStorage, use the development-only `?state=<safe-state>` fixture path, guarded so production builds ignore it. The real product path remains `/capture/share-result?key=<opaque-key>`.

Save evidence under:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/android-share-result/`

### 7. Validation

Run:

```bash
git diff --check
node --import tsx --test src/lib/android-share/result.test.ts src/proxy.test.ts
! rg -n "alert\\(" src/components/share-handler.tsx
! rg -n "read\\(\\$\\{?uri|file URI|content://" src/components/share-handler.tsx src/lib/android-share/result.ts
npm run typecheck
npm run lint
npm test
npm run build
```

Notes:

- For the `rg` no-match scans, exit code 1 is the passing condition.
- Lint may continue to show the existing unrelated warning in `src/lib/queue/enrichment-batch-cron.ts`.

## Files Expected To Change

| File | Planned change |
| --- | --- |
| `src/lib/android-share/result.ts` | New pure helpers |
| `src/lib/android-share/result.test.ts` | New unit coverage |
| `src/app/capture/share-result/page.tsx` | New route |
| `src/app/capture/share-result/share-result-client.tsx` | New result UI client |
| `src/components/share-handler.tsx` | Replace alert outcomes with durable result routing |
| `src/proxy.ts` | Public allow-list for `/capture/share-result` |
| `src/proxy.test.ts` | Public route coverage |
| `scripts/ux-v2-browser-android-share-result-payloads.ts` | Deterministic browser QA payloads |
| `UX_v2/execution/ANDROID_SHARE_RESULT_SOURCE_TRUTH_MATRIX_2026-06-16_00-31-20_IST.md` | Source/truth artifact |
| `UX_v2/execution/ANDROID_SHARE_RESULT_QA_2026-06-16_00-31-20_IST.md` | Final QA report |

## No-Go Gates

- Any raw token, cookie, raw URL, file URI, PDF name, note body, raw exception, or full private content appears in route URL, DOM, sessionStorage payload, or client-error message.
- Any production share outcome still relies only on `alert()`.
- Multi-PDF share reads or uploads any file.
- Missing-token native share would redirect to unlock instead of share result.
- Any current `CaptureResultState` is unmapped.
- Result route cannot render expired state without sessionStorage.
- Browser QA cannot deterministically seed and render result payloads.
- Full validation fails.

## Release Status After This Slice

If local implementation and browser evidence pass, mark this slice:

`Implemented locally; Android native entry path validation pending.`

Do not claim Android share complete until APK/device evidence is collected later.
