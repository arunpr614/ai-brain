# Web Experience Revamp Fixture Plan

**Created:** 2026-06-15 21:48:07 IST
**Status:** Phase 1 gate artifact. Use local seeded data by default; production mutation is blocked unless explicitly documented with cleanup proof.

## Fixture Principles

- Fixtures must be deterministic from a clean local checkout.
- Fixture content must be synthetic and must not include secrets, private notes, API tokens, cookies, or PINs.
- Browser QA should prefer read-only seeded states.
- Mutation checks run locally unless a production temporary object, cleanup command, and cleanup proof are recorded in the release packet.
- Fixture IDs must be stable so screenshots, console logs, and route-state rows can point to exact items.

## Fixture Matrix

| Fixture ID | Screen/state | Data setup | Mutation? | Reset/cleanup | Used by QA |
|---|---|---|---|---|---|
| `FX-AUTH-LOGGED-OUT` | `/unlock`, unauthenticated redirects | Clear `brain-session` cookie | No | Delete browser context/cookie | Auth and public route smoke |
| `FX-AUTH-LOGGED-IN` | Protected web routes | Use test PIN or session cookie created via `/unlock` | No | Delete cookie after run | Browser route QA |
| `FX-SHELL-DESKTOP` | App shell expanded/collapsed | Authenticated session, viewport `1440x900` | No | Browser reset | Shell QA |
| `FX-SHELL-MOBILE` | Responsive nav/mobile shell | Authenticated session, viewport `390x844` | No | Browser reset | Responsive QA |
| `FX-LIBRARY-MIXED` | Populated Library | Seed items with full text, transcript, preview-only, metadata-only, needs-upgrade, duplicate, long title, long provider | No | Local DB reset | Library/search/detail QA |
| `FX-LIBRARY-EMPTY` | Empty Library | Empty local test DB | No | Local DB reset | Empty states |
| `FX-LIBRARY-ERROR` | Failed load state | Simulate API failure with browser/network harness or local route guard | No | Disable simulation | Error-state QA |
| `FX-SEARCH-RESULTS` | Search results | Seed FTS/vector-searchable chunks | No | Local DB reset | Search QA |
| `FX-SEARCH-NONE` | Search no results | Query absent term against seeded DB | No | None | Search QA |
| `FX-DETAIL-FULL` | Item detail full text | Stable full-text item | No | Local DB reset | Detail QA |
| `FX-DETAIL-METADATA` | Metadata-only detail | Stable metadata-only YouTube/LinkedIn item | No | Local DB reset | Detail/needs-upgrade QA |
| `FX-DETAIL-FAILED` | Failed enrichment detail | Item with failed or retryable enrichment reason | No | Local DB reset | Repair/needs-upgrade QA |
| `FX-ASK-CITATIONS` | Ask answer with citations | Seed chunks and use mocked/local provider where possible | Local only | Delete test thread/messages | Ask QA |
| `FX-ASK-NO-CONTEXT` | Ask not enough context | Empty or irrelevant fixture corpus | Local only | Local DB reset | Ask QA |
| `FX-CAPTURE-URL-SUCCESS` | URL capture success | Synthetic URL accepted by local capture path or mocked fetch | Local only | Delete created item | Capture QA |
| `FX-CAPTURE-DUPLICATE` | Duplicate/update state | Post same fixture URL twice within duplicate window | Local only | Delete created item | Capture QA |
| `FX-CAPTURE-PDF` | PDF upload | Synthetic small PDF | Local only | Delete item/artifacts | Capture QA |
| `FX-CAPTURE-FAILURE` | Invalid/provider failure | Invalid URL or mocked provider failure | Local only | None | Capture QA |
| `FX-SETTINGS-PROVIDERS` | Provider connected/missing/error | Use redacted provider status responses or mocked local status | No | Clear mocks | Settings QA |
| `FX-EXPORT-SUCCESS` | Manual export available | Seed exportable items | Local only | Delete generated zip/md | Export QA |
| `FX-EXPORT-ERROR` | Export error | Simulate filesystem/API error locally | Local only | Clear simulation | Export QA |
| `FX-STORAGE-WARNING` | Storage warning | Simulate low-space/DB status if supported; otherwise document not implemented | No | Clear simulation | Settings/storage QA |
| `FX-PAIR-CODE-ACTIVE` | Pair code generated | Authenticated local session, configured `BRAIN_API_TOKEN` | Local only | Expire/delete code row | Pair Device QA |
| `FX-PAIR-CODE-INVALID` | Invalid code | Exchange known invalid code | No | None | Pairing API QA |
| `FX-PAIR-CODE-EXPIRED` | Expired code | Seed/age code past expiry | Local only | Delete code row | Pairing API/Android QA |
| `FX-TOPIC-POPULATED` | Topic route populated | Seed topic with multiple items | No | Local DB reset | Topic QA |
| `FX-TOPIC-EMPTY` | Empty/not found topic | Request missing slug or seed empty topic if supported | No | Local DB reset | Topic QA |
| `FX-COLLECTION-POPULATED` | Collection route populated | Seed collection with multiple items | No | Local DB reset | Collection QA |
| `FX-COLLECTION-EMPTY` | Empty/not found collection | Request missing ID or seed empty collection if supported | No | Local DB reset | Collection QA |
| `FX-OFFLINE-ASSETS` | Offline/manifest/icons | Production build public assets | No | None | Asset/offline smoke |

## Local Data Strategy

Use the existing local SQLite DB only after creating a local backup or using an isolated test DB path if supported by existing scripts/tests. Do not run destructive fixture setup against production. If a repeatable seed helper is missing, create one as part of execution and document its reset behavior before using it for QA.

## Production Smoke Strategy

Production smoke is read-only by default:

- Public assets and public auth routes may be requested directly.
- Protected routes require a redacted authenticated session.
- Capture/Ask/export/pairing mutation checks are not production smoke unless the release packet defines temporary data, cleanup command, and cleanup evidence.
