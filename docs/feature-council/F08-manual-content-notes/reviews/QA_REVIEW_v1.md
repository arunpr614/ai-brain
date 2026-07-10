# QA Review v1 — F08 Manual Content Notes

**Date:** 2026-07-10
**Reviewer:** Independent QA/reviewer
**Scope:** Goal objective, supplied F08 PRD V2, formal PRD/UX/technical v1, all three council inputs, prototype/source/screenshots/design QA, project tracker, decision log, current worktree, and candidate deployed-source history.
**Verdict:** **V1 PACKAGE NO-GO; PRODUCTION NO-GO.** Proceed to v2 only after the P0 findings below are resolved in the contracts. Implementation may start behind default-off flags on disposable data only after the no-loss and privacy protocols are made unambiguous. No migration or production work may start until the attested deployed line is integrated.

## Review Method and Evidence Limits

The review traced each user promise through product, UX, architecture, persistence, retrieval, deletion, and release behavior. Current code confirms that attached notes do not exist, current FTS indexes only item title/body, current embeddings mix title/summary/body, Ask citations carry no source provenance, the service worker caches item HTML but makes APIs network-only, and the current branch's protected API routes often check only cookie presence.

New production-line evidence resolves an important council inference: commit `8178117` contains migrations 018/019/020, and live `manifest.webmanifest` and `offline.html` hashes match `8178117` and differ from `4d97c45`. Production DB contains 018/019/020. Therefore **`8178117` is the attested consolidated deployed-source baseline**, subject to a complete artifact inventory and `rsync --delete` dry run. V1 references to `4d97c45` as implementation truth are stale.

The prototype source and screenshots were inspected. A prototype build was attempted, but dependencies were absent (`vite: command not found`), so the design QA's build claim was not independently reproduced. No feature implementation exists yet; all implementation and production gates remain unexecuted.

### Priority definitions

- **P0:** blocks v2 approval, production-line implementation, or release because it can cause data loss, privacy/security failure, or production corruption.
- **P1:** must be fixed before production enablement; implementation may proceed behind disabled flags if the P0 contract is stable.
- **P2:** completeness/test-evidence gap that should be fixed before release candidate.
- **P3:** polish or wording issue.

## P0 Findings

### P0-01 — The documented deployed baseline is stale; integration must start from attested `8178117`

**Evidence:** `PROJECT_TRACKER.md:43` and `technical_architecture_v1.md:69-75` correctly block stale-main deployment, but `UX_F08_MANUAL_CONTENT_NOTES_v1.md:5`, `ux_design_v1.md:6`, and several component mappings call `4d97c45` the production truth. `4d97c45` contains migration 020 but lacks 018/019. Commit `8178117` contains 018/019/020; live public-asset hashes and production migration state attest it as the consolidated deployed baseline. The deploy script uses `rsync --delete`.

**Risk:** integrating against `4d97c45` or current main can omit transcript-policy/segment schema and delete or regress Recall runtime assets.

**Required fix:** update v2, tracker, and decision log to name `8178117` as the baseline; capture an immutable production artifact inventory, applied-migration filename/hash list, service/timer inventory, and dry-run deletion report; merge the complete baseline before numbering/applying 021/022. Gate on fresh-DB and production-snapshot tests from the same integrated tree.

### P0-02 — The 0-chunk/44-vector production state remains an indexing collision blocker

**Evidence:** `PROJECT_TRACKER.md:44`, `PRD:209`, and `technical_architecture_v1.md:71-73, 241-252` identify 44 `chunks_vec` rows with no relational chunks. Current `insertChunkWithRowid()` allocates from `MAX(chunks_rowid.rowid)+1`, so an empty bridge can reuse an occupied vec0 rowid.

**Risk:** first note embedding can fail or corrupt derived-index expectations; migration parity cannot be proven.

**Required fix:** produce a report-only exact rowid set, bridge set, mapped/orphan classification, and retrieval-reachability proof from a WAL-safe snapshot. Back up, approve a repair/reservation manifest, rehearse it on the snapshot, then prove pre/post integrity and rowid allocation before enabling the worker. Never infer that rows are safe to delete merely from counts.

### P0-03 — “Include in AI” off is not immediately enforced

**Evidence:** `PRD:110,163,188` promises no semantic/remote use after opt-out. `TECH:84` and `technical_architecture_v1.md:509` remove chunks asynchronously. The proposed retrieval contract (`technical_architecture_v1.md:511-524`) adds provenance but does not require retrieval/Ask/Related to join or re-check `item_notes.include_in_ai`. Existing chunks can therefore be retrieved while cleanup is queued. Also, `TECH:63` calls an equal content hash a no-op, but toggling `includeInAi` with unchanged Markdown is not a no-op.

