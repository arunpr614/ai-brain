# AI Memory → NotebookLM one-click export design

Interactive design document for a proposed one-item export from AI Memory to one prebound consumer NotebookLM notebook.

## Open the artifact

Open `bundle.html` directly in a browser. It is a self-contained HTML file with inlined styles and JavaScript.

The four document views cover:

- the desktop and mobile item-page experience, including happy, blocked, authentication, ambiguous-write, and changed-content states;
- the preferred Chrome-extension connector setup and its immutable notebook binding;
- the remote-queue/local-credential architecture and the separate pinned-Python synthetic spike lane; and
- the payload contract, full state catalog, security invariants, accessibility requirements, open decisions, and release gates.

This is a source-grounded concept prototype. It makes no live Google request and does not claim official consumer NotebookLM API support or authorize production implementation.

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
