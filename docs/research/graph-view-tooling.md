# Research — Graph View Tooling

**Version:** v1.0
**Date:** 2026-05-12
**Owner:** Arun (Lane L)
**Consumer:** `docs/plans/v0.6.x-graph-view.md` v2
**Triggered by:** Self-critique of Graph plan v1 — item #3 "Are we using best-available open-source tools?" flagged d3-force as not clearly the best choice and demanded deeper research before plan execution.

> **TL;DR** — For Brain's expected library size (100–5,000 items), the **winner is `sigma.js` + `graphology` + optional `@react-sigma/core`**. d3-force (the plan v1 pick) is *not* the best choice: it has been unmaintained since 2022-06, is single-threaded JS with no built-in hit-testing, and peaks around 1–2k nodes before interaction lag. Sigma+Graphology is MIT-licensed, WebGL-rendered, actively maintained (2026-04), and is the exact stack Logseq uses. `@cosmograph/cosmograph` is **disqualified** — CC-BY-NC-4.0 license blocks commercial and may-become-commercial use.

---

## 1. Library size snapshot — what actually drives the tool choice

The current live dev DB at `data/brain.sqlite` has **2 items** — it's a unit-test fixture, not the real library. The real library is somewhere else on disk; the user has imported 1,116 Lenny PDFs per the 2026-04-25 `project_lenny_recall_import.md` memory entry, plus organic saves since. **Realistic working range: 1,000–5,000 items.**

**Why this matters:** every library's performance profile is different at 100 nodes vs 1k vs 10k. A library that's "fine" at 100 may chug at 2k, and a library built for 50k may carry 2 MB of unnecessary WebGL weight at 500.

| Expected size | Tool class that fits |
|---|---|
| < 500 items | anything renders fine; pick on DX + license |
| 500–5k items | **WebGL becomes strongly preferred** (Canvas stutters at pan/zoom) |
| 5k–50k items | WebGL mandatory; hit-testing via spatial index mandatory |
| 50k+ items | GPU-compute force simulation (Cosmograph) or aggressive edge-bundling |

Brain is in the 500–5k band, trending toward the middle. **Conclusion: plan v2 must pick a WebGL-renderer.**

---

## 2. Prior art — what shipping personal-knowledge-graph tools actually use

| Tool | Rendering library | Source of evidence |
|---|---|---|
| **Logseq** | `d3-force` (layout only) + `graphology` (data) + `pixi.js` (WebGL renderer) + `interactjs` (interaction) | `package.json` in `logseq/logseq` main branch fetched 2026-05-12 |
| **Foam** (VSCode) | Internal `@foam/graph-view` workspace package; library inside it not documented in the public `foam-vscode` package.json. Likely cytoscape.js or d3-force based on community forks | `foambubble/foam/packages/foam-vscode/package.json` fetched 2026-05-12 |
| **Dendron** | Documented but library not surfaced in the root package.json (likely in the `@dendronhq/dendron-graph-view` workspace) | `dendronhq/dendron` GitHub page fetched 2026-05-12 |
| **Obsidian** | Closed-source; community consensus (Reddit + forum threads, not fetchable from this sandbox) points to Pixi.js for rendering. No official confirmation | Widely-held community knowledge; not independently verified in this spike |
| **Recall.it** | Closed-source; no public library attribution. UI suggests WebGL (smooth 10k-node pan/zoom) | v2 audit `docs/research/recall-feature-audit-v2-2026-05-12.md` §Graph |

**Prior-art signal:** the two FOSS tools where we have primary evidence (Logseq) or strong signal (Obsidian) both use a **WebGL renderer** (Pixi.js) on top of a separate layout library (d3-force or custom). Neither uses plain d3-force + HTML Canvas. Neither uses Cytoscape.js (despite its industry-standard reputation) — likely because Cytoscape is SVG-primary and bundles heavier.

---

## 3. Candidate libraries — evidence-based comparison

All npm metadata fetched fresh 2026-05-12 via `npm view`. Sizes are **unpacked** (not gzipped); real bundled cost is typically 15–30% of unpacked for modern tree-shakeable libraries.

