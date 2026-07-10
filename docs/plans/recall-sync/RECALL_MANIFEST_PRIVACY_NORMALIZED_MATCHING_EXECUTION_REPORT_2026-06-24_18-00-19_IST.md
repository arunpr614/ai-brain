# Recall Manifest Privacy Normalized Matching Execution Report

Created: 2026-06-24 18:00 IST
Owner: Codex
Status: Done for offline scope; live reports still pending approved Recall API run

## Purpose

Close the remaining exact-match-only gap in the manifest-aware public report privacy scan. Public SPIKE reports should fail if they contain private controlled-sample values even when a title or URL is transformed through casing, whitespace normalization, HTML entities, or percent-encoding/decoding.

## Change

- Updated `scripts/check-recall-public-manifest-privacy.mjs` to keep exact matching and add normalized matching.
- Normalized matching now covers:
  - Unicode NFKC normalization;
  - whitespace collapse;
  - case-insensitive comparison;
  - basic HTML entities such as `&amp;`;
  - percent-encoded URL variants.
- Findings now include `match: "exact"` or `match: "normalized"` while still avoiding the private value itself.
- Added `scripts/smoke-recall-public-manifest-privacy.mjs`.
- Added `smoke:recall-public-manifest-privacy` and included it in `npm run check:recall-prelive`.

## Validation

Passed:

```text
node --check scripts/check-recall-public-manifest-privacy.mjs
node --check scripts/smoke-recall-public-manifest-privacy.mjs
npm run smoke:recall-public-manifest-privacy
npm run smoke:recall-live-spike-reports
npm run check:recall-approval-packet
npm run check:recall-prelive
```

The smoke proves:

- safe redacted public report passes;
- exact private expected-title leak fails without printing the private title;
- normalized private title leak fails;
- normalized private source URL leak fails across percent-decoding and HTML entity decoding without printing the private URL.

`npm run check:recall-prelive` now includes `public_manifest_privacy_scan_smoke` and passed in non-enforcing mode. It still reports the default private controlled-sample manifest as placeholder-invalid and keeps the manifest-enforced command as the next live gate.

No live Recall API call was made. No production dry-run, production apply, deploy, or scheduler enablement was performed.

## Remaining Gate

This hardens only the public report privacy guard. Real SPIKE-013/SPIKE-014 reports still require approved live Recall API execution, followed by strict public privacy scan, normalized manifest-aware privacy scan, and live-spike report acceptance before any production-capable dry-run.
