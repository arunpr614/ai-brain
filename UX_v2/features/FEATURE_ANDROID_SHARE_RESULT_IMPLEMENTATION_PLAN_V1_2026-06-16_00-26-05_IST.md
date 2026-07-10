# Implementation Plan v1 - Android Share Result Surface

Created: 2026-06-16 00:26:05 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Draft for adversarial review. Not executable yet.

## Product Source

`UX_v2/features/FEATURE_ANDROID_SHARE_RESULT_PRD_V2_2026-06-16_00-24-10_IST.md`

## Objective

Replace Android share alert-only outcomes with a durable `/capture/share-result` route and deterministic state-mapping helpers, while preserving existing capture APIs and avoiding private data in URLs, logs, or safe result payloads.

## Work Plan

### 1. Source/Truth Gate

Create:

`UX_v2/execution/ANDROID_SHARE_RESULT_SOURCE_TRUTH_MATRIX_<timestamp>.md`

Include:

- revised Android PRD/plan source paths;
- Magic Patterns mobile share source reference and current artifact ID from the revised PRD;
- current share handler alert branches with file/line evidence;
- Android manifest share filters;
- D-decision verification for D-007, D-008, and D-013;
- local evidence label: "implemented locally; Android runtime validation pending."

### 2. Pure Share Result Helpers

Add `src/lib/android-share/result.ts` with:

- `AndroidShareResultState`;
- `AndroidShareResultPayload`;
- `classifySharePayload(payload, hasToken)`;
- `mapCaptureResponseToShareResult(data, sourceKind)`;
- `mapCaptureFailureToShareResult(kind, statusOrError)`;
- `createShareResultPayload(input, now)`;
- `storeShareResult(sessionStorage, payload)`;
- `loadShareResult(sessionStorage, key, now)`;
- `sanitizeShareLogMessage(code, details?)`;
- action eligibility helper for Open item, Ask, Add text, Pair Device, Capture, Done.

Add tests in `src/lib/android-share/result.test.ts`.

### 3. Result Route

Add route:

`src/app/capture/share-result/page.tsx`

Add client component:

`src/app/capture/share-result/share-result-client.tsx`

Route behavior:

- read `key` search param;
- load safe payload from sessionStorage;
- show expired state when key is missing, payload is missing, parse fails, or expired;
- render state-specific copy/actions from PRD v2;
- no raw share content in DOM.

### 4. Share Handler Rewrite

Update `src/components/share-handler.tsx`:

- classify payload before capture;
- reject multi-PDF before reading/uploading files;
- route missing token/unsupported/missing URI directly to share-result;
- preserve cold-start duplicate suppression;
- use helper mapping for success/failure;
- replace every production `alert()` outcome with result route navigation;
- use sanitized log messages only;
- continue to post to existing URL/note/PDF capture APIs.

### 5. Browser Evidence

Use local dev server with synthetic sessionStorage payloads to capture:

- saved full;
- saved limited;
- duplicate existing;
- missing token;
- server unreachable;
- PDF read/upload/checksum failure;
- multi-PDF rejected;
- expired result;
- mobile viewport.

Save under:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/android-share-result/`

### 6. Validation

Run:

```bash
git diff --check
node --import tsx --test src/lib/android-share/result.test.ts
rg -n "alert\\(" src/components/share-handler.tsx
npm run typecheck
npm run lint
npm test
npm run build
```

Expected:

- no `alert(` result outcomes remain in share handler;
- focused tests pass;
- full validation passes with only known unrelated warnings.

## Files Expected To Change

| File | Planned change |
| --- | --- |
| `src/lib/android-share/result.ts` | New pure helpers |
| `src/lib/android-share/result.test.ts` | New unit coverage |
| `src/app/capture/share-result/page.tsx` | New route |
| `src/app/capture/share-result/share-result-client.tsx` | New result UI client |
| `src/components/share-handler.tsx` | Replace alert outcomes with durable result routing |
| `UX_v2/execution/ANDROID_SHARE_RESULT_SOURCE_TRUTH_MATRIX_<timestamp>.md` | Source/truth artifact |
| `UX_v2/execution/ANDROID_SHARE_RESULT_QA_<timestamp>.md` | Final QA report |

## No-Go Gates

- Any raw token, cookie, raw URL, file URI, PDF name, note body, raw exception, or full private content appears in route URL, DOM, sessionStorage payload, or client-error message.
- Any production share outcome still relies only on `alert()`.
- Multi-PDF share reads or uploads any file.
- Result route cannot render expired state without sessionStorage.
- Focused tests do not cover state precedence and redaction.
- Full validation fails.

## Release Status After This Slice

If local implementation and browser evidence pass, mark this slice:

`Implemented locally; Android native entry path validation pending.`

Do not claim Android share complete until APK/device evidence is collected later.
