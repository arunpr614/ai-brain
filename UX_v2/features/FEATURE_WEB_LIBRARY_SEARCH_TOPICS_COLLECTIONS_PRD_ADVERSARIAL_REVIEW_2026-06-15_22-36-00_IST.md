# Feature Web Library Search Topics Collections PRD - Adversarial Review

**Created:** 2026-06-15 22:36:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_WEB_LIBRARY_SEARCH_TOPICS_COLLECTIONS_PRD_V1_2026-06-15_22-34-03_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_WEB_LIBRARY_SEARCH_TOPICS_COLLECTIONS_PRD_ADVERSARIAL_REVIEW_2026-06-15_22-36-00_IST.md`

## Executive Verdict

No-go for execution until v2 tightens fixture requirements, destructive-action removal verification, mutation postconditions, and browser QA coverage. The PRD points at the right slice, but it still leaves enough optional language for implementation to claim completion with empty or unrepresentative states.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_WEB_LIBRARY_SEARCH_TOPICS_COLLECTIONS_PRD_V1_2026-06-15_22-34-03_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/library-list.tsx`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/library/page.tsx`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/search/page.tsx`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/topics/[slug]/page.tsx`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/collections/[id]/page.tsx`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/actions.ts`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/db/tags.ts`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/db/collections.ts`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/WEB_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_20-27-04_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/WEB_EXPERIENCE_REVAMP_MAGIC_PATTERNS_SOURCE_SNAPSHOT_2026-06-15_21-48-07_IST/README.md`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Fixture coverage is optional enough to let empty screens pass

**Evidence:** PRD v1 requires browser screenshots for Topic populated/unknown and Collection populated/empty only "if feasible" at lines 124-125. The Topic route depends on `getTopicBySlug`, `countItemsForTopic`, and `listItemsForTopic` in `src/app/topics/[slug]/page.tsx:39-44`. The Collection route depends on `getCollection` and `listItemsInCollection` in `src/app/collections/[id]/page.tsx:25-28`.
**Why it matters:** Without deterministic seeded topic and collection records, the feature can be marked complete with not-found and empty-only evidence while missing the actual P0 read/Ask surfaces.
**Failure mode:** Browser QA captures `/topics/missing` and an empty collection, declares route stability, and never verifies populated item rows, source quality, excerpts, or Ask topic/collection links.
**Recommendation:** V2 must require a local seeded fixture set with at least one full-text item, one weak/metadata item, one topic containing both, one populated manual collection, and one empty manual collection. Populated topic and populated collection evidence must be non-optional.

#### 2. Destructive delete removal lacks negative verification against the current active UI

**Evidence:** PRD v1 says active Library bulk delete is out of scope at lines 71, 115, and 138. Current Library code still imports `Trash2` and `bulkDeleteItemsAction` at `src/components/library-list.tsx:8` and `src/components/library-list.tsx:17`, wires `handleBulkDelete` at `src/components/library-list.tsx:176-192`, passes it into `BulkBar` at `src/components/library-list.tsx:295-304`, and renders the Delete button at `src/components/library-list.tsx:423-431`.
**Why it matters:** The PRD says the right product decision, but the implementation starts from an already-active destructive UI. A vague "absent from active UI" release condition may miss source-level or keyboard-accessible remnants.
**Failure mode:** The button is visually hidden but remains in code, focus order, responsive breakpoint, or alternate state; a user can still delete private sources from the revamp slice without recovery evidence.
**Recommendation:** V2 must require source scans and browser negative checks for Library destructive affordances: no Library `Trash2` import, no `bulkDeleteItemsAction` import/use from `library-list.tsx`, no visible or focusable Library button named Delete, and no deletion success copy in Library.

#### 3. Conditional mutation validation does not define real postconditions

**Evidence:** PRD v1 asks to validate success count and persistence for bulk tag and collection at lines 69-70 and interaction QA at line 125. Existing server actions in `src/app/actions.ts:88-143` and `src/app/actions.ts:118-143` return counts based on attempted IDs rather than inspected post-mutation rows. `attachTagToItem` and `attachItemToCollection` use `INSERT OR IGNORE` in `src/db/tags.ts:34-38` and `src/db/collections.ts:68-73`.
**Why it matters:** A bulk action can report success for duplicate no-op attachments unless tests assert database postconditions and user-facing copy makes that acceptable. "No fake success" is not enforceable without expected row counts.
**Failure mode:** Selecting an already-tagged item or already-collected item produces a success count that implies a new mutation happened. QA only checks a flash message and reload, so the false count ships.
**Recommendation:** V2 must specify mutation validation postconditions: canonical tag name exists, each selected item has the tag after reload, selected collection contains each selected item after reload, duplicate submissions remain idempotent, no selected item disappears, and user-facing count is either attempted count with truthful wording or actual changed count with verified DB rows.

#### 4. Visual QA matrix is weaker than the umbrella plan for a P0 surface

