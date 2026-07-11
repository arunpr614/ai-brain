# Privacy and Publication Review

**Review date:** 2026-07-11 11:56 IST
**Reviewed baseline:** current publication candidate on `docs/definitive-project-wiki`, based on `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`
**Independent reviewer:** technical architect acting as security/privacy reviewer
**Final verdict:** **GO**

## Publication boundary

The public set comprises `docs/wiki/`, `docs/agent-docs/`, the architecture plan, and the reconciled artifacts under `docs/feature-council/project-wiki/`. Raw local research content is not copied. The 17,989-row relevant-file manifest excludes generated cache content. Publication-candidate rows retain publication-safe names/metadata/hashes; sensitive rows publish only a one-way redacted-path identifier, type, classification, and exclusion reason.

The following remain excluded: databases, private evidence/report directories, credentials and environment values, owner identifiers and hostnames, absolute local paths, device logs, live operational proofs, handover configuration, and executable production-write instructions.

## Findings and disposition

| Severity | Finding | Disposition |
|---|---|---|
| P1 | The first inventory build preserved a personal-owner filename and the privacy gate scanned Markdown only. | The generator now treats personal-name paths as sensitive and replaces them with `redacted-path/<sha256-prefix>.<ext>`. The inventory was regenerated. The privacy checker now scans Markdown, CSV, and JSON, and the package gate includes the complete project-wiki artifact folder. A CSV-only synthetic smoke fixture proves the personal-name rule. |
| P1 | Adversarial/security re-reviews found database backups, signing/client artifacts, raw logs/JSONL, nested data artifacts, and broader standalone live/Android/device/runtime evidence paths still marked publication-candidate with exact metadata. | A single shared policy now drives generation, independent checking, and regression smokes. It covers every discovered class and excludes `.npm-cache`. Every excluded-sensitive row replaces its name with a one-way redacted-path identifier and replaces size, time, and content hash with `<redacted>`. Fixtures include the exact missed Recall/Android/runtime/log/artifact shapes. |
| P2 | Three security summaries overstated Origin and client-version enforcement. | All summaries now state the actual boundary: bearer token is primary, client version is checked only when present, Origin may be absent, and Chrome-extension origins are accepted broadly. |
| Gate | The new artifact checker was initially absent from the command-safety registry. | Classified as `R0 read-only local`; all 144 package commands are now classified. |

## Automated evidence

- `npm run check:agent-wiki-privacy`: 116 Markdown/CSV/JSON artifacts scanned after adversarial fixes, zero findings.
- `npm run smoke:agent-wiki-privacy`: safe placeholder, Markdown secret classes, CSV personal-name disclosure, and fail-closed empty-scope behavior passed.
- `npm run check:project-wiki-artifacts`: 17,989 relevant local files, 84 page-audit rows, 46 feature rows, 37 idea rows, and 84 wiki pages validated with zero findings.
- Manual denylist scan: no email address, absolute user path, live owner hostname, credential/token shape, personal-owner name, live host IP, dangerous approval text, or CSV formula cell found in the publication set.
- `npm run check:agent-docs`: complete documentation gate passed after the command-safety fix.

## Accuracy checks at the security boundary

- Session-cookie and shared-bearer flows are documented separately.
- Optional client-version validation and permissive missing-Origin behavior are explicit.
- Extension configuration is documented as a hard-coded/read-only endpoint with only the token stored.
- The two historical `017` migrations are documented as distinct full filenames rather than one numeric identity.
- Single-user/shared-token limitations are not described as per-device authorization.

## Residual risks

- Pattern-based privacy gates reduce but cannot eliminate semantic disclosure risk. Human review remains required for new source classes.
- Content hashes permit duplicate mapping but could reveal equality with a known public file; they do not reveal file content.
- The inventory generator's source roots are intentionally not reconstructible from the public CSV. Regeneration requires the private local source set.

## Publication recommendation

The automated publication boundary is safe. The independent security/privacy reviewer inspected the shared policy, exact regression fixtures, regenerated 17,989-row inventory, metadata-redaction invariants, and privacy/artifact smokes and returned final **GO** with no publication blocker. Remote render/concurrency/PR/live gates remain separate QA requirements.
