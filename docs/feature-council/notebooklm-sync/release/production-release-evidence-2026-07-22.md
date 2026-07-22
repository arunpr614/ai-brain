# NotebookLM one-click export — production release evidence

**Evidence date:** 2026-07-22  
**Protected-main release:** `167a15d57b8f70574a017ea4cda507870f3600d4`  
**Current production stage:** UI-only (`1:0:0`)  
**Verdict:** **PARTIAL — deployed UI-only; provider canary and owner-only enablement are pending**

This record separates facts proved in production from code-level expectations and pending live-provider work. “Deployed” below does not mean that NotebookLM provider writes are enabled or that the end-to-end path has passed a signed-in canary.

The public NotebookLM entry point is `https://notebooklm.google/`. The authenticated web application and the connector's optional Chrome host permission use `https://notebooklm.google.com/` and `https://notebooklm.google.com/*`, respectively.

## 1. Truth boundary and disposition

The protected-main server release is running in production. Migration 026, health, integrity, foreign-key, timer, retention, remediation, and provider-block checks passed. The owner-facing Brain settings and item surfaces are exposed, while queue admission and provider writes remain disabled.

The Chrome extension package was attested and installed into a stable local directory. It has not been manually loaded into Chrome, paired to Brain, or bound to a NotebookLM target. No signed-in NotebookLM source creation, reconciliation, deduplication, or cleanup has been exercised. No real item has been exported.

The feature therefore remains **Experimental** and must be described as **deployed UI-only / provider-off**, not “available,” “enabled,” “working end to end,” or “live-provider verified.”

## 2. Protected-main provenance