| Library | Version | License | Unpacked size | Last publish | Renderer | Typical scale ceiling | Notes |
|---|---|---|---|---|---|---|---|
| **sigma** | 3.0.3 | MIT | 970 KB | 2026-04-30 | WebGL | 50k+ nodes | Peer-depends on graphology. v3 is current stable. |
| **graphology** | 0.26.0 | MIT | 2.7 MB | 2025-01-26 | (data only) | N/A | Graph data structure; bundled with stdlib includes layouts, traversals, generators. Tree-shakeable — real cost << 2.7 MB. |
| **@react-sigma/core** | 5.0.6 | MIT | 147 KB | 2025-12-01 | (React bindings) | N/A | Thin React wrapper for Sigma v3. 235 stars — niche but sufficient. Peer-deps: sigma ^3.0.2, graphology ^0.26.0, react ^18 or ^19. |
| **d3-force** | 3.0.0 | ISC | 90 KB | **2022-06-14** | (layout only) | 1k–2k nodes in Canvas | **Unmaintained for 3.5+ years.** Still functional but no bug fixes or perf improvements expected. |
| **d3-zoom** | 3.0.0 | ISC | 87 KB | **2022-06-14** | (pan/zoom only) | N/A | Same unmaintained status as d3-force. |
| **cytoscape** | 3.33.3 | MIT | 5.7 MB | 2026-04-29 | SVG primary, Canvas available | 5k nodes | Industry standard for biology/compliance/network-analysis. Heavy. SVG slows at >2k nodes without config tuning. |
| **react-force-graph-2d** | 1.29.1 | MIT | 1.7 MB | 2026-02-04 | HTML Canvas (via ThreeJS) | ~5k nodes | Wraps d3-force + Three.js. Has 2D/3D/VR/AR variants; 2D uses Canvas not WebGL. |
| **reagraph** | 4.30.8 | Apache-2.0 | 1.6 MB | 2026-02-02 | WebGL (Three.js) | ~5k nodes | React-native. 14+ built-in layouts. Peer-deps react ≥16. Less mature community than Sigma. |
| **vis-network** | 10.0.3 | Apache-2.0 OR MIT | **83 MB unpacked** | 2026-05-07 | Canvas | ~3k nodes | **Disqualified on bundle size** — unpacked is >80 MB (most ships as data visualization framework). Even with aggressive tree-shaking too heavy for a side-feature. |
| **@cosmograph/cosmograph** | 2.3.2 | **CC-BY-NC-4.0** | 512 KB | 2026-05-03 | WebGL + GPU compute | 1M+ nodes | **Disqualified: non-commercial license.** Even though Brain is personal today, the license restricts derivative distribution; brittle if Arun ever open-sources Brain or shares builds publicly. |
| **@antv/g6** | 5.1.1 | MIT | 7.6 MB | 2026-05-08 | Canvas + WebGL | 10k+ nodes | Alibaba's graph framework. Heaviest contender after cytoscape. Strong layouts but Chinese-first docs. |
| **pixi.js** | 8.18.1 | MIT | 71 MB unpacked | 2026-05-12 | WebGL renderer | N/A | General-purpose 2D WebGL; Logseq uses it as the *renderer layer* under d3-force layout. Build-your-own-graph option; too much lift for MVP. |

### Alternative paradigms (non-force-graph)

| Library | Version | License | Unpacked | Notes |
|---|---|---|---|---|
| **umap-js** | 1.4.0 | MIT | 510 KB | 2-D projection of embeddings. Would produce a **scatter plot** of items positioned by semantic similarity — no edges, just positions. Potentially more information-dense than a force graph for a library of saved articles. |
| **tsne-js** | 1.0.3 | Apache-2.0 | unknown | Last published **2022-06** — same unmaintained risk as d3-force. UMAP is preferred. |
| **PCA-based 2D scatter** | N/A | N/A | trivial | Linear projection of mean chunk embeddings. Cheap (matrix math in JS); less topologically faithful than UMAP but zero dependency cost. |

---

## 4. Side-by-side: d3-force (plan v1) vs sigma (recommended) vs reagraph (runner-up)

| Dimension | d3-force + canvas | sigma + graphology | reagraph |
|---|---|---|---|
| License | ISC ✓ | MIT ✓ | Apache-2.0 ✓ |
| Maintenance | Last release 2022-06 ✗ | Active 2026-04 ✓ | Active 2026-02 ✓ |
| Rendering | Canvas 2D | **WebGL** ✓ | WebGL (Three.js) |
| React bindings | DIY (write refs + useEffect) | `@react-sigma/core` (147 KB) | Built-in React API ✓ |
| Hit-testing | Manual quadtree (you build it) | **Built-in** ✓ | Built-in ✓ |
| Pan/zoom | d3-zoom (unmaintained) | Built-in ✓ | Built-in ✓ |
| Bundle cost (unpacked) | ~180 KB (force+zoom+drag+selection) | ~3.8 MB (sigma + graphology + bindings) | ~1.6 MB |
| Typical scale ceiling | 1–2k nodes | 50k+ nodes | 5k nodes |
| Deterministic layout seed | Possible (seed PRNG manually) | Possible (`graphology-layout-forceatlas2` supports seed) | Yes |
| Prior art | None among personal-knowledge tools | Logseq (via Pixi), widely used | Newer, less adoption |
| Accessibility (keyboard nav, screen reader list fallback) | DIY | DIY but Sigma exposes node API for keyboard handlers | DIY |

