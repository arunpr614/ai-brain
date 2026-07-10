# Note Focus Mode — QA and Production Release Report

Date: 2026-07-10
Scope: isolated synthetic database and generated note content only

## Automated gate

| Gate | Result |
|---|---|
| Focused unit/component tests | Pass |
| Full repository tests | Pass — 814 tests, 92 suites after production-smoke hotfix |
| ESLint | Pass |
| TypeScript | Pass |
| Diff whitespace | Pass |
| Optimized production build | Pass; existing `unpdf` webpack warning only |
| Standalone build-artifact check | Pass |
| Environment ignore check | Pass |
| Production dependency audit | Pass — 0 vulnerabilities |
| Deploy script syntax | Pass |

## Production-build browser gate

| Scenario | Result |
|---|---|
| Normal Notes default | One visible editor; Saved content restored |
| Focus entry | URL gains `note_mode=focus`; one dialog, one textarea, 25 inert background branches |
| Back | Normal URL, zero dialogs, same value, one textarea |
| Forward | Focus URL/dialog restored, same value, one textarea |
| Transition request trace | Zero note GET/PUT during Focus/Back/Forward |
| Direct focused refresh | One expected note GET; Saved state and content restored |
| Direct unowned Exit | Marker removed by `replaceState`; unrelated query preserved |
| Invalid marker | Server/client normalization removes it |
| Source `mode=focus` precedence | Note marker removed before source-reading view |
| Preview | Focus and normal return retain controller/Markdown; Write restores one textarea |
| Companion tab keyboard | ArrowLeft/Right changes selection/focus; textarea remains mounted/value intact |
| Flag-off restart | Focus control absent; stale marker receives 307 canonical redirect; normal Notes intact |

## Geometry and visual gate

| Viewport | Result |
|---|---|
| 1440×900 | Focus textarea 816px vs 318px normal; 2.57× wider; opaque viewport takeover |
| 390×844 | Full toolbar, large editor, visible Exit/status/Copy/Save |
| 320×800 | No horizontal overflow; 44×44 toolbar targets; 320px editor; sticky trust actions |

Visual comparisons:

- `comparison-desktop-normal-vs-focus-1440x900-2026-07-10.jpg`
- `comparison-mobile-normal-vs-focus-320x800-2026-07-10.jpg`

## Rollback rehearsal

- Focus-only rollback passed with `NOTE_FOCUS_MODE_ENABLED=0` and restart.
- Previous artifact `870dc5ab3c9294ba749e218831fcb922098b447d` installed dependencies, built, started on a separate port, loaded the synthetic note, exposed no Focus button, and retained the requested AI/connections preference UI.
- The old artifact predictably restores the known pre-feature duplicate responsive controllers (two DOM textareas, one visible). This is acceptable only as an emergency structural rollback and is recorded honestly.

## Production gate

| Scenario | Result |
|---|---|
| GitHub integration | PR #15 merged feature; PR #16 merged signed-out deep-link fix |
| Final deployed main | `6858529ef179a51442d319c6c58e5ace79757619` |
| Flag-off first deploy | Pass; backup, 813 tests, build, restart, health, strict providers |
| Flag-off deep link | Initial smoke found query loss; Focus remained disabled; fixed before enablement |
| Corrected gate | Pass — 814 tests, build, sync, restart, authenticated health |
| Deliberate enablement | `NOTE_FOCUS_MODE_ENABLED=1`; restricted env backup/rewrite and restart |
| Authenticated Notes/Focus | Ordinary Notes, Focus control, Focus route, canonicalization, and source precedence pass |
| AI default regression | Settings markup contains **Include in AI & connections by default** |
| Operations | Strict Anthropic/Gemini checks, webhook 401, service active, Recall timer enabled/active |
| Production mutations | None; read-only smoke used an ephemeral in-process session and printed no note content |

The browser interaction matrix remains the local production-build evidence because no user PIN/session was available to the selected browser. Production verification therefore claims authenticated route/control/server-rendered behavior and operations health, not a second pixel comparison or a second native undo proof.

## Residuals

- The browser-control layer could not emit a verifiable Cmd/Ctrl+Z modifier sequence. Same-node/browser history evidence and React/jsdom state tests protect the native undo precondition, but exact keyboard undo remains a manual release smoke item.
- Real journal-write failure, session expiry, offline transition, cross-tab conflict, and every existing save-state presentation were not individually forced through the production browser; existing note regression tests cover their underlying state paths.
- No Android device/emulator, software keyboard, TalkBack, or real screen-reader speech harness is available. Those platform claims remain unverified.
