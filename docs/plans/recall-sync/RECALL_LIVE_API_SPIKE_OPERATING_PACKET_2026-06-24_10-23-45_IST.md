# Recall Live API Spike Operating Packet

Created: 2026-06-24 10:23 IST
Author: Codex
Status: Prepared; live execution blocked until Arun approves API-key handling and controlled sample cards
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Related implementation plan: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V2_2026-06-24_10-21-46_IST.md`
Approval checklist: `docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md`

## Purpose

This packet defines the safe operating procedure for live Recall API spikes:

- SPIKE-013 REST enumeration.
- SPIKE-014 content fidelity.

It does not contain API keys, private Recall titles, private source URLs, or full Recall content.

## Current Status

Live execution is blocked until Arun approves:

1. local API-key handling mechanism;
2. controlled sample-card set;
3. controlled sample-card manifest.

Public SPIKE reports are redacted-only. Keep every `allowTitleInPublicReport` and `allowSourceUrlInPublicReport` value false; the manifest validator rejects true values before live API work.

## Hard Rules

- Do not paste `RECALL_API_KEY` into chat.
- Do not write `RECALL_API_KEY` into tracked files.
- Do not commit live Recall payloads.
- Do not store full Recall card content in public reports.
- Do not include private source URLs in public reports.
- Do not run production apply or cron during live spikes.
- Run live probes in dry-run/read-only mode only.
- Proof and report files used for gates must be fresh and must not be future-dated.

## Approved Credential Options

### Option A - Temporary Shell Environment

Use only if Arun is present and can paste locally:

```text
set +o history
export RECALL_API_KEY='<paste locally; never in chat>'
set -o history
```

Cleanup:

```text
unset RECALL_API_KEY
```

### Option B - Ignored Local Env File

Preferred for repeated live probes:

```text
mkdir -p data/private/recall-live-spikes
chmod 700 data/private data/private/recall-live-spikes
```

Create the empty private template:

```text
npm run recall:env:init
```

The initializer runs the private ignore guard first, refuses paths outside `data/private/recall-live-spikes/`, writes `0600`, keeps `RECALL_API_KEY` empty, and keeps `BRAIN_RECALL_CONFIRM_LIVE_API=0`. The live-gate status command blocks readiness if this env file is not under `data/private/recall-live-spikes/`, not ignored/untracked, or later has group/other permissions.

Only after Arun approves local API-key handling, edit:

```text
data/private/recall-live-spikes/recall.env
```

Before use, verify ignored:

```text
git check-ignore -v data/private/recall-live-spikes/recall.env
```

If this is not ignored, stop and add/verify ignore rules before creating the file.

Cleanup:

```text
rm data/private/recall-live-spikes/recall.env
```

## Private Evidence Directory

Use:

```text
data/private/recall-live-spikes/
```

Before creating or writing any private Recall evidence, run:

```text
npm run check:recall-private-ignore
```

Expected:

```text
ok: true
```

Allowed private files:

- expected controlled sample card checklist;
- raw live API responses, if needed for debugging;
- unredacted local-only dry-run output;
- temporary notes with private titles/source URLs.

These files must remain untracked.

## Public Report Directory

Use:

```text
docs/plans/spikes/
```

Public reports must be redacted and dated:

- `SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md`
- `SPIKE-014-recall-content-fidelity-<timestamp>_IST.md`

Allowed public report fields:

- counts;
- redacted card labels;
- redacted/hashed card IDs;
- source type class;
- fidelity state;
- chunk count;
- cap/page/date-window verdicts;
- redacted errors;
- pass/fail verdict.

Not allowed in public reports by default:

- raw API key;
- bearer header;
- private full title;
- private full source URL;
- full chunk content;
- signed URL query strings;
- cookies;
- raw API payload.

The manifest-aware public report scan enforces manifest file safety by default: real live manifests must be under `data/private/recall-live-spikes/`, ignored, untracked, and owner-only. `--allow-unsafe-manifest-for-smoke` is only for synthetic temporary manifests in offline smoke fixtures and must not be used for real live reports, production dry-run proof, production apply proof, or scheduled proof.

## Offline Rehearsal Before Live Access

Before setting or sourcing `RECALL_API_KEY`, run the local rehearsal smoke:

```text
npm run smoke:recall-live-spikes
```

Expected:

```text
ok: true
manifest-driven SPIKE-013/SPIKE-014 runner
SPIKE-013 fixture-backed Markdown report -> CLEAR
SPIKE-014 fixture-backed Markdown report -> PROCEED-WITH-CHANGES
```

This proves the manifest-driven runner, report-generation path, and public-redaction path with synthetic fixtures. It does not replace the required live SPIKE-013/SPIKE-014 gates.

## Pre-Live Readiness Gate

Before creating private evidence or setting `RECALL_API_KEY`, run the offline readiness gate:

```text
npm run check:recall-prelive
```

When `--manifest` is omitted, the pre-live command does not enforce controlled sample validation. If the default private manifest exists, it emits a redacted `defaultManifest` status plus a `nextGate` that still requires the manifest-enforced command before live Recall API access.

The pre-live command also runs an output-redaction smoke and redacts child-command previews against private manifest values, Recall API-key-shaped strings, and bearer tokens before writing `stdoutPreview` or `stderrPreview` fields.

After the private controlled sample manifest is populated, run the stricter form:

```text
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