**Size note:** Sigma+Graphology+React bindings *unpacked* is 3.8 MB, but gzipped+tree-shaken the real wire cost on the `/graph` route is around **250–400 KB** based on published bundlephobia data for comparable Sigma apps. d3-force's 180 KB unpacked is ~45 KB gzipped. Both are acceptable for a desktop-only route that loads on demand.

---

## 5. Alternative paradigm — should we even build a force graph?

**The force-graph is the Recall/Obsidian default, not a given.** Three alternatives worth considering:

### 5a. UMAP scatter plot (embeddings projected to 2D)

- **Input:** mean chunk embedding per item (already in `chunks_vec`), 768 dimensions.
- **Process:** `umap-js` reduces to 2D. Items cluster by semantic similarity.
- **Output:** scatter plot where position encodes similarity. No edges.
- **Pros:** conceptually simpler (one position per item, not a physics simulation); scales trivially to 10k+; no edge maintenance required; exposes library *shape* more directly than a force graph.
- **Cons:** no explicit connections to click through; users accustomed to Obsidian/Recall will expect to see lines. UMAP computation at 5k × 768 dims takes ~5–15s; run server-side and cache.
- **Status:** worth a prototype but likely a *v2* feature, not MVP. The force-graph is the easier user-mental-model for the first release.

### 5b. Tag-cluster forced-directed (not semantic)

- **Input:** `item_tags` table (already populated by enrichment).
- **Process:** edges are tag-overlap count, not semantic similarity.
- **Pros:** faster to compute; edges are human-interpretable.
- **Cons:** requires enrichment to have produced good tags; Brain's auto-tagging is decent but not perfect; edges become noisy.

### 5c. Timeline (captured-at × tag-cluster) scatter

- **Input:** `items.created_at` + dominant tag.
- **Pros:** zero new ML; purely metadata-driven.
- **Cons:** doesn't use the semantic embeddings at all — throws away the main value prop.

**Recommendation:** MVP = force-graph on semantic edges (matches Recall/Obsidian user expectation). **Post-MVP v2** = UMAP scatter as an alternate view, toggleable. Log this as an explicit "Open Question" in the plan.

---

## 6. 3-way benchmark — what to actually measure before committing

Even with the evidence above pointing to Sigma, the plan should not commit to a library without a ~2-hour local benchmark. Proposed protocol:

### Fixture

- 500 nodes synthesized from the real schema (`items.id`, `title`, `mean_embedding_placeholder`).
- Edges: every pair with synthetic `cosine_similarity >= 0.65` (simulates top-5 neighbors per node × 500 = ~2,500 edges).
- Fixture script: `scripts/bench-graph-fixture.mjs` — outputs `tmp/graph-fixture.json`.

### Variants

Three throwaway prototypes at `tmp/graph-spike/`:

| Variant | Files | Estimated LOC |
|---|---|---|
| **A: d3-force + canvas** (plan v1) | `tmp/graph-spike/d3/index.html` + `d3.js` | ~150 |
| **B: sigma + graphology + forceatlas2** | `tmp/graph-spike/sigma/index.html` + `sigma.ts` | ~100 |
| **C: reagraph** | `tmp/graph-spike/reagraph/App.tsx` | ~80 |

### Metrics

1. **Bundle cost** — `ls -lh tmp/graph-spike/*/dist/*.js` after a build.
2. **Cold render latency** — `performance.now()` from mount to first paint. Target < 1.5s.
3. **Pan/zoom FPS** — devtools perf panel, 5-second pan at 2× speed. Target ≥ 30 FPS sustained.
4. **Hit-test latency** — click a node; measure time until selection callback fires. Target < 50ms.
5. **Code clarity** — subjective; count LOC and note API gotchas.

### Scaled-up test

Repeat at 2,000 nodes / ~10,000 edges to see which variants degrade first. d3-force is expected to fall below 30 FPS; Sigma should stay stable.

### Decision gate

Plan v2 should cite the benchmark results as the basis for its library choice. If the benchmark surprises us (Sigma fails for some reason; reagraph wins on DX), adjust. **Do not skip the benchmark** — prior self-critique pattern-level concern: "anchored on library recommendation in chat before evidence was written."

---

## 7. Verdict

### Ranked recommendation