**Risk:** private note text can still be sent to a configured remote embedding/Ask provider after the user turns AI use off.

**Required fix:** make the opt-out write a versioned policy change even when content is unchanged; synchronously gate semantic retrieval, Ask prompting, Related, and future graph reads on the current inclusion flag; keep asynchronous vector deletion as cleanup only. Worker claim and pre-commit checks remain required. Add a race test that toggles off while old chunks and an in-flight job exist, then proves zero provider calls and zero note retrieval immediately.

### P0-04 — Mutation-ID lifecycle is incomplete and can reject valid later edits

**Evidence:** `TECH:72-76` and `technical_architecture_v1.md:376-390` store one `mutationId` in the draft; `technical_architecture_v1.md:356-365` requires the same ID for exact retries and returns 422 if reused with different content. The package never states when a coalesced/new edit atomically receives a new ID, especially when typing continues during an in-flight save or Manual Save is pressed.

**Risk:** the second content generation may reuse the first generation's key, receive 422, and remain unsynced; recovery can replay the wrong content/key pair.

**Required fix:** specify a save-generation state machine: content/hash/baseVersion/mutationId are one atomic envelope; exact retries retain the ID; any payload change after send creates a new next-generation ID; only acknowledgement of the matching generation can clear it. Manual Save queues/flushes the newest generation without overlapping the current request. Add deterministic fake-timer tests for edit-during-flight, manual-save-during-flight, retry, late response, reload, and coalescing.

### P0-05 — Conflict UI promises recovery that the revision model cannot guarantee

**Evidence:** `ux_design_v1.md:23,82` and prototype `App.jsx:513` say the unchosen version remains in revision history. The formal UX offers `Copy both` (`UX:55-58`), but the prototype only has Keep mine/Use cloud (`App.jsx:503-513`). Server revisions contain previously acknowledged server states; a losing local-only draft is not a server revision, and the schema has no `conflict_snapshot` kind.

**Risk:** selecting the server version can discard local work despite explicit no-loss copy.

**Required fix:** choose and specify one truthful model: upload/store a bounded conflict snapshot, retain the losing local draft with explicit retention/export, or require Copy both before discard. Define APIs, retention, cleanup, focus/copy behavior, and offline behavior. Do not say “revision history” unless both versions are actually stored and restorable. Test both conflict directions and browser/device restart before and after resolution.

### P0-06 — Hard delete can be undone by a delayed first-create draft

**Evidence:** `technical_architecture_v1.md:200-217` hard-deletes canonical note state and most receipts. After delete, the server state is indistinguishable from “note never existed.” An offline client with `baseVersion=null` can later submit an old first-create mutation and recreate the deleted note. A short delete receipt keyed only to the delete mutation does not reject unrelated delayed saves.

**Risk:** deleted private text can silently reappear and be reindexed/sent to AI.

**Required fix:** add a content-free, item-scoped note epoch/tombstone or equivalent causal guard that survives note deletion and rejects pre-delete save generations; define explicit user-authorized recreation as a new epoch. Retention must cover supported offline replay, not only seven days unless the UI declares expiry. Test delayed null-base create, delayed update, worker completion, and reconnect after delete.

### P0-07 — Privacy/provider/export decisions remain provisional and internally contradictory

**Evidence:** Decisions D08-D10 are provisional. The PRD makes AI inclusion default-on and labels the note private (`PRD:37,53,144`). The prototype shows “Private manual note” but no inclusion toggle, active-provider disclosure, or export inclusion warning. `TECH:101-103` says default exports exclude notes, while `technical_architecture_v1.md:548-552` says to add My notes to exports without an explicit default-off route contract.

**Risk:** “Private” can mislead the user while content transits Cloudflare, remains in browser/server backups, or is sent to a configured cloud provider; exports may disclose it by default.

**Required fix:** finalize D08-D10 in v2. Define privacy as authenticated/non-shared, not encrypted; show the active provider and effect of the toggle before first remote use; use `include_notes=false` by default on every single/bulk/share route; require explicit UI inclusion plus provenance/warning. Inventory all current and integrated export/share/cache paths. Tests must prove default exclusion, explicit inclusion, HMAC auth, no-store private responses, and no note content in logs/URLs.

## P1 Findings

### P1-01 — Three-way provenance is promised but only two source kinds are designed

