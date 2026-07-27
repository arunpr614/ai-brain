# YouTube Item Recovery Handover Index

## Current package

The current privacy-scrubbed handover is
[2026-07-27](2026-07-27/README.md).

| Field                              | Value                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| Branch snapshot                    | `feat/youtube-item-recovery-enrichment`                                             |
| Pushed head                        | `4786b079e88cc01ec8e9c300faa93e3832ae2678`                                          |
| Protected-main snapshot            | `6784e0e85c50fd86e3353b54a8b1964f045b65b1`                                          |
| Current implementation gate        | Crash/restart prerequisite incomplete; D-021 and migration 028 blocked              |
| Production capture/held processing | Denied                                                                              |
| Manifest                           | [dated manifest](2026-07-27/HANDOVER_MANIFEST.md)                                   |
| Manifest SHA-256                   | `5335dac9103959ea434eaf35d439ad02e8c1599b1819bf5f7b599925eab30c68`                  |
| Payload                            | 19 files, 6,395 lines; exact rows in the manifest                                   |
| Final adversarial review           | Required on the sealed bytes; the append-only running log records the latest result |

This index is the stable discovery path. Snapshot facts are not live authority;
run the dated package's remote-refresh commands before acting.

## Verification

From the repository root:

```bash
node scripts/verify-youtube-item-recovery-handover.mjs --mode local
```

Local mode is the pre-review package-integrity gate and makes no final-review
closure claim.

Publication requires the stronger mode:

```bash
node scripts/verify-youtube-item-recovery-handover.mjs --mode publication
```

Publication mode additionally validates the content-free current Group E
authority attestation, tracked/index-matching bytes, the exact branch, every
configured origin fetch/push destination, enforced public-repository
visibility, the exact complete staged set including deletions,
privacy-signature success, and one unambiguous final-review block in the latest
running-log entry. That block binds the manifest, exact stable-index bytes,
verifier, locally verified review artifact and its matching machine record,
`GO`, and zero P0/P1. The full appended suffix is privacy-scanned and the staged
log must be a strict append of its `HEAD` bytes. A detached `HEAD` and a tracked
or staged raw review artifact fail closed. The verifier records and validates
the attestation; it does not originate user authority.

## Authority

This index and package do not authorize staging, commit, push, pull-request
mutation, merge, migration, Wiki publication, live lab, deployment, release, or
production enablement. Technical GO stops at `ready but not authorized` unless
the exact action and slice have separate current authority.
