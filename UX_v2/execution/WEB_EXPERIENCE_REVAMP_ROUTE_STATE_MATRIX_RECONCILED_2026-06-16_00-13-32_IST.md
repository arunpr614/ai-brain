# Web Experience Revamp Route-State Matrix - Reconciled

Created: 2026-06-16 00:13:32 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Branch: `codex/ai-brain-ux-v2-execution`
Status: Reconciled for local web execution. Not production deployed.

## Evidence Set

| Evidence | Status |
| --- | --- |
| `WEB_EXPERIENCE_REVAMP_SHELL_NAVIGATION_QA_2026-06-15_22-30-00_IST.md` | Shell/navigation route active states passed locally |
| `WEB_EXPERIENCE_REVAMP_LIBRARY_SEARCH_TOPICS_COLLECTIONS_QA_2026-06-15_23-02-46_IST.md` | Library, search, topics, collections passed locally |
| `WEB_EXPERIENCE_REVAMP_ITEM_ASK_NEEDS_UPGRADE_QA_2026-06-15_23-27-55_IST.md` | Item detail, scoped Ask, repair, Needs Upgrade passed locally with provider-down boundary |
| `WEB_EXPERIENCE_REVAMP_CAPTURE_SETTINGS_PAIRING_EXPORT_PROVIDER_QA_2026-06-15_23-52-33_IST.md` | Capture, Settings, pairing, export, provider health passed locally |
| `screenshots/integrated-web-qa/integrated-web-qa-browser-report.json` | 12 integrated route visits, 0 layout overflow issues, 0 console warnings/errors |
| `src/proxy.test.ts` | Public web app manifest and icon assets now pass without auth |

## Reconciled Route-State Matrix

| Route | Required state | Local result | Evidence | Release note |
| --- | --- | --- | --- | --- |
| `/unlock` | PIN entry, session note | Pass | `integrated-unlock-pin-entry-390-light.png`; temporary QA PIN used only in empty DB | Error state remains covered by auth action contracts, not visual-regressed in this pass |
| `/setup` | First-run PIN setup | Pass | `integrated-setup-first-run-1280-light.png` | Existing-PIN error remains server-action behavior |
| `/setup-apk` | Public setup page | Pass | Direct HTTP public asset check returned 200 HTML | Android runtime pickup still belongs to Android slice |
| `/library` | Populated | Pass | `integrated-library-populated-1280-light.png`; library slice evidence | Long titles now wrap instead of clipping |
| `/library` | Empty | Pass | `integrated-library-empty-1280-light.png` | Loading/error simulation remains release follow-up if needed |
| `/search` | Empty/results/no results/error | Covered | `search-hit-1280-light.png`, `search-miss-1280-light.png`, `search-provider-down-1280-light.png`, `integrated-search-no-results-1280-light.png` | Loading animation not separately captured |
| `/items/[id]` | Full text detail | Covered | Item QA full-item screenshots and final console sweep | No integrated recapture needed after report-only fixes |
| `/items/[id]` | Metadata-only/failed enrichment | Covered | Weak item and Needs Upgrade QA screenshots | Delete removal remains validated by scan and browser reports |
| `/items/[id]/repair` | Pasted text repair | Covered | Repair short-text, repair success, and Needs Upgrade removal screenshots | Mutation validated in local seeded DB |
| `/items/[id]/ask` | This-item Ask | Covered | Ask item provider-down and scope screenshots | Live answer/citation quality remains provider-available release gate |
| `/needs-upgrade` | Populated | Covered | Capture slice and item slice Needs Upgrade screenshots | Grouping and repair behavior validated |
| `/needs-upgrade` | Empty | Pass | `integrated-needs-upgrade-empty-1280-light.png` | No console or overflow issues |
| `/ask` | Empty prompt and scoped prompt | Pass | `integrated-ask-collection-1280-light.png`; item Ask scope screenshots | Keyboard smoke reached textarea in integrated pass |
| `/ask` | Loading, citations, error, no context | Partial | Provider-down and missing-scope states passed; scoped banners passed | Live citations are blocked until an AI provider is available |
| `/capture` | URL/PDF/note | Covered | Capture slice tab screenshots; `integrated-capture-url-390-light.png` | Public website extraction intentionally not exercised locally |
| `/capture` | Duplicate/invalid/provider failure | Covered/partial | Duplicate and saved-error banners covered; route tests cover failure contracts | `failed_without_saved_item` has no detail page by design |
| `/review` | Attention list | Not applicable | `rg --files src/app | rg '(^|/)review(/|$)|review'` found no app route | Original matrix row was stale for current app filesystem |
| `/more` | Mobile nav aggregate | Pass | `integrated-more-390-light.png`; shell QA mobile screenshots | Mobile primary nav touch sample passed |
| `/settings` | Categories shell | Covered | Capture/settings QA settings screenshots | Provider/export state covered by route/API checks |
| `/settings/collections` | Collection management | Covered | Settings organization screenshots | CRUD mutation remains local-only, no production data mutation |
| `/settings/tags` | Tag management | Covered | Settings organization screenshots | CRUD mutation remains local-only, no production data mutation |
| `/settings/device-pairing` | Android code, advanced token, missing token | Pass | Device pairing screenshots; `integrated-device-pairing-390-light.png`; raw-token DOM scan false | Android native pairing remains Android slice |
| `/topics/[slug]` | Populated/not found | Pass | Topic slice evidence; `integrated-topic-populated-1280-light.png` | Long titles now wrap instead of clipping |
| `/collections/[id]` | Populated/empty/not found | Pass | Collection slice evidence; `integrated-collection-populated-1280-light.png` | Long titles now wrap instead of clipping |
| `/offline.html` | Offline fallback public asset | Pass | Direct HTTP check returned 200 HTML without auth redirect | Android offline runtime still belongs to Android slice |
| `/manifest.webmanifest`, icons | Public assets | Pass | Live checks returned 200 for manifest, favicons, touch icon, web app icons, and logo; `src/proxy.test.ts` covers this | Fixed proxy public-path allow-list |

## Fixes From Integrated Reconciliation

| Finding | Fix | Evidence |
| --- | --- | --- |
| Long item titles clipped on Library/Topic/Collection/Search integrated screenshots | Replaced single-line truncation with wrapping title classes on list/detail rows | Integrated rerun shows 0 overflow issues |
| Manifest/icons redirected to unlock when fetched without session | Added manifest, icon, and logo files to proxy public path allow-list | Live public asset checks returned 200 and proxy test passed |

## Remaining Release Follow-Ups

| Follow-up | Why it remains open |
| --- | --- |
| Live Ask citations | Local QA intentionally used unavailable AI provider to prove friendly provider-down behavior |
| Manual keyboard release sweep | Browser Tab simulation did not move focus from body on Library and Device Pairing, though Ask/Capture reached form controls |
| Touch target polish | Some compact controls sample below 44px on mobile Capture and Device Pairing |
| 200 percent zoom sweep | Current in-app browser capability does not provide reliable page zoom control |
| Android runtime pickup | Android revised PRD/plan execution is still pending |

## Verdict

Local web route-state reconciliation is complete enough to close the integrated web QA slice. It is not a production release verdict. Release remains blocked by Android execution, final accessibility sweep, code/release review, backup/rollback, deploy, live smoke, and observability gates.
