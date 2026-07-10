# Android Share Result Source Truth Matrix

Created: 2026-06-16 00:31:20 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Pre-code gate for Android Share Result slice. Complete for local execution.

## Source Files

| Source | Status |
| --- | --- |
| `UX_v2/features/FEATURE_ANDROID_SHARE_RESULT_PRD_V2_2026-06-16_00-24-10_IST.md` | Product source for this slice |
| `UX_v2/features/FEATURE_ANDROID_SHARE_RESULT_IMPLEMENTATION_PLAN_V2_2026-06-16_00-31-20_IST.md` | Execution source for this slice |
| `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md` | Parent Android PRD |
| `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md` | Parent Android implementation plan |
| `src/components/share-handler.tsx` | Current Android native share handler |
| `src/lib/capture/result.ts` | Current capture result contract |
| `android/app/src/main/AndroidManifest.xml` | Native share intent filters |

## Magic Patterns Reference

| Field | Value |
| --- | --- |
| Mobile design URL | `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r` |
| Active artifact from revised PRD | `d7eeaec6-0272-40fa-a7ca-4de7871182e7` |
| Status from revised PRD | `isGenerating=false` |
| Relevant source file | `pages/MobileShareCapture.tsx` |
| Local live recheck | Not performed in this slice; no Magic Patterns connector was used. Treat revised PRD snapshot as source, and recheck before release. |

## D-Decision Verification

| Decision | Slice rule | Status |
| --- | --- | --- |
| D-007 active offline controls | No offline queue, offline retry storage, offline share claim, or sync claim | Excluded |
| D-008 QR pairing | Missing-token state links to code-entry pairing/setup only; no QR claim | Excluded |
| D-013 package ID migration | No Android package or manifest identity change | Excluded |
| APK channel | Web-only Android WebView asset implementation locally; no APK publication in this slice | Web-only |

## Current Share Handler Alert Branches

| Current branch | Evidence | Production truth action |
| --- | --- | --- |
| Missing bearer token alerts then routes to `/setup-apk` | `src/components/share-handler.tsx:117-123` | Replace with `missing_token` share result route; no save implied |
| Unsupported/no text/file alerts | `src/components/share-handler.tsx:139-142` | Replace with `unsupported_share` result |
| URL capture failure alerts | `src/components/share-handler.tsx:223-229` | Replace with `server_unreachable` result and sanitized log |
| Note capture failure alerts | `src/components/share-handler.tsx:239-245` | Replace with `server_unreachable` result and sanitized log |
| PDF missing URI alerts | `src/components/share-handler.tsx:254-257` | Replace with `pdf_missing_uri` result |
| PDF read failure logs URI and alerts | `src/components/share-handler.tsx:263-267` | Replace with `pdf_read_failed` and sanitized log only |
| PDF upload fetch failure alerts | `src/components/share-handler.tsx:274-288` | Replace with `pdf_upload_failed` and sanitized log |
| PDF checksum mismatch alerts | `src/components/share-handler.tsx:297-304` | Replace with `pdf_checksum_failed` |
| PDF non-OK API alerts | `src/components/share-handler.tsx:307-308` | Replace with `pdf_upload_failed` |

## Native Share Filters

| Manifest filter | Evidence | Slice behavior |
| --- | --- | --- |
| `android.intent.action.SEND` + `text/plain` | `android/app/src/main/AndroidManifest.xml` | URL or note capture |
| `android.intent.action.SEND` + `application/pdf` | `android/app/src/main/AndroidManifest.xml` | Single PDF capture |
| `android.intent.action.SEND_MULTIPLE` + `application/pdf` | `android/app/src/main/AndroidManifest.xml` | Reject with `multi_pdf_rejected` before reading files |

## Route Accessibility Decision

| Route | Decision | Reason | Required guard |
| --- | --- | --- | --- |
| `/capture/share-result` | Public path in proxy | Missing-token and unpaired Android result may need to render without a web session | Route reads only opaque key and safe sessionStorage payload; no server-side private data fetch |

## Production Truth Matrix

| Result state | Production truth | Implement/adapt/hide | Validation |
| --- | --- | --- | --- |
| `saved_full` | A URL/note/PDF capture saved readable text or transcript and has a safe item id | Implement | Unit mapping, browser screenshot |
| `saved_limited` | An item was saved but source text is incomplete or post-save capture had a warning | Implement | Unit mapping, browser screenshot |
| `duplicate_existing` | Existing item matched; no duplicate was created | Implement | Unit mapping, browser screenshot |
| `updated_existing` | Existing item was updated with better content | Implement | Unit mapping, browser screenshot |
| `missing_token` | Android app is not paired; no capture API call happened | Implement | Unit preflight, browser screenshot, later APK validation |
| `unsupported_share` | Payload had no supported URL/text/PDF | Implement | Unit classification, browser screenshot |
| `server_unreachable` | URL/note capture could not reach or trust the server response | Implement | Unit failure mapping, browser screenshot |
| `pdf_missing_uri` | Android did not provide a usable PDF URI | Implement | Unit classification, browser screenshot |
| `pdf_read_failed` | PDF could not be read from Android share URI | Implement with sanitized log | Unit failure mapping, browser screenshot |
| `pdf_checksum_failed` | PDF upload integrity check failed | Implement | Unit failure mapping, browser screenshot |
| `pdf_upload_failed` | PDF upload failed or PDF API returned non-OK | Implement | Unit failure mapping, browser screenshot |
| `multi_pdf_rejected` | Multiple PDFs are unsupported in this revamp | Implement before any file read | Unit classification, browser screenshot |
| `expired_result` | Safe payload is missing, expired, or invalid | Implement | Unit storage, browser screenshot |

## Evidence Label

Local completion label for this slice:

`Implemented locally; Android native entry path validation pending.`

Final Android completion remains blocked until a later APK/device pass earns:

`Android native entry path validated`.
