# Next Steps

## Immediate Pickup Sequence

1. Read `README_HANDOVER_INDEX.md`, then the other handover files in this folder.
2. Read the newest `RUNNING_LOG.md` entry and the tracker update.
3. Re-run:

```bash
BRAIN_RECALL_CONFIRM_LIVE_API=1 npm run -s recall:first-apply:status
```

4. If status is still `ready_for_first_capped_apply_approval`, ask Arun for the exact approval text below.
5. If proof has expired or readiness is no longer clean, run the guarded no-write refresh flow first and then re-check status.

## Exact Approval Required

Do not paraphrase this. First capped apply requires Arun to provide exactly:

```text
I approve the first capped Recall -> AI Brain apply for the 2026-06-16 window, capped at 5 planned imports, using the accepted live-spike proof, reviewed dry-run proof, backup proof, and explicit fidelity flags for unverified and metadata-only Recall content.
```

## First Capped Apply

Only after exact approval and fresh readiness:

1. Run the guarded first capped apply wrapper, not a lower-level raw apply path.
2. Confirm the apply remains capped at 5 planned imports.
3. Confirm fidelity flags explicitly cover unverified and metadata-only Recall content.
4. Write output only to the private ignored report path expected by the wrappers.
5. Do not advance checkpoint unless the wrapper and post-apply gates explicitly authorize it.

## Post-Apply Review

After first capped apply:

1. Validate `data/private/recall-live-spikes/first-apply-report.json` or the current wrapper-reported private apply report path.
2. Run the post-apply report checker.
3. Confirm no private Recall card IDs, titles, source URLs, chunks, raw response bodies, payloads, or database rows are printed in public output.
4. Confirm the report passes before deploy, scheduler, or checkpoint work.

## Production Deployment

After post-apply review passes:

1. Run the production deployment readiness checks.
2. Produce private production deploy evidence under `data/private/recall-live-spikes/`.
3. Validate deploy evidence with the project validator.
4. Keep scheduler disabled until deploy health is proven.

## Scheduler Enablement

After deploy evidence passes:

1. Use the scheduler enablement guardrails already in the project.
2. Produce private scheduler enablement evidence.
3. Validate repeated clean scheduler behavior.
4. Only then consider checkpoint advancement if the designed gate permits it.

## Decisions Needed From Arun

- Exact first capped apply approval text.
- Later approval for production deployment if the current release path requires an explicit operator decision.
- Later approval for scheduler enablement if the current release path requires an explicit operator decision.

## Risks To Watch

- Proof freshness may expire before approval.
- The user previously pasted a Recall API key in chat; never reuse or print it.
- The working tree is dirty with many untracked project artifacts. Do not revert or overwrite unrelated changes.
- Private Recall evidence must remain ignored, owner-only, and unpublished.
- A passing read-only live diagnostic is not write approval.

## Definition Of Done For Remaining Work

The whole goal is done only when:

- First capped apply completes with approved cap and fidelity flags.
- Post-apply report review passes.
- Production deploy completes and has validated private evidence.
- Scheduler enablement completes and has validated private evidence.
- Checkpoint behavior is correct and intentionally advanced only if authorized.
- Running log and tracker are updated.
- No known blockers or unresolved QA failures remain.
