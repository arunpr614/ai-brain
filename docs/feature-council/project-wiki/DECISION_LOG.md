# Definitive Wiki Decision Log

## 2026-07-11 — Canonical worktree

Use a clean worktree at current remote main on `docs/definitive-project-wiki`. Preserve the administrative clone's five modified scripts and all unrelated research worktrees.

## 2026-07-11 — Dual baseline convention

Use `23868faf…` for current code/document inspection and `6858529…` as the latest dated, verified deployed application tree. Later commits contain release/documentation closeout only. Feature runtime evidence may still be narrower than the whole deployed tree.

## 2026-07-11 — Status taxonomy

Adopt the requested definitive statuses. Preserve code/runtime evidence as separate fields rather than embedding it in labels such as Shipped or Main. Feature-flagged is an implementation status modifier, not automatic runtime proof.

## 2026-07-11 — Preserve historical research

Keep Feature Council history and pinned links, but move the living entrypoint to Ideas and Exploration with explicit current implementation deltas. Do not present v2 proposals as delivered features.

## 2026-07-11 — Publication safety

Do not publish raw databases, private evidence, identifiers, owner-specific hostnames, absolute paths, real credentials/configuration, raw device logs, or executable production-write instructions. Summarize only behavior necessary to understand the product.

## 2026-07-11 — Wiki history

Clone the separate `.wiki.git` repository at `3d578c3…`, update by normal non-force commit, re-fetch immediately before push, and verify through a fresh clone/live pages after publication.