| Gate | Evidence |
|---|---|
| Feature merge | [PR #43](https://github.com/arunpr614/ai-brain/pull/43), merge `ca1886a2c24fdd8117d922efd399460b9f12d833` |
| Portability correction | PR #44, merge `9c4082907480a1a4243367b5adedb1188d6985c7` |
| Protected-main release gate | [PR #45](https://github.com/arunpr614/ai-brain/pull/45), merge `167a15d57b8f70574a017ea4cda507870f3600d4` |
| Product CI | Run `29911112907`, all required jobs green; release artifact attested |
| Main protection | Strict, app-pinned `verify` check; pull request required; administrators enforced; stale-review dismissal and conversation resolution enabled; force pushes and deletion disabled |

Production was deployed from the exact protected-main release SHA, not from a mutable working tree or feature-branch build.

## 3. Automated release gates

| Gate | Result |
|---|---:|
| Automated tests | 1,034 / 1,034 passed |
| Type checking | Passed |
| Lint | Passed |
| Release-smoke checks | 325 passed |
| Canonical Wiki-page checks | All 88 passed |
| Final adversarial review | No open P0, P1, or P2 findings |
| Independent protected-main review | Clean |

The 88-page result validates the repository corpus only. It is not evidence that the post-release Wiki publication has occurred.

## 4. Artifact identities and attestations

| Artifact | SHA-256 |
|---|---|
| Server archive | `4e27118ffb0bb80a5c1ed9b70c21ac6443a0d3309bce548647482ab540f63c75` |
| Server manifest | `60dabe512b1d8dffd71e8c3e637329533462bacf87771828c36f5fb960a89588` |
| Server checksum record | `16a99ce7ab06589df178b4a18bb33c90e9c07d6e00aa2204d722bfdfb9edff48` |
| Chrome extension ZIP | `b90fbd92079933c66a1287d561a705297351931e521ab31cfddf957c67864221` |
| Chrome extension manifest | `70a26e3b364ebf3f881a4f397909e38e3a0d5a131cc39d24fdf073d50f3b5a3e` |
| Chrome extension checksum record | `c72ab782e42ce1a040eaeccd8eb436a2e4e46a5bc24eadaa67908b948d291e00` |
| Migration 026 | `1ba76b030c58af334b588923ee2eef34282c360d79b8b162d653ef454c96513f` |

All listed attestations and checksums were verified before deployment or local extension installation.

## 5. Dark and UI-only production deployment

### Initial dark deployment

- Exact runtime release: `167a15d57b8f70574a017ea4cda507870f3600d4`.
- Existing Processing controls remained `1:1:1`.
- NotebookLM controls started at `0:0:0` (UI off, queue off, provider writes off).
- Strict remediation remained enabled.
- Authenticated health, operations readiness, database quick check, foreign-key check, migration 026, timers, and immutable retention all passed.
- Connector, target, request, and export-event setup/work tables were empty.
- Provider write-block violations: zero.
- The only retention activity was the expected content-free, zero-count heartbeat.

### UI-only promotion

The production tuple was atomically promoted to `1:0:0`:

| Control | State |
|---|---|
| `BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED` | `1` |
| `BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED` | `0` |
| `BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED` | `0` |

The successful restart reported authenticated health `200`, operations `ready`, zero setup/work rows before UI inspection, zero runtime-safety violations, one allow-listed warning from deliberately stopping the previous process during restart, and zero unexpected warnings. New intake, pre-create claims, and provider creates remain unreachable at `1:0:0`. Read-only recovery polling/reconciliation claims remain supported by design, but no request exists to claim.

Authenticated Brain UI verification found:

- the NotebookLM settings page present;
- **Export queue: Paused**;
- **Provider writes: Off**;
- safeguards and retention healthy;
- the item-level NotebookLM export surface present but unavailable;
- no enabled-state language on the item surface.

This UI inspection did not submit an export or contact NotebookLM. An independent read-only post-check then reconfirmed the exact release and effective/live-process tuple `1:0:0`, authenticated health `200`, migration hash, database integrity, runtime safety, operations readiness, and healthy timers. Pairing codes, connectors, targets, export requests, and request-transition events remained zero. Apart from the required migration and runtime-control state, the only feature-local activity records were two content-free `notebooklm.export_viewed` UI analytics events and one zero-count retention-success heartbeat. The current service invocation and NotebookLM unit journals contained zero warnings or errors.

The two UI-view events are expected Stage 1 telemetry, not provider-write evidence. They also mean that the runtime is no longer eligible for the narrowly permitted pre-026 rollback state, which allows only an empty/default schema or zero-count retention-success heartbeats.

## 6. Backup and recovery evidence

The pre-deployment production backup was scrubbed, integrity-checked, and retained before the release changed runtime state.

| Property | Evidence |
|---|---|
| Backup SHA-256 | `e20102fdd1108a4d3682586301b108bf4b574d863766883d6a415340f3205b9d` |
| Size | 9,150,464 bytes |
| Privacy treatment | Scrubbed; no private host path recorded here |
| Verification | Integrity and restore-readiness checks passed |

The UI-only configuration update also created a restricted, same-host pre-change backup. Its public-safe basename is `.env.pre-notebooklm-ui-20260722T105105Z` and its SHA-256 is `f00b853f516a6759dec4707ef2da89388dbd73a2a5a46cd24fc39b0e4281f72b`. The private host path, device details, and secrets are intentionally omitted.

## 7. Chrome extension state

| Property | State |
|---|---|
| Version | `0.7.0` |
| Manifest | MV3 |
| Release provenance | App and builder SHA match `167a15d57b8f70574a017ea4cda507870f3600d4` |
| Artifact | Attested extension ZIP hash from section 4 |
| Stable local installation | Passed |
| Loaded in Chrome | **No — pending manual owner action** |
| Paired to Brain | **No** |
| Bound to a private NotebookLM target | **No** |

Chrome does not permit this automation session to open `chrome://extensions`. The owner must manually load the unpacked extension, then open its options page. Until that happens, connector-claim and provider-path behavior remain unproved.

## 8. Signed-in private synthetic canary matrix

Only synthetic, non-sensitive content may be used. Every live gate is pending.

| Gate | Status | Pass condition |
|---|---|---|
| Authorized account lane | PENDING | Personal owner account, or explicit organizational authorization for the managed account |
| Extension load and origin audit | PENDING | Attested extension loads with no unexpected host permission or origin drift |
| Connector pairing | PENDING | One owner connector pairs without disclosing secrets |
| Private target/account/capacity bind | PENDING | Exactly one private notebook, correct authorized account, adequate source capacity |
| Queue-on / writes-off rehearsal | PENDING | Claim path works while the independent provider-write gate still blocks creates |
| First synthetic create | PENDING | Exactly one source is created and reaches Ready |
| Unchanged retry | PENDING | Same version deduplicates; no second source |
| Changed-version retry | PENDING | Exactly one new immutable source is created |
| Lost-response reconciliation | PENDING | Existing source is reconciled without a second create |
| Marker cardinality | PENDING | Zero and multiple markers stop safely; exactly one marker is accepted |
| Independent write stop | PENDING | Provider-write gate prevents creates even if queue admission is available |
| Redaction and retention | PENDING | Logs/events contain no content, account email, notebook ID, item ID, token, or request body |
| Synthetic cleanup | PENDING | Canary sources are removed or explicitly retained by the owner; final source count recorded |

Hard stops include CAPTCHA, account/security warnings, consent changes, access denial, rate-limit friction, provider UI/RPC drift, or any uncertainty about the authorized account or private target.

## 9. Owner-only enablement and observation

**Status: PENDING.**

Owner-only real-content enablement is prohibited until every canary gate in section 8 passes and a post-canary observation window remains green. The final enabled tuple, observation timestamps, request counts, and rollback decision must be added here before this evidence can be marked complete.

No real AI Memory content may be used to finish the canary. No broader user rollout is authorized by this release record.

## 10. Rollback and kill switch

The controls are independent and fail closed:

1. Set provider writes to `0` to stop new NotebookLM creates while preserving read-only recovery polling and reconciliation.
2. Set queue admission to `0` to stop new request intake and pre-create claims. Known-source polling and reconciliation claims may continue, but cannot authorize a create while provider writes are off.
3. Set the UI flag to `0` to hide the owner-facing surface.
4. Restart through the guarded production path and verify `0:0:0`, authenticated health, operations readiness, runtime safety, and no unexpected warnings.
5. Do **not** deploy the retained pre-026 server artifact now: the two content-free UI-view events make the current database fail its deliberately strict pre-026 compatibility proof. If the release itself is implicated, remain on a schema-026-aware runtime with `0:0:0`, or deploy only a separately reviewed schema-026-aware corrective artifact, then verify existing Processing behavior plus the database/timer gates.

The schema is additive. Disabling the feature does not require deleting connector metadata or export history. Remote NotebookLM sources are never deleted automatically. Deleting telemetry merely to force eligibility for an older binary is not an approved rollback procedure.

## 11. Privacy and redaction attestation

This record intentionally excludes:

- account email and account identifiers;
- notebook title, URL, ID, source ID, and capacity details;
- AI Memory item title, URL, ID, body, or rendered content;
- connector token, pairing secret, cookies, request bodies, and provider responses;
- production host paths, device/inode details, and SSH material.

Production validation before the provider canary used metadata-only checks. The planned canary is synthetic and private. Operational evidence must remain count/status/hash based.

## 12. Residual risks and policy boundary

- The consumer connector depends on undocumented NotebookLM web RPCs. Official documentation does not provide an express consumer automation API authorization; compatibility and policy risk remain.
- The current and announced Google Terms prohibit automated access that violates machine-readable instructions and also prohibit safeguard bypass, disruption, deception, and scraping other people's content. The public entry point currently allows crawling, while signed-in application instructions remain ambiguous after the signed-out redirect.
- A managed Workspace or custom-domain account requires organizational authorization before any provider write. Account authorization has not yet been established for this release.
- Provider RPC shape, anti-automation controls, source limits, login state, and UI can change without notice.
- The extension requires explicit manual installation and optional host permission. Permission or origin drift is a hard stop.
- Exported versions are immutable sources. Local deletion or retention does not delete remote NotebookLM sources automatically.

The canary may proceed only as an owner-observed, low-rate, serialized, one-synthetic-item private test with immediate stop on friction or warnings. A policy review is not a guarantee of provider permission.

## 13. Final disposition and linked evidence

**Current disposition: PARTIAL.** The protected-main server release and UI-only stage are accepted. Signed-in provider behavior, private target binding, owner-only enablement, Wiki publication, and the final running-log append remain open gates.

Related evidence:

- [Delivery contract](../product/ONE_CLICK_EXPORT_DELIVERY_CONTRACT_2026-07-21.md)
- [Canonical DataWiki page](../../../datawiki/NotebookLM-One-Click-Export.md)
- [Canonical GitHub Wiki source page](../../../wiki/NotebookLM-One-Click-Export.md)
- [Dated release-candidate adversarial review](../../../../ReviewReport/NOTEBOOKLM_ONE_CLICK_EXPORT_RELEASE_CANDIDATE_ADVERSARIAL_REVIEW_2026-07-22_13-32-09_IST.md)
- [Current Google Terms](https://policies.google.com/terms?hl=en-US)
- [Announced Google Terms update](https://policies.google.com/terms/update?hl=en-US)
- [Google Generative AI prohibited-use policy](https://policies.google.com/terms/generative-ai/use-policy?hl=en-US)
- [NotebookLM privacy and terms](https://support.google.com/notebooklm/answer/17004255?hl=en)

This document must be revised gate-by-gate after the signed-in synthetic canary and again after owner-only enablement and Wiki publication. It must not be changed from PARTIAL to COMPLETE based on repository tests alone.
