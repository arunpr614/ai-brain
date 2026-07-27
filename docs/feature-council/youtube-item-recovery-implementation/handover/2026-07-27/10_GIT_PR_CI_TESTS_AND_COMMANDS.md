# Git, Pull Request, CI, Tests, and Commands

## Repository-state snapshot at 2026-07-27 14:02 IST

| Field | Value |
|---|---|
| Branch | `feat/youtube-item-recovery-enrichment` |
| HEAD/upstream/remote feature | `4786b079e88cc01ec8e9c300faa93e3832ae2678` |
| Remote `main` | `6784e0e85c50fd86e3353b54a8b1964f045b65b1` |
| Merge base | `6784e0e85c50fd86e3353b54a8b1964f045b65b1` |
| Divergence | 22 ahead, 0 behind |
| Remote | `https://github.com/arunpr614/ai-brain.git` |
| Staged changes | None at audit time |
| Pushed PR diff | 214 files, +75,704 / -2,171 |

The tracker's `f905f6a...` frozen implementation base is historical project evidence, not the current live Git merge base.

This table is a dated snapshot, not a live assertion. Before using any remote,
branch, PR, migration-frontier, or hosted-CI fact, resolve the repository root
and perform both mandatory refreshes:

```bash
project_root="$(git rev-parse --show-toplevel)"
cd "$project_root"
git ls-remote origin refs/heads/main refs/heads/feat/youtube-item-recovery-enrichment
gh pr view 57 \
  --json number,title,state,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,url
```

Record the command time and exact returned SHAs. If either refresh is
unavailable, changes assumptions, or disagrees with the working tree, stop the
affected claim or mutation.

## Draft pull request

