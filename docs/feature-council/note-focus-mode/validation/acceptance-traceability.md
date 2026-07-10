# Note Focus Mode — PRD V2 Acceptance Traceability

Date: 2026-07-10
Legend: **Pass**, **Pass with residual**, **Deferred**, **Out of scope**

| Criterion | Implementation evidence | Test/evidence | Status | Residual risk |
|---|---|---|---|---|
| NFM-001 Default | Flag + deliberate editor control; no remembered preference | Flag tests; flag-off browser restart | Pass | None |
| NFM-002 Entry | Named icon/text button, disabled-layer description | Browser DOM, keyboard path, accessibility review | Pass | None |
| NFM-003 Controller | One shared editor instance in item page | Persistent-host test; production one textarea/request trace | Pass | Channel/journal owner inferred from one component |
| NFM-004 Textarea | Same in-place Write control | Hook object-identity test; browser one-textarea transitions | Pass | Hard refresh intentionally creates a new document |
| NFM-005 Host semantics | Persistent tab panels and responsive shared host | Component + real Arrow key/browser resize evidence | Pass | None |
| NFM-006 Canvas | Fixed opaque viewport, centered 880px column | 2.57× desktop measurement; 320/390 captures | Pass | None |
| NFM-007 Trust chrome | Exit/title/privacy/mode/toolbar/status/Copy/Save | Desktop/mobile screenshots and DOM | Pass | None |
| NFM-008 Exit | Button/Escape/Back, prompt-free same document | Hook test; browser Back/Exit/request trace | Pass | Real IME Escape below |
| NFM-009 Content/state | Component never remounts; Preview retained | Hook/persistent-host tests; browser Preview/Write | Pass | Rare in-flight error combinations rely on existing tests |
| NFM-010 Native state | Current selection/scroll captured and restored | View snapshot test; same textarea/value browser evidence | Pass with residual | Automation could not prove native Cmd/Ctrl+Z or selection direction end-to-end |
| NFM-011 URL | Content-free marker; source precedence | Pure helpers; server canonical browser checks | Pass | None |
| NFM-012 History | push/back/forward/direct/reload/normalize | Unit and production-build browser trace | Pass | None |
| NFM-013 Load | Existing disabled loading path; direct Focus waits for ready | Production hydration observation; editor state machine | Pass | Slow/failure screenshot not retained |
| NFM-014 Save states | Existing editor state machine unchanged and visible | 814-test regression; code/accessibility review | Pass with residual | Not every state forced manually while focused |
| NFM-015 Unlock | Focus-aware `next`, Unlock/Copy/Exit | Production smoke found/fixed proxy query loss; PR #16 regression; corrected deep-link smoke | Pass | PIN entry itself was not automated |
| NFM-016 Unsafe navigation | Journal-failed + server-ahead classifier and guards | Unit test; editor/palette integration review | Pass with residual | Browser-native confirm/journal-failure flow not forced |
| NFM-017 Input order | IME/229/ref filter, child priority, palette suppression | Focus handler review; lint/type/build | Pass with residual | Real IME/software-keyboard evidence unavailable |
| NFM-018 Semantics | In-place labelled/described modal, exact isolation, trap | Isolation tests; keyboard wrap; WCAG review | Pass with residual | VoiceOver/TalkBack speech unavailable |
| NFM-019 Reflow | Sticky top/bottom, scrolling middle, scroll padding | 320×800 metrics/capture; no overflow | Pass | 400% browser zoom not separately instrumented |
| NFM-020 Keyboard geometry | CSS `100dvh`, safe insets, single scroll surface | Static review; narrow viewport | Deferred | Physical software keyboard/visualViewport unavailable |
| NFM-021 Android Back | Native history contract supports hidden-keyboard case | Web Back/Forward trace | Deferred | Android keyboard-first Back requires device/emulator |
| NFM-022 Privacy | Minimal state schema, content-free URL, no telemetry | Pure tests, network/log/artifact inspection | Pass | Token is random but intentionally content-free |
| NFM-023 Rollback | Focus flag preflight + previous artifact | Flag-off and previous-artifact runtime rehearsal | Pass | Old artifact restores known duplicate controllers |
| NFM-024 Context command | No command-palette entry added | Diff/code review | Out of scope | Explicitly deferred by PRD |
| NFM-025 Analytics | No analytics added | Diff/privacy review | Out of scope | Future privacy review required |

## Release judgment

The guarded web release is **live on production main `6858529`**. No Critical/High accessibility or data-loss defect is open, all automated/build/dependency gates pass, both rollback paths were exercised, and the flag-off smoke prevented enablement until the signed-out deep-link defect was fixed. Android/software-keyboard/TalkBack certification and exact native undo shortcut evidence remain explicitly unclaimed follow-up evidence rather than fabricated pass results.
