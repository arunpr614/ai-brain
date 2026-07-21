# YouTube Transcript and Enrichment — Corpus Manifest

> **MANIFEST STATUS: FINAL PROSPECTIVE LOCK INPUT — UNSEALED; PRIMARY RUNS PROHIBITED**

**Manifest version:** 2.3<br>
**Draft opened:** 2026-07-16<br>
**Reconciled:** 2026-07-18<br>
**Content-freeze commit:** Recorded externally by `LOCK.json`; not yet created

The selected corpus contains 10 real YouTube publications with official agency-source publication associations: nine NASA VTT inputs and one NOAA source-media/no-sidecar coverage case. A separate malformed-ID fixture is synthetic and is not a real-video substitute. The rights and association dossier is [Corpus source evidence](CORPUS_SOURCE_EVIDENCE.md). No row claims byte equivalence with a YouTube-hosted caption or media artifact.

## Selection ledger

| Test ID | Required overlap | Exact YouTube publication | Duration | Language | Authorized sidecar | Authorized source media | Locked reference role | Visual dependency | State |
|---|---|---|---:|---|---|---|---|---|---|
| YT-01 | Short; non-English; visual climate explainer | [8GEIN8WPTJ4](https://www.youtube.com/watch?v=8GEIN8WPTJ4) | 68.395 s | es-LA | Official NASA VTT | Conditional; intact video has licensed music | A1 input-preservation | High | Selected; A1 eligible after lock |
| YT-02 | Short visual explainer; not a proven task tutorial | [aMTwtb3TVIk](https://www.youtube.com/watch?v=aMTwtb3TVIk) | 159.744 s | en-US | Official NASA VTT | Link-only pending soundtrack clearance | A1 input-preservation | High | Selected; A1 eligible after lock |
| YT-03 | Multi-speaker; accents/field audio | [bSt5peITUBo](https://www.youtube.com/watch?v=bSt5peITUBo) | 478.293 s | en-US | Official NASA VTT with empty-text cues | Link-only pending music/partner review | No scored oracle | Medium | Selected; expected strict-structure rejection |
| YT-04 | >60 minutes; live; many speakers; boundary | [Kdwyqctp908](https://www.youtube.com/watch?v=Kdwyqctp908) | 12,077.589 s | en-US | Official NASA VTT, 8,974 cues | Not materialized; likeness/partner review required | A1 safe-rejection record; not scored | Medium | Selected; strict preflight passes, but A1 expected-safe-rejection because 8,974 cues exceed the 7,200-cue supported-class limit |
| YT-05 | Long hosted multi-segment broadcast | [n-Z5XRD8j3I](https://www.youtube.com/watch?v=n-Z5XRD8j3I) | 3,550.037 s | en-US | Official NASA VTT with an empty-text cue | Link-only; expressly licensed music | No scored oracle | Medium/high | Selected; expected strict-structure rejection |
| YT-06 | Short; non-English; third-party animation | [uwnOO54_m3o](https://www.youtube.com/watch?v=uwnOO54_m3o) | 77.525 s | es-US | Official NASA VTT with 10 empty-text cues | Link-only; ESA animation and music | No scored oracle | High | Selected; expected strict-structure rejection |
| YT-07 | Multi-speaker; field audio; high visual dependency | [QFfZe9Zq2mY](https://www.youtube.com/watch?v=QFfZe9Zq2mY) | 752.384 s | en-US | Official NASA VTT | Intact only; third-party imagery may not be excised/remixed | A1 input-preservation | High | Selected; A1 eligible after lock |
| YT-08 | Very short visual trailer | [UETFgQMLxZo](https://www.youtube.com/watch?v=UETFgQMLxZo) | 54.997 s | en-US | Official NASA VTT | Link-only pending music clearance | A1 input-preservation | High | Selected; A1 eligible after lock |
| YT-09 | Short visual mission explainer | [Inxe5Bgarj0](https://www.youtube.com/watch?v=Inxe5Bgarj0) | 89.792 s | en-US | Official NASA VTT | Link-only pending music clearance | A1 input-preservation | High | Selected; A1 eligible after lock |
| YT-10 | Authorized source media; no official source sidecar | [vrfAtuC29Ow](https://www.youtube.com/watch?v=vrfAtuC29Ow) | 58.560 s | Unverified | None in exact NOAA row | Explicitly available from NOAA | None | High | Selected coverage case; A1 excluded; A3 not triggered |

At most 12 videos are allowed; this version uses 10. `CTRL-STRUCT-01` in `CORPUS_SOURCE_EVIDENCE.md` and the `SAFE-*` fixtures in `SAFETY_FIXTURES.json` cover malformed/unsupported behavior without asserting that a real video is private, deleted, or captionless. No real unavailable/restricted video is included because no safe, stable, rights-verifiable identifier was established; this is a declared corpus limitation, not an inferred pass.

YouTube-side caption authorship, automatic-caption status, track count, and track languages remain unverified. The source-produced VTTs must not be relabeled human-created or YouTube-uploaded. Human-authored YouTube captions, automatic captions, several YouTube tracks, a verified no-caption speech item, poor audio, a genuine task tutorial, an eligible greater-than-60-minute item, and a real restricted/unavailable control are coverage gaps. An attempted public UI check could not initialize the isolated in-app browser, and the OAuth route has no callback/consent/editor-authorized item; no signed-in browser or alternate extraction path was used. All five eligible real inputs are VTT and span 54.997–752.384 seconds; SRT behavior is synthetic parser evidence only.

## Selection flow and strata limitation

This is a purposive, rights-first research corpus, not a random sample of YouTube. The selected-set screening flow is exact:

| Selected-set stage | Count | Items | Interpretation |
|---|---:|---|---|
| Real source-associated publications fixed | 10 | YT-01–YT-10 | Maximum denominator for this research; not a prevalence sample |
| Official source sidecar locally available | 9 | YT-01–YT-09 | Source availability only; not A1 eligibility |
| A1 eligible after strict preparation | 5 | YT-01, YT-02, YT-07, YT-08, YT-09 | Exact positive denominator, all VTT |
| A1 strict-structure rejection | 3 | YT-03, YT-05, YT-06 | Empty-text cues are preserved as rejection controls, never repaired/dropped |
| A1 supported-class rejection | 1 | YT-04 | 8,974 cues exceed the prospectively declared 7,200-cue boundary |
| No source sidecar | 1 | YT-10 | Coverage case; the only row satisfying the two Gate 2 authorization booleans |

The five eligible rows cover short/medium duration, English and Spanish, multi-speaker/field audio, and high visual dependency, but not SRT, eligible >60-minute media, poor audio, verified auto-captions, multiple YouTube tracks, or restricted/private behavior. The `5/5` rule is therefore directional evidence for the exact five-VTT class only. It cannot estimate support prevalence, screening yield outside this selected set, or production coverage.

## Locked input inventory

Private paths are relative to the non-Git benchmark workspace. `REFERENCE_LEDGER.json` binds attestation/input hashes, strict-preflight outcomes, normalized token/character counts where parsing succeeded, actual/base anchor counts, and the exact private preparation-document hashes. The five eligible reference packets and YT-04 safe-rejection preparation document were generated offline under a deny-network sandbox before any candidate run. YT-03, YT-05, and YT-06 failed strict preparation as prospectively declared structural rejections and have no packet.

| Item | Private input | Bytes / cues | Raw SHA-256 | Duration / last end / gap ms | Tokens | Anchors actual/base | Preparation or rejection | Completeness |
|---|---|---|---|---|---:|---:|---|---|
| YT-01 | `inputs/nasa/YT_GLOBAL_TEMP_ES_8GEIN8WPTJ4.vtt` | 1,615 / 7 | `f8b2dbe1c9ec0521f1589453c2399c558241ba5a6b351f7f7b7fa691f0d14c1b` | 68,395 / 57,357 / 11,038 | 229 | 7/10 sparse | `ff507d573114c8a7321a679059c894aaf57b102026d9d9f0a19e7d62923f7c07` | Complete by source assertion; tail recorded |
| YT-02 | `inputs/nasa/YT_BLACK_HOLE_aMTwtb3TVIk.vtt` | 5,060 / 39 | `4341e975b77c42a4e15cf1368336f02f29031b462fd8da52a03209fa45e9689d` | 159,744 / 159,744 / 0 | 622 | 10/10 | `b5c13d572f12313a516853cf8bb42267a4526f8ad8895fce16ac6b521e5a125a` | Complete by source assertion |
| YT-03 | `inputs/nasa/YT_VISIONS2_bSt5peITUBo.vtt` | 10,761 / 108 | `fd66f8e62779561047f57f505e24916cbf6293f6de8c775d7df30407f69ddbb5` | 478,293 / 478,293 / 0 | N/A | 0/10 | `INVALID_STRUCTURE` at cue 88; no packet | Complete assertion does not override invalid structure |
| YT-04 | `inputs/nasa/YT_OSIRIS_Kdwyqctp908.vtt` | 511,823 / 8,974 | `5ef1a804dbffdabe9349dc8efef79dbdbb183cfa183f115498aee8f9b3ff1250` | 12,077,589 / 11,971,826 / 105,763 | 34,169 | 0/41 | `9c367575412e0564d6c66e2b1ec1d466cde59c11f5465bf4d3a03265cfcf86a6`; cue-limit rejection | Unknown; uncovered tail |
| YT-05 | `inputs/nasa/YT_IOMN_n-Z5XRD8j3I.vtt` | 67,689 / 814 | `431edebc537261748bce67d1ae099da6160d88e8dc2d3450b58cafcef303ada8` | 3,550,037 / 3,504,466 / 45,571 | N/A | 0/12 | `INVALID_STRUCTURE` at cue 723; no packet | Partial source coverage |
| YT-06 | `inputs/nasa/YT_SOLAR_ORBITER_ES_uwnOO54_m3o.vtt` | 755 / 15 | `a537b3352459728a99785fdae94ea372e0552c32ee0efd688c134a7253442a36` | 77,525 / 77,525 / 0 | N/A | 0/10 | `INVALID_STRUCTURE` at cue 2; no packet | Complete assertion does not override invalid structure |
| YT-07 | `inputs/nasa/YT_FIRESENSE_QFfZe9Zq2mY.vtt` | 26,406 / 421 | `6d8efa75edbbdb6bded8413445903bc5e049833b7f73ed99d5dbf42dc73f44cc` | 752,384 / 742,708 / 9,676 | 2,053 | 10/10 | `7bd0e1f7e96d5ff51bc4df8dfe46dab79877fdad59851d476c546e87aa2a838f` | Complete by source assertion; tail recorded |
| YT-08 | `inputs/nasa/YT_IMAP_UETFgQMLxZo.vtt` | 918 / 13 | `9bd59a52838db6b8030b3a5fb128f60fd2340f1226e96863d3366ee840fee06f` | 54,997 / 53,760 / 1,237 | 85 | 10/10 | `a2515518f7a66a5b6c4d41b1622aa47b3272b6e14061d3c3a0bac2c50303d685` | Complete by source assertion; variants separated |
| YT-09 | `inputs/nasa/YT_PANDORA_Inxe5Bgarj0.vtt` | 1,444 / 15 | `b2deffeae00423fad86435395f72bfa18cd143ba4fb1789ca13c93b023c80539` | 89,792 / 89,380 / 412 | 141 | 10/10 | `29f4a5faa0a6ba638b945fa0739f8ba93ae14aa19c714976fee0a2245837d383` | Complete by source assertion; variants separated |
| YT-10 | None | N/A | N/A | 58,560 / N/A / N/A | N/A | 0 | No sidecar | Speech/language/YouTube captions unverified |

## Six-dimension authorization record

Every selected item is mapped in `CORPUS_SOURCE_EVIDENCE.md` to the fields below. Ambiguity is preserved as a limitation rather than converted into authorization.

### Identity and equivalence

- canonical YouTube URL and 11-character video ID;
- public title or neutral publication-safe label;
- rights-holder/source page and access date;
- source asset ID, duration, publication/version date, file name or stable asset URL, and SHA-256 where locally held;
- concrete evidence that the agency source associates the exact asset/sidecar with the exact YouTube publication, plus an explicit statement of whether YouTube-side byte/duration equivalence was or was not verified.

### Authorization dimensions

1. **Underlying content:** owner, license/version, public-domain basis or explicit permission, restrictions, and attribution.
2. **Caption/transcript:** owner/source, license/permission to ingest, retain, derive, quote, and evaluate.
3. **Source-origin media:** permission to obtain/process the non-YouTube media file, or explicit `not authorized/not applicable`.
4. **YouTube access mechanism:** per-method authorization; A1 makes no caption request, A2 requires OAuth/editor permission, A3 never downloads from YouTube.
5. **Retention and derivation:** full text, segments, hashes, embeddings, summaries/chapters, evaluation outputs, deletion/expiry, provider disclosure.
6. **Attribution and license obligations:** exact credit, share-alike/noncommercial/no-derivatives restrictions, and where it must appear.

### Media and evaluation facts

- exact duration, language(s), speaker count/class, audio challenge, visual dependency;
- caption tracks visible only through an authorized official/source record before run;
- A1 sidecar local private path and SHA-256, parser format, cue count, source word count;
- reference origin, role (`input-preservation`, non-scoring `safe-rejection`, or `independent-speech`), creation procedure/independence when applicable, local private path, SHA-256, word count, anchor count, and reviewer state;
- split text-groundable/visual-only key-point rubric hash;
- privacy, security, retention, provider-upload, and publication restrictions.

## Reference roles, independence, and handling

- At least four real items require trusted, timestamped reference artifacts finalized and hashed before Commit A.
- An eligible A1 input sidecar is an `input-preservation` oracle only. It can score token/cue preservation, but it cannot be labeled an independent speech reference or support WER/audio-relative accuracy. An expected-safe-rejection preparation such as YT-04 is a non-scoring boundary record, not a preservation oracle.
- Every A3 item requires an `independent-speech` reference produced before lock by a procedure independent of candidate output. SRT and VTT serializations of the same cue set are one source, not two references.
- A candidate-method output cannot create or correct its own reference.
- References and media remain outside Git when rights, privacy, or size require. Only publication-safe metadata, review procedure, role, independence state, and hashes are committed.
- Reference changes after Commit A require a new two-commit seal and invalidate affected primary scores.

## Gate 2 trigger worksheet

The trigger uses two separate authorization booleans per selected item. A row contributes only when `authorized_ingestible_sidecar=false` **and** `independently_authorized_source_media=true`. A source sidecar that strict A1 cannot ingest is `false`; conditional/link-only/review-required media is also `false`.

| Item | Authorized ingestible sidecar | Independently authorized source media | Contributes to A3 increase | Reason |
|---|---|---|---|---|
| YT-01 | true | false | false | Eligible A1 sidecar; intact media has licensed-music condition |
| YT-02 | true | false | false | Eligible A1 sidecar; soundtrack clearance pending |
| YT-03 | false | false | false | Strict-invalid sidecar; music/partner review pending |
| YT-04 | false | false | false | Sidecar outside A1 cue limit; likeness/partner review required |
| YT-05 | false | false | false | Strict-invalid sidecar; expressly licensed music |
| YT-06 | false | false | false | Strict-invalid sidecar; third-party animation/music |
| YT-07 | true | false | false | Eligible A1 sidecar; intact-only third-party-imagery restriction |
| YT-08 | true | false | false | Eligible A1 sidecar; music clearance pending |
| YT-09 | true | false | false | Eligible A1 sidecar; music clearance pending |
| YT-10 | false | true | true | No exact-row sidecar; NOAA source media explicitly available |

Both aggregate conditions must be calculated after the 10 real rows are final:

| Trigger component | Locked value | Required |
|---|---:|---:|
| Rows satisfying both authorization booleans | 1 of 10 (YT-10) | ≥2 |
| Resulting eligible-corpus increase from A3 | 1 of 10 curated rows | ≥2 rows and ≥20% of this corpus |

Both conditions fail. This is a prospective **corpus work-allocation trigger**, not a market-prevalence or product-coverage estimate. Gate 2 is `Not triggered / Not run`, every A3 cell is excluded before run, and no STT model, media, or independent speech reference is downloaded or prepared. YT-03 through YT-06 fail the ingestible-sidecar boolean but also fail independent source-media authorization, so they cannot contribute.

## Rights and safety sign-off

- [x] Ten real source-page-associated YouTube publications selected; no YouTube-side byte equivalence is claimed.
- [x] Every source page, YouTube ID, asset/sidecar, and source-row version association verified; YouTube-side equivalence remains explicitly unverified.
- [x] All six authorization dimensions recorded with provisional private-research clearance and mandatory production/legal-policy review; public availability or silence alone is never the rationale.
- [x] A1 files came from official authorized source pages rather than YouTube.
- [x] A2 is blocked/not run without redirect, consent, API enablement/quota, and editor permission.
- [x] Gate 2 did not trigger; no media/STT download or run is authorized.
- [x] Five eligible timestamped A1 preservation oracles are held outside Git and hashed; YT-04 is a hashed safe-rejection preparation, three files are structural rejections, and independent speech-reference count is zero.
- [x] No A1 preservation oracle will be used for WER; WER is not applicable/not run.
- [x] Complete transcripts and media are excluded from Git.
- [x] The unsupported-input control is synthetic and network-free; no real restricted content is accessed or bypassed.
- [x] Corpus count, method states, denominators, references, preparation packets, and the not-applicable key-point-rubric decision receive independent pre-lock review and Commit A.