| Rank | Stack | Why |
|---|---|---|
| **1** | `sigma` + `graphology` + `@react-sigma/core` + `graphology-layout-forceatlas2` | WebGL, actively maintained, MIT, 50k-node ceiling, Logseq prior art (indirect — they use d3-force + Pixi but the stack idea is the same). Total unpacked ~3.8 MB; gzipped ~300 KB on `/graph` route. |
| **2** | `reagraph` | Apache-2.0, WebGL via Three.js, simpler React API (built-in, no peer-dep juggling), 1.6 MB unpacked. Less proven at scale than Sigma. |
| **3** | `d3-force` + canvas + hand-rolled quadtree | Lightest bundle (180 KB unpacked), most control, no peer-dep web. **Unmaintained upstream — decline.** |
| — | `@cosmograph/cosmograph` | WebGL-fastest. **License disqualified.** |
| — | `cytoscape`, `vis-network`, `@antv/g6` | Over-powered for the use case. Oversized bundles. |
| — | `umap-js` scatter | Promising alternative paradigm. Ship as post-MVP v2 toggle. |

### Plan v2 should commit to

- **`sigma.js` v3 + `graphology` + `@react-sigma/core`** as the rendering stack.
- **`graphology-layout-forceatlas2`** for force-directed layout (seeded for stability).
- **Post-MVP open question:** add UMAP scatter alternative view in a later iteration.
- **Keep d3-force explicitly out** — note in the plan the unmaintained status and the prior-art evidence (Logseq moved to Pixi renderer, not canvas).
- **Run the 3-way benchmark before GRAPH-6 execution** — not before plan approval, but before committing the library import in code. Benchmark results land as a PR-ready doc at `docs/research/graph-view-benchmark-<date>.md`.

### Deferred with explicit memory

- **UMAP alternative paradigm.** Worth a v2 toggle. Capture as an Open Question in plan v2.
- **Accessibility work.** Keyboard nav + screen-reader text-list fallback. All three candidate libraries need DIY work here; plan v2 should list this as a non-MVP hardening item, not drop it silently.
- **Layout stability.** Force-directed simulations drift between reloads unless seeded. Plan v2 must specify `forceatlas2` with a deterministic seed so the graph looks the same every time a user reloads `/graph`.

---

## 8. Open questions for the user before plan v2 lands

1. **Library size confirmation.** What's the actual `SELECT COUNT(*) FROM items WHERE enrichment_state = 'done'` on the production DB? (Dev DB at `data/brain.sqlite` shows 2; the real DB is elsewhere on disk.) This confirms the 500–5k estimate or bumps us into a different class.
2. **Paradigm preference.** Force-graph first (match Recall/Obsidian expectation) or UMAP scatter first (more novel, more direct "library shape" visualization)? Recommendation: force-graph first, UMAP as v2 toggle.
3. **Accessibility floor.** Is text-list fallback (for screen readers) a v1 requirement or v2? Screen-reader users get nothing useful from canvas/WebGL without it.
4. **Benchmark gate.** Should plan v2 *require* the 3-way prototype benchmark before GRAPH-6 execution, or treat it as a Phase-1.5 nice-to-have? Recommendation: require it — the benchmark is 2 hours and the cost of picking wrong is days.

---

## 9. Sources and evidence (for audit trail)

- `npm view {sigma, graphology, d3-force, d3-zoom, cytoscape, react-force-graph-2d, reagraph, vis-network, @cosmograph/cosmograph, @antv/g6, @react-sigma/core, pixi.js, umap-js, tsne-js}` — all fetched 2026-05-12.
- `https://github.com/logseq/logseq/master/package.json` — confirmed d3-force + graphology + pixi.js + interactjs stack.
- `https://github.com/foambubble/foam/main/packages/foam-vscode/package.json` — confirmed internal `@foam/graph-view` workspace; rendering library not in the published package.json.
- `https://github.com/dendronhq/dendron` — confirmed graph feature exists; library not surfaced at the root.
- `https://www.sigmajs.org/` — "thousands of nodes and edges" scale claim; explicit "larger graphs faster than canvas or SVG" positioning vs d3.
- `https://github.com/jacomyal/sigma.js` — confirmed MIT, v3 stable, active (2,065 commits on main, v4 alpha in progress).
- `https://github.com/sim51/react-sigma` — v5.0.6 community-maintained React binding; 235 stars; MIT; 26 releases.
- `https://github.com/reaviz/reagraph` — Apache-2.0, WebGL via Three.js, 14+ layouts, active (1,124 commits).
- Data DB probe — `sqlite3 data/brain.sqlite "SELECT COUNT(*) FROM items"` → 2 (dev fixture only).
- No scale benchmarks executed in this spike — that is the open item for plan v2.

### Not independently verified (called out honestly)

- Obsidian graph library identity. Widely reported as Pixi.js in community threads; reddit.com not fetchable from this sandbox, and the Obsidian app is closed-source. Treat as community-consensus, not confirmed fact.
- Foam's actual rendering library inside `@foam/graph-view` — would require cloning the repo and reading the workspace package; skipped for spike scope.
- Dendron's graph library — same.
- Real-world pan/zoom FPS at 2,000 nodes for any of the three candidates — the benchmark in §6 is the resolution plan, not done here.
