# Web Experience Revamp Observability Checklist

**Created:** 2026-06-15 21:48:07 IST
**Status:** Phase 1 gate artifact.

## Local Observability

| Check | Required result | Evidence |
|---|---|---|
| Browser console | No new uncaught errors on critical routes | Console logs in visual evidence folder |
| Browser network | No failed critical requests | Network logs in visual evidence folder |
| `/api/health` | 200 with valid bearer or expected 401 without auth | Redacted command/result |
| Capture APIs | Local mutation smoke succeeds/fails truthfully | QA report |
| Ask API | Local Ask smoke handles success/error/no context | QA report |
| Pairing APIs | Code create/exchange/invalid/expired states verified | Android/web pairing evidence |
| Public assets | `/offline.html`, `/ai-memory-logo.png`, manifest, icons load | Asset smoke output |

## Production Observability

After deploy, record:

```bash
ssh brain "sudo systemctl status brain --no-pager"
ssh brain "sudo systemctl show brain -p NRestarts --no-pager"
ssh brain "sudo journalctl -u brain --since '-15 minutes' --no-pager | tail -200"
```

Live HTTP/API checks:

- Public `/unlock` returns 200.
- Public `/setup-apk` returns 200.
- Public `/offline.html` returns 200.
- Public `/ai-memory-logo.png` returns 200 image.
- Public `/manifest.webmanifest` returns 200 JSON/manifest.
- Authenticated `/api/health` returns 200.
- Protected HTML route without cookie redirects to `/unlock`.
- Authenticated critical routes render.
- Provider checks pass through deploy script or are explicitly warn-only with rationale.
- Telegram webhook unauthenticated reachability returns expected 401.

## Release Packet Requirements

- Service active status.
- Restart count.
- Server log summary with no new release-blocking errors.
- Browser console/network summary.
- Provider/export/storage/pairing API status.
- Any warnings classified as P0/P1/P2/P3 with owner.