The PRD and D06 name `original`, `manual_note`, and `ai_summary`, but migration 022 defines only `item|manual_note`. Current item embeddings concatenate title, summary, and body. V2 must either expand the source model and reindex safely, or narrow the F08 promise to `item_content|manual_note` while explicitly stating that existing item chunks may contain AI summary. Do not claim three-way citation provenance with a two-way schema.

### P1-02 — Persisted Ask citations and post-edit citation behavior are incomplete

The affected-file list covers retrieval/client chips but omits the persisted `Citation` contract in `src/db/chat.ts` and the full `/api/ask` citation mapping. Reindexing deletes old note chunks, so historical chat citations may become orphaned after every edit. Add `source_kind`, `source_version`, and a durable resolution policy to streamed and stored citations. Define what a chip shows when the cited version was edited/pruned; test reload of a persisted chat before and after note reindex/delete.

### P1-03 — Prototype design QA says “passed” despite material mobile/accessibility mismatches

At `styles.css:323-327,353-364`, save status is hidden below 1100 px and on mobile; Save is 38×34 and toolbar buttons are 37×36, below the required 44×44. Secondary tools are hidden with no overflow. The conflict dialog has no Copy both action or focus trap. `markDirty()` immediately sets `saving`, which disables Manual Save during the debounce (`App.jsx:580-603`). Local storage is not written on every online edit, there is no five-second max wait, and returning online can mark a dirty draft saved. These are acceptable prototype limitations only if `design-qa.md` records them; “no actionable P0/P1/P2 mismatch” is unsupported.

**Required fix:** revise the prototype or downgrade its QA claim. Production design acceptance requires visible text save state, 44px targets, overflow actions, focus trap/restore, Copy both, truthful local/server state, and physical Android keyboard/IME evidence.

### P1-04 — Local-draft deletion scope is impossible as currently worded

The PRD says note/item deletion purges the local draft, but a server cannot synchronously erase IndexedDB on offline devices. Define current-client deletion, cross-client tombstone reconciliation on reconnect, session reset/logout behavior, and the intentional “item deleted elsewhere—copy draft” exception. Cleanup manifests must distinguish `removed_current_client`, `pending_offline_clients`, and retained-by-policy rather than claim global purge.

### P1-05 — Acceptance criteria lack executable oracles for several launch claims

“All constructs,” “safe snippet,” “bounded related weighting,” “existing functions remain,” “approved bundle budget,” and p95 targets lack fixtures, datasets, sample sizes, hardware/network conditions, or thresholds. The PRD's 99% immediate FTS objective conflicts with same-transaction deterministic FTS; accepted writes should be 100% visible in deterministic tests. Define golden Markdown fixtures, escaping/truncation rules, a relevance set and pass threshold, an exact mobile regression inventory, bundle/interaction budgets, and benchmark protocol.

### P1-06 — Graph completion is not distinguishable from a no-op hook

The current product has Related but no persisted graph. The package should state that v1 ships note-aware Related and a tested future graph boundary, not a functioning graph. A hook call alone cannot close the user's graph/mapping intent. Require a spy/contract test now, and a separate graph acceptance gate when the real edge module exists; do not mark graph functionality released prematurely.

### P1-07 — Editor and size decisions remain open but are already written as requirements

D15, `PRD:229-232`, and UX questions leave Lexical versus textarea and 100 KB versus 200 KB unresolved, while formal requirements hard-code visual mode and 200 KB. Finalize after a React 19/Next 16/Capacitor/IME/round-trip/accessibility/bundle spike. The safe textarea+toolbar path must still satisfy every P0 formatting fixture. Select one byte limit and test UTF-8 bytes, not characters.

### P1-08 — Rollout flags do not protect migrations and need exact semantics

021/022 auto-apply at startup even when the UI flag is off. Define separate read/UI, write, and worker flags with default-off behavior, health visibility, and downgrade behavior. The deployment gate must occur before startup migration, not rely on a UI flag. Provide a standalone rollback/cleanup command for manual-note vectors because older code can retrieve them without provenance.

## P2 Findings

1. **Prototype evidence is not reproducible from the checked-out folder without dependency restoration.** Record `npm ci`, build output, browser version, automated accessibility output, console capture, and artifact hashes in validation. The present build attempt failed with `vite: command not found`.
2. **“GitHub-flavored Markdown” is broader than the supported v1 subset.** Tables and raw HTML are excluded. Call it a defined Markdown/GFM subset or support the whole claim.
3. **Supplied-PRD analogue tests need an attached-note mapping.** Replace title/body/tag-only wording with formatting-only, explicit-empty-save, AI-toggle-only, clear, open-twice, and parent-card invariants.
4. **Named release owners are still absent.** Role ownership is useful, but Product, Engineering, AI/Data, UX, QA, Security/Privacy, and Release DRIs must be named before production approval.
5. **Terminology is inconsistent.** Use `My notes` in UI, `manual_note` internally, and `Saved version` rather than `Cloud version` in a self-hosted system.

