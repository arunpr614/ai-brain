# NotebookLM URL-source production release evidence — 2026-07-23

This record is intentionally content-free. It documents the production release and provider-level canary without publishing the selected item, source URL, notebook route, account route, provider identifiers, pairing material, or private host details.

## Release identity

- Protected-main production release: `8314d39fd11cf82e612de44e6ac0fa0cf1633719`
- URL-source implementation commit: `4f95a4689adb7b1cbe682faea2c5e25dc737177f`
- Repository review: [PR #55](https://github.com/arunpr614/ai-brain/pull/55)
- Database migration: `027_notebooklm_url_sources.sql`, applied with its expected hash
- Chrome extension: 0.7.4, reloaded from the existing stable unpacked-extension path
- Extension artifact SHA-256: `b689624508768cf5724b933fd77662d3bb8ea57be62ec8ff8be19c5f93235166`
- Connector protocol: v2, upgraded in place from the existing paired credential
- Runtime controls after deployment: master enabled, queue enabled, provider writes enabled (`1:1:1`)

## Production checks

- The immutable application release became active and authenticated health returned success.
- Migration 027 and its expected release hash were present.
- The NotebookLM operations and retention checks were healthy.
- The fixed owner-only private target remained bound and healthy.
- The existing extension credential and connector record upgraded to protocol v2 after one extension reload. Removal, fresh installation, and re-pairing were not required.

## Provider-level URL-source canary

One owner-selected, previously unexported public YouTube item was exported after the extension reload.

Content-free server and connector evidence showed:

- request payload kind `url`;
- one provider dispatch attempt;
- create accepted;
- terminal request state `succeeded`;
- terminal provider status `ready`;
- the bound notebook source count increased by one; and
- no copied-text fallback path was used.

This establishes production URL/YouTube-source delivery at the provider protocol and reconciled-state boundary. A paired-profile screenshot of the rendered NotebookLM source icon was not retained, so this record does not claim independent visual-icon evidence.

## Current boundary

The integration remains experimental, one-item-at-a-time, owner-operated, and limited to one fixed private notebook. URL-bearing items use their safe saved HTTP(S) URL as the NotebookLM source. Copied text is reserved for true notes that have no source URL. Broad synchronization, scheduled export, automatic updates, remote deletion, and multi-notebook routing remain out of scope.
