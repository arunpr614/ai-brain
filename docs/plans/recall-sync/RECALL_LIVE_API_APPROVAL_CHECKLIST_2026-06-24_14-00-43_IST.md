# Recall Live API Approval Checklist

Created: 2026-06-24 14:00 IST
Status: Ready for Arun review; no live Recall API call made
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Purpose

This is the no-secret handoff checklist for the first live SPIKE-013/SPIKE-014 run.

It does not contain API keys, private Recall titles, private source URLs, card IDs, or card content. Fill private values only under `data/private/recall-live-spikes/` after approval.

## Approval Decisions

Arun must explicitly approve all of these before the live run:

- [ ] API-key handling method: temporary shell env or ignored local env file.
- [ ] Controlled sample cards exist in Recall for note, article, YouTube/video, PDF, no-source, and long/truncation candidate coverage.
- [ ] Private controlled sample manifest is populated locally and validates.
- [ ] `data/private/recall-live-spikes/controlled-samples.json` is ignored, untracked, and owner-only (`0600`).
- [ ] Public SPIKE reports remain redacted-only.
- [ ] Proof and report files used for gates must be fresh and must not be future-dated.
- [ ] If using `data/private/recall-live-spikes/recall.env`, the file is under `data/private/recall-live-spikes/`, ignored, untracked, and owner-only (`0600`).
- [ ] Live command may run with `--confirm-live-api`.

## Safe Setup Commands

Run before any private values are created:

```text
npm run check:recall-private-ignore
npm run check:recall-prelive
```

If `npm run check:recall-prelive` is run without `--manifest`, read its `defaultManifest` block and `nextGate`. A passing no-manifest run does not approve live API access; when the default private manifest exists, the command reports its redacted status and still requires the manifest-enforced command below before live work.

The pre-live gate also redacts child-command `stdoutPreview` and `stderrPreview` fields against private controlled-sample manifest values, Recall API-key-shaped strings, and bearer tokens.

Review the no-secret controlled sample setup guide:

```text
npm run recall:controlled-samples:guide
```

Create the private controlled sample manifest template:

```text
npm run recall:controlled-samples:init
```

For the ignored local env-file option, create the empty private env template:

```text
npm run recall:env:init
```

Then edit these files locally only after approval:

```text
data/private/recall-live-spikes/controlled-samples.json
data/private/recall-live-spikes/recall.env
```

Keep every public report boolean false:

```text
allowTitleInPublicReport: false
allowSourceUrlInPublicReport: false
```

## Readiness Checks

After the private manifest is populated:

```text
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json --env-file data/private/recall-live-spikes/recall.env
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json --env-file data/private/recall-live-spikes/recall.env
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Expected before live execution:

- private ignore check passes;
- controlled sample manifest validates;
- if `check:recall-prelive` was run without `--manifest`, `defaultManifest.validationEnforced` is false and the command must be rerun with `--manifest` before live API access;
- child-command `stdoutPreview` and `stderrPreview` fields do not expose private controlled-sample manifest values, Recall API-key-shaped strings, or bearer tokens;
- controlled sample manifest file is ignored, untracked, and has secure owner-only permissions;
- public report exposure requests are rejected by the smoke gate;
- ignored local env file, if used, is under `data/private/recall-live-spikes/`, ignored, untracked, and has secure owner-only permissions;
- no API key value is printed;
- pre-live readiness returns `ok: true`;
- live gate status is either `needs_api_key_approval`, `needs_env_key_or_approval`, `needs_live_api_confirmation`, or `ready_for_approved_live_spikes`.
- `recall:live-gate:status` JSON `ok` is true only when `readyForApprovedLiveSpikes` is true and status is `ready_for_approved_live_spikes`; blocked or not-ready states keep `ok: false` while `privateEvidenceOk` reports the private-ignore guard separately.
- `recall:live-gate:require-ready` prints the same JSON and exits nonzero unless the status is `ready_for_approved_live_spikes`.

## Approved Live Command

Run only after the checklist decisions above are approved:

```text
npm run recall:live-spikes -- \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --env-file data/private/recall-live-spikes/recall.env \
  --report-dir docs/plans/spikes \
  --confirm-live-api
```

Approved live reports must be written under `docs/plans/spikes`; the runner refuses live report directories outside that public SPIKE report path.

## Stop Conditions

Stop before any live API call if:

- the API key would be pasted into chat;
- `data/private/recall-live-spikes/` is not ignored;
- `data/private/recall-live-spikes/controlled-samples.json` exists outside the ignored private path, is tracked, or has group/other permissions;
- the manifest validator reports any finding;
- public report booleans are set to true;
- pre-live readiness fails;
- `data/private/recall-live-spikes/recall.env` exists outside the ignored private path or is tracked;
- `data/private/recall-live-spikes/recall.env` exists with group/other permissions;
- any proof or report file used for a gate is stale or future-dated;
- live reports would be written outside `docs/plans/spikes`;
- the live command would run without `--confirm-live-api` or `BRAIN_RECALL_CONFIRM_LIVE_API=1`;
- the task has drifted into production dry-run, apply, deploy, or scheduler enablement.

## Expected Outputs

The live run should produce redacted public reports:

```text
docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md
docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md
```

Before sharing or committing the reports:

```text
npm run check:recall-public-privacy -- --require-files
npm run check:recall-public-docs-privacy
npm run check:recall-public-manifest-privacy -- \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md
```

Before any production-capable dry-run, validate the generated live spike reports:

```text
npm run check:recall-live-spike-reports -- \
  --enumeration docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  --fidelity docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md \
  --manifest data/private/recall-live-spikes/controlled-samples.json
```

If SPIKE-014 is `PROCEED-WITH-CHANGES`, use the acceptance flags only after reviewing and accepting the fidelity risk:

```text
npm run check:recall-live-spike-reports -- \
  --enumeration docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  --fidelity docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --allow-fidelity-changes \
  --accepted-fidelity-risk "Reviewed policy-blocked fidelity classes; production dry-run remains no-write."
```

Production dry-run, apply, deploy, and scheduler enablement remain blocked until both live spike reports pass this gate. Use `--require-files` once reports should exist so a zero-file privacy scan fails closed instead of producing a status-only success. The current public approval/runbook docs privacy scan checks the checklist, handoff, operating packet, production runbook, audit, tracker, current option docs, and privacy evidence docs for obvious secret leaks. The manifest-aware scan checks exact and normalized private controlled-sample values, including case, whitespace, HTML-entity, and percent-encoding variants, without printing private values.

The manifest-aware scan also enforces manifest file safety by default: the manifest must be under `data/private/recall-live-spikes/`, ignored, untracked, and owner-only. `--allow-unsafe-manifest-for-smoke` is only for synthetic temporary manifests in offline smoke fixtures and must not be used for real live reports, production dry-run proof, production apply proof, or scheduled proof.
