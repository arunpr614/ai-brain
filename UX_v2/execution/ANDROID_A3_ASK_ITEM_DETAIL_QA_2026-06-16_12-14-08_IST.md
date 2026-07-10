# Android A3 Ask Composer / Item Detail QA

Created: 2026-06-16 12:14:08 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Android A3 Ask composer and Item Detail completed locally with browser evidence; APK evidence and production release still pending.

## Feature Cycle

| Artifact | Status |
| --- | --- |
| `UX_v2/features/FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_PRD_V1_2026-06-16_11-42-00_IST.md` | Created |
| `UX_v2/features/FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_PRD_ADVERSARIAL_REVIEW_2026-06-16_11-44-00_IST.md` | No-go review completed |
| `UX_v2/features/FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_PRD_V2_2026-06-16_11-46-00_IST.md` | Revised product source |
| `UX_v2/features/FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_IMPLEMENTATION_PLAN_V1_2026-06-16_11-48-00_IST.md` | Created |
| `UX_v2/features/FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_11-50-00_IST.md` | No-go review completed |
| `UX_v2/features/FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_IMPLEMENTATION_PLAN_V2_2026-06-16_11-52-00_IST.md` | Revised execution source |

## Implementation Summary

- Disabled empty Ask sends with native `disabled` and `aria-disabled` state while preserving the existing Android IME fallback behavior.
- Adjusted global and per-item Ask pages for mobile-safe bottom spacing around the fixed Android bottom navigation.
- Added mobile-only Item Detail tabs for Original, Digest, Ask, Related, and Details while preserving the existing desktop two-column layout.
- Preserved capture-result, repair-result, and highlighted-citation banners above the mobile tab surface.
- Added mobile Original content with title, enrichment status, trust strip, source link, weak-source repair prompt, source body, focus, scoped Ask, and export actions.
- Added mobile Digest content for category, summary, key quotes, and the existing digest placeholder.
- Added mobile Ask entry with scoped Ask routing and limited-quality warning when applicable.
- Added mobile Related empty state while keeping real related rows backed by `findRelatedItems`.
- Added mobile Details content with capture metadata, topics, manual tags, and collection controls.
- Added deterministic A3 seed, copy-scan, and CDP browser evidence scripts.

## Browser Evidence

Evidence folder:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/android-a3-ask-item-detail/`

Report:

`android-a3-ask-item-detail-browser-report.json`

Final browser report summary:

| Report | States checked | Screenshot states | Issue count |
| --- | ---: | ---: | ---: |
| Android A3 Ask/Item Detail fixture | 14 | 12 | 0 |

States covered:

- `390x844-ask-empty-disabled`
- `390x844-ask-text-enabled`
- `390x844-ask-provider-error`
- `390x844-item-ask-scoped`
- `390x844-item-original-tab`
- `390x844-item-digest-tab`
- `390x844-item-ask-tab`
- `390x844-item-related-tab`
- `390x844-item-details-tab`
- `390x844-item-weak-original-tab`
- `390x844-item-related-empty-tab`
- `390x844-item-focus-mode`
- `390x844-ask-empty-disabled-send-state`
- `390x844-ask-text-enabled-send-state`

Browser assertions:

- Empty Ask send control is disabled and `aria-disabled=true`.
- Filled Ask send control is enabled and `aria-disabled=false`.
- Provider-error proof intercepted the real `/api/ask` request through CDP Fetch and rendered `AI SERVICES UNAVAILABLE` without adding any app fake state.
- Per-item Ask page renders scoped `THIS ITEM` context with the selected fixture title.
- Mobile Item Detail tabs render Original, Digest, Ask, Related, and Details surfaces without horizontal overflow.
- Related tab uses the real vector-backed related item (`A3 related mobile companion source`).
- No-related fixture renders `No related sources yet.`
- Weak YouTube fixture renders the transcript repair prompt and `Add text`.
- Focus mode renders `Exit focus` and the full fixture source body.
- No forbidden A3 copy was detected in captured states.

## Validation

| Gate | Result |
| --- | --- |
| `node --import tsx scripts/ux-v2-check-android-a3-copy.ts` | Passed: issue count 0 |
| `A3_RESET_DB=1 BRAIN_DB_PATH=/tmp/ai-memory-android-a3-ask-item-detail.sqlite node --import tsx scripts/ux-v2-seed-android-a3-ask-item-detail.ts` | Passed; fixture seeded and real related-vector precondition proved |
| A3 browser report | Passed: 14 states, 12 screenshot states, issue count 0 |
| `git diff --check` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with existing unrelated warning in `src/lib/queue/enrichment-batch-cron.ts` |
| `npm test` | Passed: 549 tests, 77 suites |
| `npm run build` | Passed with known `unpdf` warning |

## QA Notes

- Browser evidence used temporary SQLite database `/tmp/ai-memory-android-a3-ask-item-detail.sqlite`.
- Browser capture used a separate temporary Chrome profile at `/tmp/ai-brain-a3-chrome` and Chrome DevTools Protocol.
- Provider-error evidence is source-backed by the browser report `fetchEvents` entry for `http://127.0.0.1:3027/api/ask`.
- The local preview was stopped after evidence capture; ports `3027` and `9333` were clear after shutdown.
- APK/device evidence remains pending; this A3 milestone only claims local browser-mobile completion.

## Release Status

- Android A3 Ask composer and Item Detail is complete locally with browser evidence.
- APK/device evidence is still pending.
- Production deployment is still pending.
- Broader Android revised-plan execution remains open for later feature slices.