To see the current live-gate status and next command without printing secrets:

```text
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

This command reports only booleans, counts, gate state, and next commands. It does not call the live Recall API and does not print API keys, private titles, source URLs, chunks, or raw live payloads.
The command exits successfully as a status report, but its JSON `ok` field is true only when `readyForApprovedLiveSpikes` is true and status is `ready_for_approved_live_spikes`; not-ready statuses keep `ok: false`. Use `privateEvidenceOk` to read the private-ignore guard separately.
For automation that must fail closed, use the strict alias:

```text
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

It prints the same JSON and exits nonzero unless the ready state is reached.
If the private controlled sample manifest exists, it reports only file metadata and blocks live readiness unless the manifest is under `data/private/recall-live-spikes/`, ignored, untracked, and owner-only.
If the ignored local env file exists, it reports only file metadata and blocks live readiness unless the env file is under `data/private/recall-live-spikes/`, ignored/untracked, and permissions are owner-only.

The pre-live command performs the private-ignore check, validates the manifest when supplied, rehearses SPIKE-013/SPIKE-014 report generation with fixtures, scans public reports for obvious leaks, verifies scheduler artifacts remain disabled, builds the production Recall CLI bundle, and runs the packaged CLI smoke. It does not call the live Recall API and does not write production data.

## Controlled Sample Manifest

Before live access, create the private controlled sample manifest:

```text
data/private/recall-live-spikes/controlled-samples.json
```

Review the no-secret guide for choosing the six positive samples and outside-window negative control:

```text
npm run recall:controlled-samples:guide
```

Generate the template:

```text
npm run recall:controlled-samples:init
```

This writes the template to `data/private/recall-live-spikes/controlled-samples.json` only after the private ignore guard passes. It refuses to write outside `data/private/recall-live-spikes/` and writes the file as `0600`.
The validator and live-gate status command block readiness if an existing manifest is outside the ignored private path, is tracked, is not ignored, or has group/other permissions.

For stdout-only output:

```text
node scripts/check-recall-controlled-samples.mjs --template
```

Validate the completed private manifest:

```text
npm run check:recall-controlled-samples -- data/private/recall-live-spikes/controlled-samples.json
```

Expected:

```text
ok: true
sampleCount: 6
```

The validator rejects unchanged template placeholders, duplicate card IDs, missing required samples, source URL mistakes, samples outside the SPIKE-013 date window, and a negative control inside the date window.
It also rejects any sample that asks to expose private titles or source URLs in public reports; the combined live SPIKE workflow is redacted-only.

