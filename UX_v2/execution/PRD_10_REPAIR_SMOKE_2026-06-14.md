# PRD-10 Limited Repair Smoke

Created: 2026-06-14 11:28 IST
Scope: PRD-10 add-text/transcript repair slice only
Environment: local dev server at `http://127.0.0.1:3000`

## Scope Verified

- Needs Upgrade entry links weak item to `/items/[id]/repair`.
- Repair route renders title override, repair type, and source text form.
- Repair transaction upgrades weak item to `user_provided_full_text`.
- Repaired item redirects/renders item detail with `repair=queued` success state.
- Repaired item leaves Needs Upgrade.
- Stale chunks/vectors are absent after repair.
- Old embedding job is absent so enrichment completion can recreate a fresh embedding job.

## Evidence

Temporary local item:

- ID: `0794978b143982543693dd95`
- Before repair: `capture_quality=metadata_only`, `extraction_warning=youtube_antibot_metadata_only`, listed in Needs Upgrade.
- After repair: `capture_quality=user_provided_full_text`, `extraction_warning=null`, `enrichment_state=pending`, not listed in Needs Upgrade.

Server-render checks:

- `GET /needs-upgrade` with local stub session cookie included the weak smoke item and `/items/0794978b143982543693dd95/repair`.
- `GET /items/0794978b143982543693dd95/repair` included `Repair source text` and a `name="text"` field.
- After repair, `GET /items/0794978b143982543693dd95?repair=queued` included `Source text updated` and `AI enrichment and semantic indexing are queued`.
- After repair, `GET /needs-upgrade` no longer included the smoke item title.

DB assertions after repair:

```json
{
  "quality": "user_provided_full_text",
  "warning": null,
  "enrichment": "pending",
  "chunks": 0,
  "vectors": 0,
  "embedJobs": 0,
  "inNeedsUpgrade": false
}
```

The temporary smoke item was deleted after verification.

## Browser Caveat

The in-app Browser bridge could navigate to the local app, but screenshot and later selector operations timed out with CDP errors:

- `Timed out running CDP command "Page.captureScreenshot" for tab 1`
- `Timed out running CDP command "Runtime.evaluate" for tab 1`

Because the browser bridge was unstable after screenshot timeout, PRD-10 visual evidence is limited to server-render assertions in this pass. PRD-11 baseline screenshots and PRD-06 banner screenshots remain available in `UX_v2/execution/evidence/screenshots/`.

## Release State

No production/live deploy was attempted. Android device validation remains blocked by no attached device/emulator.
