# Release Authority Matrix

**Frozen source baseline:** `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8`

**Decision date:** 2026-07-23 (Asia/Kolkata)

**Current release posture:** production capture **DENIED**; production held-transcript enrichment **DENIED**; live lab canary **BLOCKED**

## What this matrix authorizes

This document records the maximum work permitted in each environment. It does not assert that an implementation or its tests already exist. A capability may advance only when its row says so and every lower-level code, security, migration, QA, and external gate has passed.

Merging code, applying an additive schema, setting a flag, supplying an approval identifier, or loading a manifest does not itself authorize a capability.

Decision D-008 passed the focused contract recheck with no remaining P0/P1 finding. It still supplies no Chrome implementation or release authority before migration 027, passing package/security evidence, and the separate lab gates.

## Capability-by-environment decision

| Capability | Static research / synthetic unit | Packaged local fixture | Isolated live lab | Production deployment | Production enablement |
|---|---|---|---|---|---|
| Source reconciliation and documentation | **GO** | **GO** | Not required | May ship as documentation | Not a runtime capability |
| Schema-026-safe containment foundations | **GO** after Stage 0 review | **GO** after tests | Required before any canary | **Conditional GO** after security/QA; denial remains active | **GO only as containment** |
| Authoritative deployment classifier and production-negative tests | **GO** | **GO** | Required | **Conditional GO** after matrix passes | Cannot enable restricted features |
| Configured-origin/private-response helper | **GO** | **GO** | Required | **Conditional GO** after auth/origin tests | Cannot enable restricted features |
| Exact worker modes and old-schema tri-state | **GO** | **GO** | Required | **Conditional GO** after startup/compatibility tests | `standard` only for ordinary reviewed work; restricted work remains denied |
| True link-only metadata save (`browser_link_only_v1`) | Design/tests only before 027 | Fixture implementation only after frozen 027 exclusions | Live lab not required for its contract | Conditional after 027 and independent release gates | May be separately authorized; must never fetch/claim transcript work |
| Browser-visible transcript extractor | Pure synthetic fixtures only | Fixture pages only; zero live YouTube network | **BLOCKED** pending external packet, migration 027, and packaged security evidence | Foundations may deploy disabled | **DENIED** |
| Intent/grant/commit APIs for browser transcript | Contract and negative tests only | Synthetic fixed-origin fixtures only after migration 027/package gates | **BLOCKED** pending external packet and implementation evidence | May deploy only if unreachable/denied in production and independently approved | **DENIED** |
| Retention of a live browser-visible transcript | Not applicable | Synthetic content only | **BLOCKED** pending target, rights, retention, manifest, cleanup, and data-root authority | No live content | **DENIED** |
| Processing-hold persistence and worker exclusion | Design/tests before 027; implementation after gate | Synthetic DB fixtures | Required before canary | Additive foundation may deploy with restricted features off | Does not authorize release of a hold |
| Manual transcript digest/index authorization | Synthetic contract tests | Synthetic/local only | **BLOCKED** pending separate processing packet and migration 028 | Foundations may deploy disabled | **DENIED** |
| Remote digest provider dispatch for a browser transcript | Provider spy/fake only | Stub/local fixture only | **BLOCKED** pending processing decision and provider terms | No dispatch | **DENIED** |
| Remote embedding provider dispatch for a browser transcript | Provider spy/fake only | Stub/local fixture only | **BLOCKED** pending processing decision and provider terms | No dispatch | **DENIED** |
| Live lab canary | Plan and blocked report only | Rehearsal with synthetic data | **BLOCKED** absent external packet | Not applicable | Not applicable |
| Production canary for capture or held processing | Negative test only | Not applicable | Not transferable | No | **DENIED** |

## Authority precedence

The decision order is fixed:

1. **Code-level production denial**
2. **Authoritative deployment classification**
3. **Background-worker mode and server capability**
4. **Current processing decision, expiry, deletion deadline, and exact source/revision scope**
5. **Execution flags and kill switches**
6. **Provider/input/context eligibility**

A later item in the list can only narrow authority. It cannot override an earlier denial.

### Authoritative deployment inputs

The planned classifier accepts:

```text
BRAIN_DEPLOYMENT_ENV=production|lab|development|test
BRAIN_PRODUCTION_RUNTIME=0|1
```

Required rules:

- `BRAIN_PRODUCTION_RUNTIME=1` or `BRAIN_DEPLOYMENT_ENV=production` means production.
- Conflicting production/lab markers mean effective production plus startup/route failure.
- Explicit lab is only deployment-eligible; a separate data root and private manifest must still match.
- `NODE_ENV=production` may host an explicit lab build only when authoritative lab, production marker false, and all isolation checks pass.
- Missing, malformed, or unknown authoritative classification is production-blocked for restricted capabilities.
- `BRAIN_TRANSCRIPT_ENV`, approval text/ID, feature flags, request fields, extension mode, or a manifest cannot promote a runtime out of production.