## P3 Findings

1. Prototype CSS caps the mobile shell at 844 px (`styles.css:331`), which can leave unused space on taller devices; use the actual visual viewport in production.
2. Align local-draft latency targets (`250 ms` PRD versus `50 ms p95` technical council) and autosave wording (`700–1000 ms` versus exactly `750 ms`) so QA has one threshold.

## Requirements Traceability Matrix

| ID | Goal requirement | V1 coverage | Required verification | Status |
|---|---|---|---|---|
| R1 | Note attached to every library entry and stored separately | PRD §§1,5,8; D01-D02; 021 model | All item types; no second item/card; original/AI fields unchanged | Covered, unexecuted |
| R2 | Rich/basic Markdown editing | PRD P0; UX §§4-7; editor plan | Golden round-trip fixtures, paste/IME/undo, safe rendering, keyboard/mobile | Partial; editor decision open |
| R3 | Manual save + autosave with no loss | PRD Journeys A/B and AC; D04 | Generation/idempotency, rapid typing, crash/offline, conflict, late response | **Blocked by P0-04/P0-05** |
| R4 | Search manual notes | PRD Journey C; note FTS/detailed search | Immediate create/update/clear/delete, snippet escaping, RRF de-dup | Covered, unexecuted |
| R5 | AI uses notes with provenance | PRD Journey D; source-aware chunks/Ask | Provider-down save, provenance stream/store/reload, stale job, opt-out race | **Blocked by P0-03 and P1-01/02** |
| R6 | Notes influence connections/graph | PRD Journey D; Related weighting/future hook | Relevance set, no duplicate node, hook spy, clear/delete convergence | Partial; only Related is real |
| R7 | Notes remain private | PRD principles/AC; D08-D10 | Verified auth/origin, cache/log/export/provider/backup tests | **Blocked by P0-07** |
| R8 | Web/mobile behavior | UX package/prototype | Physical Capacitor IME/keyboard/safe-area/touch/status/regression matrix | Partial; prototype mismatch |
| R9 | Delete/clear/recovery/export lifecycle | PRD Journey E; revision/cleanup design | Delayed offline save, tombstone, conflict losing copy, all artifact counts | **Blocked by P0-05/P0-06** |
| R10 | Safe production release | Tracker M3-M8; technical rollout | 8178117 integration, 021/022 snapshot rehearsal, vector repair, dry-run, rollback | **Blocked by P0-01/P0-02** |

## Required Test Matrix

