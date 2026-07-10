# Production Source Baseline Attestation — 2026-07-10

**Purpose:** identify the repository content snapshot that must be preserved before F08 implementation/deployment.
**Method:** read-only production file hashes and database migration inventory compared with repository commits.
**Production mutation:** none.

## Verdict

Commit `8178117c80923e5724e355fb2684cbc836013d39` (`Consolidate AI Brain UX and Recall sync work`) is the attested consolidated source baseline for this feature branch.

This does **not** assert that production was deployed by checking out that later consolidation commit: the service has been active since 2026-06-26, while the commit was recorded on 2026-07-09. It does prove that distinguishing deployed public files and the live migration history match the consolidated content snapshot and do not match the narrower Recall-only sibling `4d97c45`.

## Evidence

### Migration history

- Live DB: 22 applied migration rows through `020_recall_sync`.
- Live migration files include `018_transcript_policy_sources.sql`, `019_transcript_segments.sql`, and `020_recall_sync.sql`.
- `4d97c45` contains 020 but lacks 018/019.
- `8178117` contains 018, 019, and 020.

### Distinguishing live file hashes

| File | Live `/opt/brain` SHA-256 | `8178117` | `4d97c45` | Result |
|---|---|---|---|---|
| `public/manifest.webmanifest` | `c0dd65d76534cdbb899064a5252a2f96546406f8e7372c25f95dc9014f128cfe` | exact match | `a8b6e2adde012ecea1c4cf1760bf3c3d9517275b2ca29c84b349d4e73d308dd7` | 817 only |
| `public/offline.html` | `09c94ffb998059eb2834b02160003cb40ac2400b297087d8f12f40e9dc0914ff` | exact match | `6386322471a47b781d95e21eb330958b5787e75a60e9d316a343ba4f8aa5739c` | 817 only |

### Common Recall/runtime file hashes

The following live files exactly match both siblings, confirming the Recall layer that must be retained:

| File | SHA-256 |
|---|---|
| `public/sw.js` | `8989d509b3ab61952dc0c96ec9e68095fb4ee9b82fa29b0c485e9e14b8410b83` |
| `public/ai-memory-logo.png` | `400985e41d26c01bdef59529fc5de4976140931df4c8a543caf71488ae9a55f4` |
| `scripts/check-recall-key-rotation-evidence.mjs` | `14bcea5dc43e7c18e2c7843836292df746df6a2f57123f950c82307ef1891632` |
| `scripts/recall-scheduled-apply.sh` | `f0c551ac3c85f47f0c85d8232f677a1b50ccfe0b80042506bb8084d4219ec5bd` |
| `scripts/deploy/brain-recall-sync.service` | `829a0b59b1c00660a7c3f74870b963a770b3535775ff3951d6272aba7084e21e` |
| `scripts/deploy/brain-recall-sync.timer` | `ebd31918ac1af1cebceb98e16c1372c67a418267550667a00d729d2f2d61641a` |

## Required integration action

1. Commit the F08 artifact milestone on the main-derived feature branch.
2. Merge `8178117` into `codex/manual-content-notes`, preserving both `origin/main` improvements and the consolidated production UX/Recall/transcript source.
3. Resolve conflicts without deleting either migration history. Integration migration 021 restores the transcript-recovery trigger dropped by the 020 items rebuild; F08 schema begins at 022.
4. Reinstall dependencies and pass the integrated baseline typecheck, lint, tests, production build, dependency audit, and Recall preflights before F08 code changes.
5. Before deploy, compare the complete local artifact/explicit script inventory with `/opt/brain`; review every `rsync --delete` removal. Any unexplained difference remains a release blocker.

## Residual limitation

Compiled Next.js standalone route chunks do not expose a simple source commit identifier. The two distinguishing public-file hashes plus the 018/019/020 database/file history are strong content attestation, but the final release still requires a complete artifact inventory and post-merge regression checks.