Frozen-baseline finding, closed for Stage 1: `src/lib/capture/policy.ts` allowed legacy environment and legal-approval influence. The Stage 1 branch routes restricted acquisition through the authoritative denial-wins classifier in `src/lib/runtime/deployment.ts` and proves the negative matrix in `src/lib/runtime/deployment.test.ts` and `src/lib/capture/policy.test.ts`. Future feature routes must reuse that authority and obtain their own pre-body denial evidence.

## Pre-body production denial

Every future browser intent, grant, commit, and manual-processing authorization route must classify the deployment and capability before:

- reading JSON, form-data, or transcript bytes;
- allocating a body buffer;
- hashing or parsing transcript text;
- touching an item, intent, grant, source, hold, run, job, or receipt;
- contacting a provider;
- emitting request-derived diagnostics.

Production returns a stable typed denial with private no-store headers. It does not issue a request ID from malformed/unread input and does not echo target or content facts.

Production packages have no browser-transcript grant destination. A panel or page cannot supply a URL, origin, host, protocol, or route to bypass this absence.

## Configured public origin

One startup-validated `BRAIN_PUBLIC_ORIGIN` is the authority for cookie-authenticated feature writes and fixed-origin comparisons.

It must:

- parse to exactly one `http` or `https` origin;
- reject credentials, path, query, fragment, multiple values, `null`, or an unrecognized scheme;
- compare normalized scheme, hostname, and effective port exactly;
- ignore `Host`, `X-Forwarded-Host`, and `X-Forwarded-Proto` as authority;
- reject missing or foreign `Origin` for the restricted write;
- never put the configured or request origin into diagnostics.

Frozen-baseline finding, closed for the Stage 1 helper: processing HTTP read the environment string directly. `src/lib/http/configured-origin.ts` now parses the configured authority and performs exact request-origin comparison with private no-store response support. `src/lib/notes/http.ts` still serves a different boundary and must not be reused for the new routes; `src/lib/auth/bearer.ts` likewise remains a different bearer/CORS boundary rather than a substitute for the future cookie same-origin gate.

## Authentication and transfer authority

The corrected D-008 addendum separates authority from content and distinguishes three origins:

- one exact HTTPS Brain lab page origin may perform the opaque `externally_connectable` intent handoff;
- one compile-time exact HTTPS lab destination is the only grant/commit/reconciliation target;
- one exact `chrome-extension://<approved-id>` requester Origin is allowed by narrow, non-credentialed CORS for panel upload;
- the page receives neither transcript content authority nor destination authority;
- the isolated extractor returns content only to the trusted side-panel document;
- before confirmation, transcript text exists only in side-panel memory;
- the service worker owns the paired bearer and fixed-origin grant request;
- the panel receives only a short-lived one-time secret grant for the exact confirmed body, and the server stores only its hash;
- the panel cannot select another origin;
- the server recomputes body hash/size/normalization and all item/source/revision/policy facts;
- commit consumes intent and grant atomically with the attachment receipt.

This contract passed the focused D-008 recheck, but implementation remains blocked on migration 027 and package/security gates. A transcript-bearing runtime message, bearer exposed to the panel/page, page-selected destination, broad CORS exception, leaked grant, persistent content queue, or unbound direct panel upload is not an allowed fallback.

## Worker-mode release matrix

| Configured mode | Ordinary scheduled enrichment | Transcript recovery | Batch submit/poll | Note index | Generic original embedding | Exact interactive digest/index | Release interpretation |
|---|---:|---:|---:|---:|---:|---:|---|
| `disabled` | No | No | No | No | No | No | Containment/receipt-only; safe default for restricted lab setup |
| `standard` | Yes | Yes | Yes | Yes if existing note flags permit | Only through reviewed scheduled path | No | Ordinary behavior only; active holds remain excluded |
| `manual-transcript-lab` | No | No | No | No | No | Only exact accepted run, after capable runners exist | Lab-specific; never valid in production |
| missing on schema 026, all restricted flags false | Compatibility proposal: yes | Compatibility proposal: yes | Compatibility proposal: yes | Existing flags | Existing path | No | `legacy_default_standard` only to preserve ordinary production |
| missing with a restricted flag, unknown, malformed, or conflicting | No | No | No | No | No | No | Fail closed |

The baseline has no interactive manual digest/index runner. Therefore `manual-transcript-lab` starts no content work in Stage 1. It cannot reuse the scheduled enrichment worker, the inline generic embedding path, or batch.

## Old-schema release behavior

Stage 1 uses three feature states:

