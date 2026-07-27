# Handover Integrity Manifest

## Seal scope

- **Sealed at:** 2026-07-28 00:51:22 IST
- **Repository-state audit:** refreshed during review-item remediation on 2026-07-27
- **Remote PR/ref refresh:** exact head/base revalidated before sealing
- **Cold-start reader test:** initial content NO-GO remediated; the FG17 isolated pass and whitespace-boundary follow-up found the corrected publication controls coherent with zero findings
- **Branch/head:** `feat/youtube-item-recovery-enrichment@4786b079e88cc01ec8e9c300faa93e3832ae2678`
- **Protected-main snapshot:** `6784e0e85c50fd86e3353b54a8b1964f045b65b1`
- **Payload:** 19 newline-terminated Markdown files, 6,395 lines
- **Package total:** 20 Markdown files including this manifest

This checksum manifest seals the 19 payload files below. It intentionally does
not contain its own raw-file SHA-256: a raw file cannot include its own hash
without an external seal or canonicalization rule. The stable
[`../INDEX.md`](../INDEX.md) records the manifest's exact raw SHA-256, and the
append-only running log records the same content-free pointer after final
validation.

The hashes prove only the package bytes. They do not convert snapshot facts
into live state, validate implementation code, accept D-021, authorize a
migration, or grant staging, commit, push, PR, merge, lab, deployment, Wiki,
release, or production authority.

## Payload hashes

| File                                                 | Lines | SHA-256                                                            |
| ---------------------------------------------------- | ----: | ------------------------------------------------------------------ |
| `README.md`                                          |   198 | `f8ad0ad56c34276d7f926b6dcca0b48c440896d3b4702f94f822a7581056d341` |
| `GOVERNING_GOAL_PUBLIC_SNAPSHOT.md`                  |   227 | `565d48d6a3a286f94349a11bb5e2548ee60398cdb0b12c40773ebb2b331756fd` |
| `CURRENT_STATE.md`                                   |   149 | `95b91f5a27b2de194945af0a507ef80aa5919b17b0e0740e4e3e7dd4e9f122a2` |
| `01_GOAL_SCOPE_AND_AUTHORITY.md`                     |   167 | `3885647952e8175486d6ac0cdab66ea22cd3899c16a64d2c1cab9f1e24cdc17a` |
| `02_REFERENCE_EVIDENCE_INVENTORY.md`                 |   204 | `d1e4b268b9747ac348c027363e9249c1ed88d3b00157d12a1449b0312d66b888` |
| `03_WORK_COMPLETED_AND_DELIVERED.md`                 |   220 | `e9ab7f1caac887a42ab9012737f96ac50d8226e87c9b9bbbeea46203cec29dac` |
| `04_CURRENT_WORKTREE_AND_UNCOMMITTED_STATE.md`       |   199 | `178d0516cfb806ba6efebe8bb8e8199b4306390d70c5a11f44799db45373c9e3` |
| `05_STAGE2_CONTRACT_CRASH_RECOVERY_AND_WAL.md`       |   295 | `648ce6c1bf7830b718c600a516a9feaaf2ef3815884d309c68dd1002d07506de` |
| `06_ARCHITECTURE_AND_DATA_FLOW.md`                   |   362 | `9b55e6ff333344f2fd1adc557a4d36d046c2124aaa8658c4c5ffa143e6311918` |
| `07_REQUIREMENTS_AND_VERIFICATION_STATUS.md`         |   363 | `193d973ad8dc74638b4ca943191189465f852140ad1c0ac231ed4d09638a298b` |
| `08_EXECUTION_PLAYBOOK.md`                           |   572 | `682d75828656edbe9e0fcac774c013b22519e6b01eae95b9471ed8d0e9913d6f` |
| `09_DECISIONS_RISKS_BLOCKERS_AND_STOP_CONDITIONS.md` |   242 | `fe4e9751928563db4ed465e6bc532f12f8a28147411b1582cc75b1b089bb0535` |
| `10_GIT_PR_CI_TESTS_AND_COMMANDS.md`                 |   422 | `e48d9540058e0ff94d49fff05be92c81a5599881ed8c9e947e36db28e4f36818` |
| `11_DOCUMENTATION_WIKI_LAB_AND_RELEASE.md`           |   506 | `0033126b78593496fcb2f7273cc5909857594948b3adf25bef0b8206d9da48aa` |
| `12_SUCCESSOR_COMPLETION_CHECKLIST.md`               |   378 | `b842e20478539573a6c63a2a32154266f12167b817b71e3bf2015511285f5d63` |
| `13_D021_ADVERSARIAL_REVIEW_SESSION_FINDINGS.md`     |   239 | `3b8891708676c8912dc2ffabf43b847001d08b14ed86455a72d732609b9cb42d` |
| `14_FILE_ARTIFACT_AND_COMMIT_MAP.md`                 |   571 | `6bff848ddac2f8e735e4c922d28da270b4783bfeb5499d7f6e4d5058393c8d5e` |
| `ADVERSARIAL_REVIEW_DISPOSITION.md`                  |   320 | `e779679dc0f0273cd96fd853642fe03adf6cc3667f52c1f3b9af3375ced7b942` |
| `COLD_START_READER_TEST.md`                          |   761 | `cff799be0b39c2c73b8bda046ba851e889589b489b725ca271b6066d24654d81` |

## Verification rule

From the repository root, run:

```bash
node scripts/verify-youtube-item-recovery-handover.mjs --mode local
```

The verifier checks:

- exact payload membership, line counts, and SHA-256 values;
- the manifest's external SHA-256 anchor in `../INDEX.md`;
- relative Markdown targets and anchors;
- required security, migration, review, retry, source-compatibility, and
  authority semantics; and
- privacy and overclaim signatures.

Local mode is the pre-review integrity gate. It does not claim that the
subsequent exact-byte review or append-only log closure has occurred.

Publication additionally requires:

```bash
node scripts/verify-youtube-item-recovery-handover.mjs --mode publication
```

That mode also requires the repository to be public and every configured
origin fetch and push destination to identify the expected repository;
enumerates the exact dated directory; checks exact tracked/index-matching bytes
and the complete staged path set including deletions; validates staged-diff
integrity; and requires the latest append-only log entry to contain one unique
block binding the exact stable-index, manifest, and verifier hashes; the
locally verified report bytes and matching exact-review record; `GO`; zero
P0/P1; and the bounded Group E authority attestation. It privacy-scans the
complete appended suffix and requires the staged running log to be a strict
append of the `HEAD` bytes. It also rejects a detached `HEAD` or a raw review
report present in the Git index. Any mismatch means the package is not the
sealed edition.

Before relying on repository, PR, CI, worktree, or authorization claims, follow
the live-refresh procedure in [README.md](README.md). A matching package hash is
provenance evidence, not current-state evidence.