## Preferred Live Spike Runner

If the private env file does not exist yet, run `npm run recall:env:init`, then edit it locally after approval.

After `RECALL_API_KEY` is available locally and the controlled sample manifest validates, run both live gates with one command:

```text
source data/private/recall-live-spikes/recall.env
npm run recall:live-spikes -- \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --report-dir docs/plans/spikes \
  --confirm-live-api
```

For approved live runs, keep `--report-dir` under `docs/plans/spikes`. Fixture rehearsals may use temporary report directories, but the runner refuses live report directories outside the public SPIKE report path.

The runner:

- verifies `data/private/recall-live-spikes/` is ignored and untracked;
- validates the manifest before API access;
- runs SPIKE-013 with the manifest date window, six positive card IDs, private title checks, and negative control;
- runs SPIKE-014 with the same six sample card IDs and `max_chunks=50`;
- writes dated public Markdown reports under `docs/plans/spikes/`;
- runs `check:recall-public-privacy` against the generated reports;
- exits before live API calls if `RECALL_API_KEY` is missing.
- exits before live API calls unless `--confirm-live-api` or `BRAIN_RECALL_CONFIRM_LIVE_API=1` is set after approval.

After the reports are generated, run the post-live report gate before any production dry-run:

```text
npm run check:recall-live-spike-reports -- \
  --enumeration docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  --fidelity docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md \
  --manifest data/private/recall-live-spikes/controlled-samples.json
```

If SPIKE-014 is `PROCEED-WITH-CHANGES`, add `--allow-fidelity-changes` and `--accepted-fidelity-risk` only after reviewing the policy-blocked fidelity classes.

Proof and report files used for gates must be fresh and must not be future-dated. If a live-spike report, dry-run report, or backup proof has a future timestamp beyond the allowed clock-skew window, stop and regenerate the proof instead of applying.

Use the direct commands below only for one-off debugging or if the combined runner fails and needs a narrower rerun.

## Controlled Sample Cards

Create or identify at least six Recall cards:

| Sample | Required characteristic | Public label |
|---|---|---|
| Short note | User-created Recall note with unique sentinel | `sample-note` |
| Article | Web article/card with source URL | `sample-article` |
| YouTube/video | Video card with expected transcript/chunks if Recall supports it | `sample-youtube` |
| PDF | PDF card | `sample-pdf` |
| No source URL | Recall note/card with no source URL | `sample-no-url` |
| Long/truncation candidate | Card likely to hit `max_chunks=50` | `sample-long` |

Private manifest should include:

- expected title;
- creation time;
- source URL if any;
- sample label;
- expected rough content type;
- public report booleans, which must remain false.

Public reports should use only sample labels and redacted evidence.

## SPIKE-013 Command Shape

No-key guard:

```text
node --import tsx scripts/spikes/recall-rest-enumeration.ts
```

Expected without key:

```text
RECALL_API_KEY is not set. Export it locally before running this live Recall API spike.
```

Offline fixture rehearsal:

```text
node --import tsx scripts/spikes/recall-rest-enumeration.ts \
  --fixture data/private/recall-live-spikes/synthetic-list-fixture.json \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --write-report \
  --report-path docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md
```

Live dry-run example:

```text
source data/private/recall-live-spikes/recall.env
node --import tsx scripts/spikes/recall-rest-enumeration.ts \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --write-report \
  --report-path docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md
```

The manifest supplies `date_from`, `date_to`, all six positive card IDs, the outside-window negative card ID, and private title checks. Use explicit `--date-from`, `--date-to`, `--expect-id`, or `--negative-id` only for an intentional one-off override and document why in the report.

Do not add `--allow-titles` or `--allow-source-urls` for the combined live workflow; public reports are redacted-only.

SPIKE-013 must report:

- request window;
- returned count;
- `total_count`, if API provides it;
- whether returned count equals `total_count`;
- whether all controlled sample labels were discovered;
- whether a wider window suggests hidden cap/pagination risk;
- whether any response shape was unexpected.

