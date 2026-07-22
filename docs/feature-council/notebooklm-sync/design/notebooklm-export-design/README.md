# AI Memory → NotebookLM one-click export design

Interactive, code-aligned handoff for the implemented-candidate one-item export from AI Memory to one prebound consumer NotebookLM notebook.

## Open the artifact

Open `bundle.html` directly in a browser. It is a self-contained HTML file with inlined styles and JavaScript.

The four document views cover:

- the desktop and mobile item-page experience, including happy, blocked, authentication, ambiguous-write, and changed-content states;
- the Chrome-extension connector setup using one exact pasted notebook URL and an immutable private binding;
- the remote-queue/local-session architecture and actual browser/connector API routes; and
- the resolved V1 payload, capacity, retention, state, accessibility, and release-gate contracts.

The artifact distinguishes `https://notebooklm.google/` (public sign-in) from `https://notebooklm.google.com/` (authenticated app and optional host permission). It makes no live Google request. It is an implemented-candidate handoff, not proof of production deployment, a successful signed-in canary, or official consumer NotebookLM API support.

The authoritative product policy remains `../../product/ONE_CLICK_EXPORT_DELIVERY_CONTRACT_2026-07-21.md`; implementation contracts live in the repository source and migration 026. This artifact is a visual companion and must be regenerated whenever its source changes.

## Develop

```sh
pnpm install
pnpm dev
```

## Validate and bundle

```sh
pnpm lint
pnpm build
node node_modules/.pnpm/html-inline@1.2.0/node_modules/html-inline/bin/cmd.js \
  -i dist/index.html \
  -o bundle.html \
  -b dist
```