| Test ID | Area/scenario | Expected oracle | Gate |
|---|---|---|---|
| MIG-01 | Fresh integrated DB through 022 | 018/019/020/021/022 all applied; integrity/FK clean | P0 |
| MIG-02 | Latest production snapshot through 021/022 | Counts, chunk IDs, mapped rowids/vectors, Recall tables and retrieval preserved | P0 |
| MIG-03 | 0 chunks / 44 vec audit and approved repair rehearsal | Exact manifest; next rowid collision-free; no reachable vector deleted | P0 |
| DEP-01 | Artifact inventory + `rsync --delete` dry run | No unexplained removal versus attested 8178117 production inventory | P0 |
| AUTH-01 | Missing/forged/expired/tampered cookie on every note/revision/export route | 401, no content, `no-store` | P0 |
| AUTH-02 | Allowed, cross-site, and missing browser mutation Origin | Only exact allowed same-origin mutation succeeds | P0 |
| SAVE-01 | First/update/no-op saves | Correct 201/200, monotonic version, no duplicate revision/job | P0 |
| SAVE-02 | Same mutation retry and same ID/different payload | Replay once; changed payload gets 422; UI remains recoverable | P0 |
| SAVE-03 | Edit and Manual Save during in-flight autosave | New generation ID; one request in flight; latest content eventually current | P0 |
| SAVE-04 | Continuous typing, late responses, refresh/pagehide | 750 ms idle/5 s max; exact final hash; zero loss/duplicate versions | P0 |
| SAVE-05 | Two tabs/devices | 409; no overwrite; BroadcastChannel only advisory | P0 |
| SAVE-06 | Conflict choose server/mine/Copy both then restart | Both versions remain according to declared retention and are recoverable | P0 |
| SAVE-07 | IndexedDB denied/quota/corruption | Truthful warning; online Manual Save/copy path; no false local durability | P0 |
| DEL-01 | Delete followed by delayed null-base create/update | Old generation rejected; no resurrection/index/provider call | P0 |
| DEL-02 | Clear versus delete versus parent delete | Exact canonical/revision/receipt/FTS/job/chunk/bridge/vector outcomes | P0 |
| MD-01 | Every supported construct visual→Markdown→visual | Canonical golden Markdown and semantics preserved | P1 |
| MD-02 | HTML/script/events/unsafe URLs/huge nesting/paste | No execution; safe protocols only; bounded resource use | P0 |
| MD-03 | 100/200 KB boundary with multibyte Unicode | Byte-accurate accept/reject; local draft retained on 413 | P1 |
| FTS-01 | Term only in note after create/update/clear/delete | Correct parent once, immediately, with escaped bounded snippet | P0 |
| FTS-02 | Original + note + semantic match | One result; correct matched-source labels and stable RRF oracle | P1 |
| AI-01 | Provider down during canonical save | Save and FTS succeed; index status retryable | P0 |
| AI-02 | Toggle off with old chunks/job in flight | Immediate zero retrieval/provider use; eventual derived cleanup | P0 |
| AI-03 | Stale job completes after newer version/toggle | Cannot commit; newest policy/version wins | P0 |
| AI-04 | Ask stream, persisted chat, reload, note re-edit/delete | Manual-note label/version retained; historical citation degrades truthfully | P1 |
| REL-01 | Synthetic relevance set with long/short notes | Manual influence bounded; source-only ranking not erased | P1 |
| GRAPH-01 | Index/clear/delete/inclusion transitions | Future graph boundary invoked; failure never fails save | P1 |
| PRIV-01 | SSR/RSC/SW/cache inspection | No note content in cached page payloads or note API cache | P0 |
| PRIV-02 | Default/explicit single and bulk export/share | Default excludes; explicit includes labeled My notes only | P0 |
| PRIV-03 | Logs/errors/analytics/network URLs | No Markdown, plain text, snippet, link, conflict body, or prompt leakage | P0 |
| MOB-01 | Physical Android IME, paste, selection, background/kill/reopen | Latest draft recoverable; no duplicate input; truthful status | P0 |
| MOB-02 | 320/390/600 px, keyboard and safe areas | 44px targets, no hidden Save/status/actions, no page overflow | P1 |
| A11Y-01 | Keyboard/screen reader/200% zoom | Named editor/toolbar, active states, live status, trapped/restored dialogs | P1 |
| ROLL-01 | Flags off, worker stop, old-app rollback rehearsal | No claims/writes; notes retained; manual vectors removed before old retrieval | P0 |
| PROD-01 | Synthetic production item full lifecycle | Create/format/save/search/Ask/opt-out/conflict/delete and complete cleanup manifest | P0 |

## Release Gates

1. **Specification gate:** all P0 findings resolved in PRD/UX/technical v2; D08-D10/D15 finalized; no contradictory promises.
2. **Baseline gate:** 8178117 integrated; exact production inventory and applied migration hashes captured; dry-run safe.
3. **Migration/vector gate:** snapshot rehearsal, orphan-vector manifest, 021/022 integrity/retrieval parity, rollback evidence pass.
4. **Security/privacy gate:** verified HMAC and Origin tests; immediate AI opt-out; safe Markdown; cache/log/export/provider tests pass.
5. **No-loss gate:** generation/idempotency, offline, conflict, delete tombstone, crash/reload, and multi-device matrices show zero silent loss/resurrection.
6. **Editor/mobile/accessibility gate:** selected editor passes all Markdown fixtures and physical Capacitor/IME/a11y tests; fallback proven.
7. **Search/AI/Related gate:** immediate FTS, latest-version indexing, persisted citation provenance, bounded relevance, and cleanup converge.
8. **Operational gate:** flags default off, migration preflight, worker diagnostics, backup cycle, artifact manifest, and rollback rehearsal pass.
9. **Production gate:** synthetic-only smoke and cleanup pass on deployed build; Recall scheduler/runtime and health remain stable; named DRIs sign off before real-note enablement.

## Explicit Go / No-Go

- **V1 package:** **NO-GO** as the final implementation/release contract because seven P0 findings remain.
- **V2 revision:** **GO immediately**, using this review as the required-fix list.
- **Local implementation on disposable data:** **CONDITIONAL GO** only after P0-03 through P0-07 are specified unambiguously; keep all flags off by default.
- **Migration/production integration:** **NO-GO** until attested baseline 8178117 is fully integrated and P0-01/P0-02 evidence passes.
- **Production enablement:** **NO-GO** until every release gate above has recorded evidence and no unresolved P0/P1 acceptance failure remains.