**Evidence:** PRD v1 visual requirements cover 1280x800, 1440x900, and 390x844 at lines 105-107. The umbrella implementation plan requires 390x844, 768x1024, 1024x768, 1280x800, 1440x900, and 1920x1080 for the browser harness.
**Why it matters:** Library and search are dense surfaces. The risky breakpoints are compact desktop/tablet and large desktop, not just laptop and standard desktop.
**Failure mode:** The mobile filter sheet avoids overlap at 390, but the tablet/compact-desktop filter row wraps badly or row metadata clips; the slice still passes v1.
**Recommendation:** V2 must define a required matrix for this slice: Library at 390, 768, 1024, 1280, and 1440; Search at 390 and 1280; Topic and Collection at 390 and 1280 at minimum, with 1920 optional unless content-width bugs appear.

### P2 - Medium Risk

#### 1. Search provider-down copy is not product-safe enough for a nontechnical UI

**Evidence:** PRD v1 line 80 requires truthful provider-down copy but does not ban terminal-command recovery text. Current search UI says "Ollama offline" and includes a command at `src/app/search/page.tsx:91-99`.
**Why it matters:** The app has a nontechnical UI preference. A raw daemon command in the main app surface can feel like an implementation leak and does not match the revised PRD's "AI Memory" polish bar.
**Failure mode:** Browser QA accepts the state as truthful, while the shipped UX still reads like a developer diagnostic rather than a product state.
**Recommendation:** V2 should require user-facing copy such as "AI search is unavailable" with a Settings/provider-health pointer, while leaving technical detail to logs or settings diagnostics.

#### 2. Topic and collection visual parity is too shallow

**Evidence:** PRD v1 topic and collection requirements at lines 87-99 cover headers, lists, and Ask links, but do not require source health, weak-source warnings, or responsive detail parity from the umbrella PRD's screen acceptance matrix.
**Why it matters:** Topic and Collection are scoped knowledge surfaces. If they only look like generic item lists, they will technically function but miss the revamp goal.
**Failure mode:** Implementation ships unchanged routes with screenshots, but no scope-health treatment or weak-source explanation, making Ask topic/collection feel unsupported when sources are low quality.
**Recommendation:** V2 should require a compact scope-health row for Topic and Collection: item count, readable/full-text count when available, weak/needs-upgrade count when available, and truthful copy when the scope may produce weak answers.

### P3 - Low Risk Or Polish

#### 1. Magic Patterns limitations are acknowledged but not translated into an execution rule

**Evidence:** PRD v1 says full source contents are not saved locally at line 22, but does not say what the implementer must do if Magic Patterns source cannot be re-read during execution.
**Why it matters:** The team could overclaim Magic Patterns parity based only on current code and memory of a prior inspection.
**Failure mode:** QA says "matches Magic Patterns" without a fresh reference image or source excerpt for the exact surface.
**Recommendation:** V2 should say this slice is allowed to proceed as a production-truth adaptation, not a pixel-perfect MP claim, unless fresh MP screenshots/source for these pages are captured.

## What The Original Plan Or Work Gets Wrong

The PRD treats known-dangerous UI, especially Library bulk delete, as a product decision but not as a concrete verification problem. It also lets QA be partially opportunistic with "if feasible" language, which contradicts the umbrella revamp's evidence-first gates.

## Missing Validation

- Deterministic local fixture creation for populated topic and collection states.
- Negative browser/focus checks proving Delete is gone from Library.
- Source scan proving Library no longer imports or renders destructive bulk UI.
- DB postcondition tests for bulk tag and bulk collection actions.
- Duplicate/idempotent mutation tests or explicit truthful attempted-count copy.
- Tablet/compact-desktop screenshot coverage.
- Product-safe provider-down copy review.

## Revised Recommendations

Create PRD v2 with explicit fixture rows, delete-removal negative checks, mutation postconditions, expanded viewport matrix, and scope-health requirements. Do not proceed to implementation planning until those are in the PRD.

## Go / No-Go Recommendation

No-go for implementation from v1. Go only after v2 resolves the P1 findings and converts the optional QA language into hard exit criteria.

## Plan Revision Inputs

### Required Deletions

- Remove "if feasible" from P0 populated Topic/Collection and Search result-state evidence.
- Remove any implication that bulk tag/collection validation can be satisfied by success toast alone.

### Required Additions

- Local seeded fixture set for Library/Search/Topic/Collection states.
- Delete-removal source scan and browser negative check.
- DB postconditions for bulk tag and bulk collection.
- Scope-health treatment for Topic and Collection.
- Product-safe AI search unavailable copy.

### Required Acceptance Criteria Changes

- Populated Topic and populated Collection screenshots are mandatory.
- Library selected-state evidence must prove Ask, Tag, Collection, and Clear remain available while Delete is absent.
- Mutation acceptance must inspect persisted rows after reload.

### Required Validation Changes

- Add focused tests for bulk tag/collection postconditions if those actions remain active.
- Add browser evidence for Library default, filtered, selected, mobile filter sheet, Search empty/results/no-results/provider-down, Topic populated/not-found, Collection populated/empty/not-found.
- Add required viewports: 390, 768, 1024, 1280, 1440 for Library.

### Required No-Go Gates

- No execution if fixture data cannot produce populated Topic and Collection states.
- No local completion if any active Library delete control remains visible or focusable.
- No completion if bulk mutation actions are retained without persisted-row validation.

## Residual Risks

Even after v2, the Magic Patterns source limitation remains: this feature can deliver production-truth adaptation and strong QA, but not a strict pixel-perfect parity claim unless fresh MP screenshots or source excerpts are captured for these exact surfaces.