Pass only if:

- 100% controlled sample labels are discovered;
- no unexplained result cap;
- no unexplained date-window miss;
- no unredacted private content in public report.

## SPIKE-014 Command Shape

No-key guard:

```text
node --import tsx scripts/spikes/recall-content-fidelity.ts --card-id fake-card-id
```

Expected without key:

```text
RECALL_API_KEY is not set. Use --fixture for offline fidelity checks.
```

Offline fixture rehearsal:

```text
node --import tsx scripts/spikes/recall-content-fidelity.ts \
  --fixture data/private/recall-live-spikes/synthetic-card-detail-fixture.json \
  --max-chunks 50 \
  --write-report \
  --report-path docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md
```

Live content-fidelity example:

```text
source data/private/recall-live-spikes/recall.env
node --import tsx scripts/spikes/recall-content-fidelity.ts \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --max-chunks 50 \
  --write-report \
  --report-path docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md
```

The manifest supplies the six live card IDs and adds public sample labels to the redacted output. Use explicit `--card-id` only for an intentional extra probe and document why in the report.

Do not add `--allow-titles` or `--allow-source-urls` for the combined live workflow; public reports are redacted-only.

SPIKE-014 must report for each sample label:

- source class;
- chunk count;
- whether exactly 50 chunks were returned;
- whether source/page/timestamp metadata appeared;
- inferred fidelity state;
- V1 import policy;
- Ask/Search policy;
- blocked reason, if blocked.

Default policy:

- `metadata_only` -> block by default.
- `blocked_unknown` -> block.
- `possibly_truncated` -> block by default unless Arun explicitly approves import with retrieval gate.
- `api_chunks_unverified` -> import only after live review; retrieval-gated until warning UI exists.

## Secret And Privacy Checks

Before live API access:

```text
npm run check:recall-private-ignore
npm run check:recall-controlled-samples -- data/private/recall-live-spikes/controlled-samples.json
```

Before sharing reports:

```text
npm run check:recall-public-privacy -- --require-files
npm run check:recall-public-docs-privacy
npm run check:recall-public-manifest-privacy -- \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md
```

Expected:

```text
ok: true
```

The first scan checks the public SPIKE-013/SPIKE-014 Markdown report names under `docs/plans/spikes/` for obvious Recall API keys, bearer tokens, `sk_*` secrets, cookies, and signed/tokenized URL query values. Use `--require-files` once reports should exist so a zero-file scan fails closed. The current public approval/runbook docs privacy scan checks the checklist, handoff, operating packet, production runbook, audit, tracker, current option docs, and privacy evidence docs for obvious secret leaks. The second scan checks the generated reports against the private controlled sample manifest for exact and normalized card IDs, expected titles, source URLs, source URL paths, and negative-control private values without printing those private values.

Private files under `data/private/recall-live-spikes/` may contain controlled evidence only if they remain ignored and are not copied into public reports.

Before committing:

```text
git status --short
npm run check:recall-private-ignore
```

Stop if any private file appears as tracked or untracked in a way that could be staged accidentally.

## Cleanup

After live spikes:

```text
unset RECALL_API_KEY
```

If using env file:

```text
rm data/private/recall-live-spikes/recall.env
```

Retain private expected-card evidence only if needed for follow-up and only under ignored `data/private/recall-live-spikes/`.

## Go / No-Go

Go for SPIKE-013/SPIKE-014 only after Arun approves:

- API-key handling option;
- sample-card labels/classes;
- private evidence ignore check;
- private controlled sample manifest validation;
- redacted-only public report policy.

No-go if:

- API key would be pasted into chat;
- private evidence path is not ignored;
- private controlled sample manifest exists outside the ignored private path, is tracked, or has group/other permissions;
- private env file exists outside the ignored private path or is tracked;
- public reports would need full private titles/source URLs;
- the probe would mutate AI Brain or Recall;
- production apply or cron is requested before gates pass.