[PR #57: YouTube item recovery and held enrichment foundations](https://github.com/arunpr614/ai-brain/pull/57)

| Field | Snapshot |
|---|---|
| State | Open |
| Draft | Yes |
| Base | `main` |
| Head | `4786b079e88cc01ec8e9c300faa93e3832ae2678` |
| Mergeability | Mergeable / clean |
| Reviews | None |
| Branch protection | Strict `verify` is the required check |

Mechanical mergeability is not merge authorization. The PR must remain draft/NO-GO while migration, feature, QA, review, and release gates are open.

This handover does not itself originate authority for a PR-body edit, stage,
commit, push, review submission, merge, deployment, or release. The governing
goal plus the latest explicit user request separately authorize only the exact
Group E handover set to be staged for publication verification and, after that
identical set passes, committed, pushed, and reflected in the existing draft PR.
That narrow authority does not cover feature or crash-proof implementation
bytes, review submission, merge, deployment, or release. Before any Git or
GitHub write, record the latest explicit governing instruction that authorizes
that exact action, paths/commit/remote target, and permitted effect. If that
mapping is absent or ambiguous, stop before the write.

### PR body drift

The current PR body still says hosted macOS evidence is pending. That is stale
for pushed implementation head `4786b07`, whose nominal hosted jobs are green.
After the identical exact Group E set passes publication verification and its
authorized handover-only commit is pushed, the existing draft PR may receive a
handover-only correction. That correction may identify the sanitized handover
and verifier and correct the stale nominal-evidence statement; it need not wait
for an unrelated crash-proof implementation push. It must preserve:

- the exact current implementation status;
- every open P1/P2;
- migration 028 NO-GO;
- lab/production feature denial;
- no merge/deployment/release authority; and
- exact current test/CI links.

Any PR-body statement that represents crash/recovery implementation as pushed,
tested, reviewed, or complete remains blocked until the exact crash slice is
pushed and its hosted exact-commit evidence has passed the mandatory review.
Never use the Group E handover-only correction to describe local implementation
bytes as hosted.

## Exact-head hosted evidence

### Product CI

- Run: [30245448800](https://github.com/arunpr614/ai-brain/actions/runs/30245448800)
- Head: `4786b079e88cc01ec8e9c300faa93e3832ae2678`
- Conclusion: success

| Job | ID | Result |
|---|---:|---|
| Stage 2 native nominal proof | `89911374316` | 30 pass, 0 fail, 3 skip |
| Required `verify` | `89911975927` | success; portable 1,251 pass, 0 fail, 0 skip |
| `package-known-good` | `89912542473` | skipped as expected |
| `package-main-release` | `89912542839` | skipped as expected |

### Agent documentation

- Run: [30245448803](https://github.com/arunpr614/ai-brain/actions/runs/30245448803)
- Job: `89911374473`
- Conclusion: success

These checks cover pushed nominal bytes only. The current uncommitted native/controller/CI files have never run in hosted CI.

## Superseded hosted failures

- `6e61eee`: Product CI and Agent documentation failed.
- `39bfad9`: Product CI and Agent documentation failed.
- `1fb8226` and `4786b07`: exact successor runs are green.

Do not cite a superseded failure as current, and do not use the green pushed successor to cover changed working-tree bytes.

## Current dirty-tree byte drift

| Artifact | Pushed HEAD SHA-256 | Current SHA-256 |
|---|---|---|
| Native file-factory C++ | `76f157bf3860db8a088dfbb54bbbc98a0aec1d28377ba94ec8df7f19a9a54798` | `5d9ee11ea7cf657635e8500ee3723a8126ba03a3d8f8b5422cec58929911df9f` |
| Nominal source manifest | `70fd3962e7af909da4198b24ce248f2bb565511ec2af64507ec3c32a8dc45c6d` | `f6eaa1a45dfbc109606d189841b4e8af1972478baaf6da4f3c7ec76fdda2001b` |
| `src/db/stage2/file-factory.ts` | `9980265f675ead37ec42a39409bd2b66e67cb948311bce6bf58b9d4d4ae3b11a` | `316690483b5c0c4e98f98a66553e213c5ce1dffb215d6f365bbbc3144244b8da` |

Both nominal and crash/restart paths require new local, hosted, and adversarial evidence.

## Toolchain slice

Current native slice:

- macOS/Darwin arm64;
- Node 22.22.3;
- Node ABI 127;
- the exact `command -v node` result and executable hash captured in the
  private/local evidence receipt rather than embedded as a machine-local path
  in this publication-safe package;
- Apple clang 21.0.0 (`clang-2100.1.1.101`);
- `better-sqlite3` 11.10.0;
- SQLite 3.49.2 with source ID `17144570...`.

This is evidence for the disposable prerequisite slice only. SQLite 3.49.2 is blocked for S28.

## Checks run during the handover audit

Passed:

- `git diff --check`;
- Ruby YAML parse of `product-ci.yml`;
- `node --check` for all five changed/new MJS router/worker/builder files;
- JSON parse of both source manifests;
- test inventory: 169 portable files, 2 native-nominal files, 1 crash-route file;
- nine frozen memory-only prerequisite hashes;
- frozen Stage 2 contract hash and `0444` mode;
- no matching `/private/tmp` proof/build residue;
- no matching proof process.

Unavailable/not run at the initial 14:02 IST audit:

- `actionlint` binary;
- integrated dirty-tree native nominal suite as a passing gate
  (**superseded** by the 17:11 IST 30/0/3 rerun recorded immediately below);
- integrated crash/restart suite;
- portable full suite on current bytes;
- clean-scope full typecheck/lint;
- hosted CI for current bytes;
- exact-hash integrated adversarial review.

## Current dirty-tree blockers and false-confidence hazards

This section is the current truth and supersedes the initial-audit nominal-suite
line above where the two differ.

1. The nominal trace mismatch is repaired: at 2026-07-27 17:11 IST,
   `npm run test:stage2-native:nominal` passed 30, failed zero, and retained the
   three explicit gap skips.
2. The current recovery worker rejects the new durable receipt shape.
3. Both P1 crash/restart tests remain skipped.
4. No test name matches the crash suite regex.
5. The crash job could appear green without executing the intended proof unless
   an execution-count guard is added.
6. Direct crash/recovery specialist evidence is session-derived; no integrated
   controller command transcript/review artifact is persisted yet.

The repaired nominal consumer hashes are:

| File | SHA-256 |
|---|---|
| `scripts/run-youtube-stage2-file-factory-proof-worker.mjs` | `e274ab7179a1c29118b358edf19fa2eb2bd1defc062302f5916dac3e23e2ba74` |
| `src/db/stage2/file-factory-proof.test.ts` | `44dba3abd568cd4d409918dd167bfc2fde815bc443853596a66d919d6d78eb9e` |
7. A pre-push source/local-evidence review cannot be treated as final when
   hosted evidence is required; one same-SHA post-hosted review is mandatory.
8. Hash-pinning a fixed SQLite source does not prove semantic compatibility
   with the frozen 3.49.2 contract.
9. Manual-processing tests cannot pass the stage gate unless migration 029 is
   accepted first and migration 030 contract/cutover evidence gates Stage 7.
10. Retry tests must distinguish durable `retryable`, `terminal`, and
    `outcome-unknown` states and prove reconcile-before-redispatch.

## Product-test routing

Current intended commands:

```bash
npm test
npm run test:stage2-native:nominal
npm run test:stage2-native:crash-restart
node scripts/run-product-test-suite.mjs inventory
```

Expected routing semantics:

- portable excludes native-only files;
- native nominal selects native nominal tests but excludes names beginning `crash/restart:`;
- crash/restart selects only names beginning `crash/restart:`;
- inventory reports exact file counts; and
- each native suite must fail if its intended test set is empty or all skipped.

The final condition is not yet implemented for crash/restart.

## Safe inspection commands

```bash
project_root="$(git rev-parse --show-toplevel)"
cd "$project_root"

# Mandatory live refresh before relying on cached remote or PR state.
git ls-remote origin refs/heads/main refs/heads/feat/youtube-item-recovery-enrichment
gh pr view 57 \
  --json number,title,state,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,url

git status --short --branch
git diff --stat
git diff --name-status
git diff --check
git diff -- .github/workflows/product-ci.yml
git diff -- scripts/run-product-test-suite.mjs
git diff -- src/db/stage2/file-factory.ts
git diff -- native/brain-s28-file-factory
git log --oneline --decorate -n 30
```

For untracked files:

```bash
candidate_files=(
  scripts/youtube-stage2-file-factory-crash-recovery-worker-core.mjs
  scripts/run-youtube-stage2-file-factory-crash-worker.mjs
  scripts/run-youtube-stage2-file-factory-recovery-worker.mjs
  scripts/build-youtube-stage2-file-factory-crash-recovery.mjs
)

for candidate_file in "${candidate_files[@]}"; do
  wc -l "$candidate_file"
  shasum -a 256 "$candidate_file"
  less "$candidate_file"
done
```

Read every file to EOF; do not substitute a truncated `sed`, `head`, or preview
for review. Do not print environment values, credentials, machine-local paths,
private manifests, target lists, account identifiers, attachment locators, or
transcript content into a publication artifact.

## Syntax and data checks

```bash
node --check scripts/run-product-test-suite.mjs
node --check scripts/build-youtube-stage2-file-factory-crash-recovery.mjs
node --check scripts/youtube-stage2-file-factory-crash-recovery-worker-core.mjs
node --check scripts/run-youtube-stage2-file-factory-crash-worker.mjs
node --check scripts/run-youtube-stage2-file-factory-recovery-worker.mjs

jq empty native/brain-s28-file-factory/file-factory-source-manifest.json
jq empty native/brain-s28-file-factory/file-factory-crash-recovery-source-manifest.json

ruby -e 'require "yaml"; YAML.load_file(".github/workflows/product-ci.yml")'
git diff --check
```

Use the repository's existing secret-signature and documentation commands before commit.

## Mandatory semantic and security test gates

Before migration 028 or any affected foundation:

1. select one exact fixed SQLite source and bind full source/build/package
   provenance;
2. execute a candidate-versus-3.49.2 matrix for frozen physical-contract lines
   3076-3085 (WAL/open/checkpoint/action trace), 4443-4449 (ordered
   authorizer/virtual/shadow-table callbacks), and 4514-4521 (`sqlite-vec`,
   `trusted_schema`, and delete feasibility);
3. reject semantic drift, or create a new versioned compatibility addendum,
   regenerate the dependent registry/index/verifier and hashes, and obtain
   fresh Contract GO; and
4. never edit the frozen contract package in place.

Before any manual route, UI, worker, provider, or processing behavior:

1. freeze, hash, apply, test, and accept
   `029_manual_transcript_enrichment_expand.sql`;
2. prove a content-free server-side `authorize inspect` decision precedes every
   transcript extractor/DOM read, with zero reads for refusal, expiry, drift,
   and substitution;
3. prove durable fenced retry semantics: `retryable` records non-acceptance and
   reruns only the failed provider stage under a new attempt/generation;
   `terminal` forbids redispatch; and `outcome-unknown` stays quarantined until
   reconciliation proves the provider outcome, with no blind redispatch; and
4. inventory the production extension source/files/modules/sourcemaps and
   prove absence of recovery destination, panel, extractor, upload-grant, and
   handoff capability.

Before Stage 7 completion, prove dual-read/write and backfill parity, drain,
cutover, and incompatible-rollback refusal; then freeze, apply, test, and
accept `030_manual_transcript_enrichment_contract.sql` and its post-contract
matrix.

## Frozen-hash checks

```bash
shasum -a 256 \
  docs/feature-council/youtube-item-recovery-implementation/implementation/STAGE_2_PHYSICAL_SCHEMA_ADDENDUM.md \
  docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/stage2-acceptance-registry-v2.json \
  docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/stage2-contract-static-authority-index-v1.json \
  docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/verify-stage2-contract-static-authority-index.mjs
```

Expected:

```text
d1eef042423d7d2d3413637f62bd8ed5842b64846db6f656a0b8e1cb7e5eed48
7b022d82e855891eb1a818df9c09ab070586c13beea7acf6a8c003d845be9f45
e691edfd0edcade37d439906f3b97dee9a3b05d57baae995ae23fb0254bbfd5d
133d55fae063244e7c6d413c64acbe88ebf0d1e83736296d9a00ca00de2e68a6
```

Any drift invalidates the contract review.

## Residue checks

Use bounded name scans; do not delete automatically:

```bash
find /private/tmp -maxdepth 1 \
  \( -name 'brain-s28-file-factory-proof-*' -o -name 'brain-s28-file-factory-build-*' \) \
  -print

ps -axo pid,ppid,pgid,command \
  | rg 'brain-s28-file-factory|youtube-stage2-file-factory' \
  | rg -v 'rg '
```

If residue exists, inspect exact identity and ownership first. Do not use recursive deletion.

## Git staging and commit rules

These are controls for a separately authorized mutation, not authorization to
perform it.

1. Stage explicit paths only.
2. Inspect `git diff --cached --name-status`.
3. Confirm the unrelated nested checkout is absent from the staged paths.
4. Confirm no private manifest, target, secret, absolute lab identifier, or content fixture entered.
5. Keep D-021 separate from the crash slice until each is accepted.
6. Do not mix unreviewed controller drafts with an exact-reviewed native slice.
7. Recompute and record hashes after final byte changes.
8. Append the running log only after the milestone's evidence is stable.
9. Scan the exact staged package for machine-local paths, account identifiers,
   attachment locators, secrets, targets, transcript content, and private
   manifests; require zero matches.
10. Verify portable links/commands plus the durable package
    manifest/index/verifier before publication.
11. Require a zero-P0/P1 pre-push source/local-evidence review of the exact
    candidate bytes.
12. After hosted execution, require a separate same-SHA post-hosted review;
    never promote the pre-push verdict to cover later hosted evidence.

## GitHub refresh commands

```bash
project_root="$(git rev-parse --show-toplevel)"
cd "$project_root"
repo_name="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
branch_name="$(git branch --show-current)"

git ls-remote origin refs/heads/main refs/heads/feat/youtube-item-recovery-enrichment

gh pr view 57 --repo "$repo_name" \
  --json number,title,state,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,url

gh pr checks 57 --repo "$repo_name"

gh run list --repo "$repo_name" \
  --branch "$branch_name" \
  --limit 12 \
  --json databaseId,headSha,status,conclusion,name,workflowName,url,createdAt,updatedAt
```

Run both `git ls-remote` and `gh pr view` every time the gate is evaluated;
cached values in this document are never sufficient. Use existing
authentication. Never ask the user to paste a token.

## Hosted gate after the next push

Only after an explicitly authorized push, for one exact commit require:

- Agent documentation success;
- native nominal success with expected count and accurate residual skips;
- crash/restart success with two real passing tests and zero skip;
- strict `verify` success;
- portable suite counts;
- no release package execution unless branch rules require it;
- exact job/run URLs/IDs;
- no unexpected artifact/content leakage; and
- PR body/tracker/risk/traceability updated to that exact result.

Then run a separate post-hosted adversarial evidence review binding the exact
commit, source hashes, workflow/run/job IDs, durable URLs, commands,
selected/pass/fail/skip counts, inspected logs, and both named required
crash/restart scenarios. Hosted absence, supersession, a different SHA, a
green wrapper around zero tests, missing logs, or any P0/P1 is NO-GO and
returns to the pre-push source/local-evidence review.

Do not call a pre-push review final, and do not merge or deploy based on green
CI alone.