| Feature state | Meaning | Ordinary existing work | Restricted capture/manual work |
|---|---|---|---|
| `absent` | Legitimate schema 026; no 027 table/column | Preserve current behavior under `standard` compatibility | Denied independently |
| `ready` | Exact frozen 027 ledger filename/SHA attestation plus complete reviewed tables, columns, checks, triggers, and indexes | Use hold-aware claim and apply paths | Still requires every higher authority; production denied |
| `incompatible` | Partial/malformed schema or discovery failure | Affected claimant starts/claims nothing | Denied |

This avoids two unsafe extremes: crashing an old binary/schema combination merely because a new table is absent, and treating a partially applied or look-alike schema as if it were safely old. The allocated `src/db/schema-capabilities.ts` detector must re-attest ledger and full shape when its DB-handle/`PRAGMA schema_version` cache refreshes; it must never cache hold state. Until the 027 filename, packaged SHA, and full schema manifest are independently frozen, no database can produce a production-eligible `ready` result. `src/db/schema-capabilities.test.ts` must cover exact readiness and missing/wrong filename, hash, shape, check, trigger, index, and discovery-failure negatives.

Migration 027 may not land until every existing runtime claimant and direct maintenance script is ready to honor the `ready` state. Previous-binary rollback remains blocked until release tooling proves that the old binary cannot process held rows.

## Kill switches

The following controls are independent and default off/deny for new restricted capabilities:

- browser transcript capture server mode;
- capture intent/grant/commit write enable;
- manual transcript enrichment UI enable;
- manual transcript enrichment authorization/write enable;
- manual transcript enrichment execution enable;
- background-worker mode;
- provider-specific execution eligibility;
- manifest/policy validity and time windows.

Disabling execution after dispatch records a content-free phase outcome and prevents stale apply unless the exact accepted policy explicitly permits late-response handling. A kill switch does not erase a dispatch fact or claim provider deletion that has not been proven.

## External live-lab packet

The isolated live lab remains blocked until a reviewed packet supplies all of:

1. written target-specific YouTube/platform-policy determination;
2. approved ordinary watch-page targets, rights basis, and sample size;
3. separate lab deployment identity, extension identity, credentials, database, and data root;
4. private capture manifest outside Git with exact owner/mode/target/retention bindings;
5. private processing manifest and accepted processing decision;
6. provider/account/model handling terms and deletion/retention truth;
7. authorization expiry and source delete-by clocks;
8. cleanup owner, command, deadline, and verification;
9. content-free monitoring, stop thresholds, kill switch, backup, and rollback procedure;
10. the accepted D-008 contract and passing packaged security evidence.

Repository access, a developer's account, an environment variable, or a generic legal note is not a substitute.

## Current runtime and release blockers

| Blocker | Evidence | Effect |
|---|---|---|
| Link-only lacks frozen 027 exclusions | migration 021 enqueues weak YouTube rows; `DEPENDENCY_GRAPH.md` now makes 027 a predecessor | Blocks link-only implementation/release |
| Migration 027 not implemented/frozen | `DEPENDENCY_GRAPH.md:95`; current migrations end at 026 | Blocks held source, exact revision, and safe claim/apply |
| Revision/claim fencing and automatic transcript apply receipt do not exist before 027 | R-006 and R-032; `CALLER_CONTAINMENT_INVENTORY.md` | Blocks migration-027 completion and processing release |
| External authorization packet absent | `IMPLEMENTATION_TRACKER.md:52-64`; D-013 | Blocks live lab canary |

## Advancement gates

### Containment foundation may be production-deployed only when

- the exact baseline/source/migration inventory remains reconciled;
- all Stage 0 P0/P1 findings are closed;
- production wins every deployment/mode/flag/manifest/approval combination;
- restricted routes deny before body reads;
- schema 026 ordinary behavior is unchanged;
- disabled/manual modes start no forbidden claimant;
- ready-schema holds are excluded at claim, pre-dispatch, and apply;
- both direct production backfill families are contained;
- diagnostics pass forbidden-field scans;
- release configuration and rollback compatibility are reviewed.

### Live lab canary may begin only when

- every containment and migration-027 gate passes;
- the accepted D-008 contract has passing packaged implementation/security evidence;
- the external packet is accepted in full;
- packaged-local fixture tests prove trust boundaries and cleanup;
- the private manifests and isolated data root validate at startup;
- one-item stop/go and cleanup runbooks have named owners;
- no production identity, database, credential, origin, or target is reused.

### Production capture or held processing

There is no advancement checklist under the current authority. Both are **DENIED**. A future attempt requires a separate reviewed decision and code change that explicitly supersedes the governing no-go; configuration alone is insufficient.

## Current decision

- Production-safe documentation and containment work: **GO within Stage 0/Stage 1 gates**
- True link-only work: **conditional after frozen/reviewed 027 exclusions, separately gated**
- Fixture-only browser/manual paths: **conditional after D-008 and implementation gates**
- Isolated live lab canary: **BLOCKED absent external packet**
- Production browser-visible transcript capture: **DENIED**
- Production held browser-transcript enrichment/indexing: **DENIED**
