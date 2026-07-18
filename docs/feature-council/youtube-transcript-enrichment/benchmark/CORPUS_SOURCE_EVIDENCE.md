# YouTube transcript benchmark: corpus source evidence

**Evidence prepared:** 2026-07-16; reconciled 2026-07-18; not frozen until Commit A<br>
**Scope:** nine exact NASA source-page-to-YouTube associations with official timed sidecars, one NOAA source-media association with no official sidecar, and network-free unsupported-input controls. Strict preflight leaves five A1-eligible sidecars and four predeclared rejection cells.

## Decision

The nine NASA rows below began as **A1 preservation-oracle candidates** because an official NASA page associates a particular video rendition and canonical YouTube ID with a timestamped VTT/SRT cue set. Prospective strict preparation then found empty-text cue blocks in YT-03, YT-05, and YT-06; those files are predeclared rejection cells and are never repaired or scored. YT-04 is the predeclared 7,200-cue class-boundary rejection. The remaining five rows are eligible preservation oracles. The NOAA row is intentionally different: the official page associates source media with a YouTube ID but publishes no ingestible caption sidecar in that row.

This evidence does **not** establish any YouTube caption track's provenance, language, count, availability, or equivalence to the source VTT. In particular, `ASR`/auto-generated versus human-authored, single-track versus multi-track, and no-track claims remain **unverified** until frozen through owner-authorized YouTube API evidence or a documented manual YouTube UI inspection.

No independently authored or independently reviewed speech-reference transcript was found for these rows. SRT and VTT are alternate serializations of the same cue set, not independent references. Separate NASA HTML transcript renderings are official artifacts, but their author/reviewer and derivation provenance are not published. They therefore cannot be used as an independent WER ground truth.

## Evidence and rights rules used for every row

- **NASA baseline:** [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) say NASA media generally are not subject to U.S. copyright and may be used for educational or informational purposes; NASA should be acknowledged, endorsement must not be implied, and NASA's possession of third-party material conveys no downstream rights. The same page has AI-specific restrictions: disclose NASA source material only as a fact, do not attribute model output to NASA, do not imply NASA review or permission, and do not use NASA insignia/logotypes in AI training.
- **NASA SVS baseline:** [NASA SVS help](https://svs.gsfc.nasa.gov/help/) says SVS content is public domain unless otherwise noted. It specifically warns that licensed music is not public domain; the visual material may be used without that audio. Each row below records the material-specific exceptions shown on its source page.
- **NOAA baseline:** the [NOAA PMEL video hub](https://www.pmel.noaa.gov/news-and-media/noaa-pmel-videos) says the listed videos are freely available, requests credit to NOAA, and forbids an express or implied NOAA endorsement.
- **Retention meaning here:** “retain” means keep a benchmark copy inside the controlled local evaluation corpus under the user-authorized research scope. It does not mean publish, redistribute, train a model, transfer to a provider, or claim ownership. Official NASA/SVS publication plus the cited baseline supports a provisional private-research classification; absence of a row-specific claim is **not** treated as affirmative permission. Every attestation requires production/legal-policy review, and third-party caveats remain controlling.
- **Duration method:** source-media duration was read from the official MP4's `mvhd` metadata using bounded HTTP byte ranges; no complete media file was downloaded. Coverage is the last valid VTT cue end compared with that source-media duration. A trailing gap may be an intentional outro and is not by itself a syntax failure.
- **Version-equivalence standard:** “high” below means the official agency page places the named MP4, the named VTT/SRT, and the exact YouTube link in one media item/group, or a second official NASA page embeds the exact YouTube ID and links back to that SVS item. It is publication-association evidence, not a YouTube byte/duration match. This benchmark deliberately makes only a source-sidecar preservation claim and never treats the current YouTube publication as byte-equivalent.
- **Legal posture:** these are operational rights notes, not legal advice. Preserve the source page and credit record at corpus freeze because agency pages and licenses can change.

## Deliberately excluded malformed NASA candidates and replacements

The following VTTs were excluded rather than silently repaired. Their sibling SRTs should also remain excluded until independently parsed and validated.

| Excluded source | Defect observed | Selected clean replacement |
|---|---|---|
| [NASA SVS 14988](https://svs.gsfc.nasa.gov/14988/), [`SpaceRadiationArtemisII.en_US.vtt`](https://svs.gsfc.nasa.gov/vis/a010000/a014900/a014988/SpaceRadiationArtemisII.en_US.vtt) | Terminal cue end is `00:00:NaN.000`. | NASA Pandora, row NASA-A1-09, with a valid terminal cue and a similar short-form duration. |
| [NASA SVS 13060](https://svs.gsfc.nasa.gov/13060/), [`LOBBY_final_.en_US.vtt`](https://svs.gsfc.nasa.gov/vis/a010000/a013000/a013060/LOBBY_final_.en_US.vtt) | Terminal cue end collapses to `00:00:00.000`. | NASA Black Hole Safety, row NASA-A1-02, as the clean short visual-explainer replacement. |
| [NASA SVS 12889](https://svs.gsfc.nasa.gov/12889/), [`WomenofHubble.en_US.vtt`](https://svs.gsfc.nasa.gov/vis/a010000/a012800/a012889/WomenofHubble.en_US.vtt) | Terminal cue end collapses to `00:00:00.000`. | No clean replacement was claimed after strict preparation; VISIONS-2 remains only as a predeclared empty-cue rejection. |

## A1 timed-sidecar corpus

### NASA-A1-01 — 2024 Global Temperature Update, Spanish horizontal

- **Official source page:** [NASA SVS 14743](https://svs.gsfc.nasa.gov/14743/)
- **YouTube:** ID `8GEIN8WPTJ4`; canonical URL <https://www.youtube.com/watch?v=8GEIN8WPTJ4>. The source item links this Spanish horizontal version to NASA en español's YouTube channel.
- **Source media:** [`ESP_Horizontal.mp4`](https://svs.gsfc.nasa.gov/vis/a010000/a014700/a014743/ESP_Horizontal.mp4)
- **Canonical A1 sidecar:** [`GTU2024SPANISH.es_LA.vtt`](https://svs.gsfc.nasa.gov/vis/a010000/a014700/a014743/GTU2024SPANISH.es_LA.vtt)
- **Sibling serialization:** [`GTU2024SPANISH.es_LA.srt`](https://svs.gsfc.nasa.gov/vis/a010000/a014700/a014743/GTU2024SPANISH.es_LA.srt)
- **Separate official HTML artifact:** [`script_37964_00.html`](https://svs.gsfc.nasa.gov/vis/a010000/a014700/a014743/script_37964_00.html); independence is unproven.
- **Verified source facts:** language `es-LA`; MP4 duration `00:01:08.395`; last VTT cue end `00:00:57.357`; trailing uncovered interval `00:00:11.038`. The VTT has a valid terminal cue. Content is short-form Spanish narration over a visual climate explainer and music.
- **Version-equivalence evidence:** the Spanish-horizontal media group on SVS 14743 co-locates the exact MP4, `es_LA` VTT/SRT, HTML transcript, and the official YouTube link. Confidence: **high publication association**; no YouTube-side duration/hash comparison has been made.
- **YouTube caption state:** **UNVERIFIED** — no claim about uploaded versus auto-generated captions, languages, or track count.
- **Content rights:** NASA/SVS baseline applies. The item additionally states in Spanish that the video may be freely shared and downloaded.
- **Caption rights:** provisional private benchmark use only, based on official NASA/SVS publication and the cited baseline; source/provenance are retained, absence of a separate claim is not permission, and production/legal-policy review remains required.
- **Media rights:** the page authorizes intact sharing/downloading, but credits Universal Production Music's “Time Passing Marimba Instrumental.” Do not extract, separately redistribute, or remix the soundtrack.
- **Retention:** VTT/SRT and metadata: **yes**. Intact MP4 for controlled validation: **yes, conditional on preserving the item intact and the credit record**. Extracted soundtrack: **no**.
- **Attribution:** credit `NASA's Goddard Space Flight Center`; disclose NASA as the source without implying NASA review or endorsement of benchmark/model results.
- **Reference role:** **A1 preservation oracle only**. Neither the sibling SRT nor the HTML rendering is an independent WER reference.

### NASA-A1-02 — NASA's Guide to Black Hole Safety

- **Official source pages:** [NASA SVS 13322](https://svs.gsfc.nasa.gov/13322/) and [NASA Science resource](https://science.nasa.gov/resource/guide-to-black-hole-safety/)
- **YouTube:** ID `aMTwtb3TVIk`; canonical URL <https://www.youtube.com/watch?v=aMTwtb3TVIk>. The NASA Science resource embeds that exact ID and links to the SVS download item.
- **Source media:** [`black_hole_safety_video_final_LQ.mp4`](https://svs.gsfc.nasa.gov/vis/a010000/a013300/a013322/black_hole_safety_video_final_LQ.mp4)
- **Canonical A1 sidecar:** [`black_hole_safety_video_final_LQ.en_US.vtt`](https://svs.gsfc.nasa.gov/vis/a010000/a013300/a013322/black_hole_safety_video_final_LQ.en_US.vtt)
- **Sibling serialization:** [`black_hole_safety_video_final_LQ.en_US.srt`](https://svs.gsfc.nasa.gov/vis/a010000/a013300/a013322/black_hole_safety_video_final_LQ.en_US.srt)
- **Separate official HTML artifact:** [`black_hole_safety_video_final_LQ_transcript.html`](https://svs.gsfc.nasa.gov/vis/a010000/a013300/a013322/black_hole_safety_video_final_LQ_transcript.html). The NASA Science page also renders a timestamped transcript, but does not establish independent transcript authorship/review.
- **Verified source facts:** language `en-US`; MP4 duration and last VTT cue end both `00:02:39.744`; trailing gap `00:00:00.000`. The VTT terminal cue is valid. Content is single-narrator animation with sound effects and music.
- **Version-equivalence evidence:** the NASA Science page embeds the exact YouTube ID, names/credits the same video, provides a 191.33 MB original, and links to SVS 13322; the SVS “Safety Video” group co-locates the exact LQ MP4 and matching sidecars. Confidence: **high publication association**.
- **YouTube caption state:** **UNVERIFIED**.
- **Content rights:** NASA/SVS baseline applies; no row-specific third-party claim is attached to the narration or caption text.
- **Caption rights:** provisional private benchmark use only under the cited NASA/SVS baseline; production/legal-policy review remains required.
- **Media rights:** the item credits “Prim and Proper” from Universal Production Music. Visuals are covered by the SVS baseline, but the soundtrack is not public domain.
- **Retention:** VTT/SRT and metadata: **yes**. MP4 with soundtrack: **conditional; keep link-only unless soundtrack retention is cleared, or use an authorized visual-only derivative**. Extracted audio/music: **no**.
- **Attribution:** credit `NASA's Goddard Space Flight Center`; do not use NASA logos as benchmark branding or imply endorsement.
- **Reference role:** **A1 preservation oracle only**. The NASA Science timestamped rendering is useful corroboration, not an independently produced WER oracle.

### NASA-A1-03 — Why NASA Is Sending Rockets into Earth's Leaky Atmosphere (VISIONS-2)

- **Official source page:** [NASA SVS 13430](https://svs.gsfc.nasa.gov/13430/)
- **YouTube:** ID `bSt5peITUBo`; canonical URL <https://www.youtube.com/watch?v=bSt5peITUBo>.
- **Source media:** [`VISIONS2_YouTube.mp4`](https://svs.gsfc.nasa.gov/vis/a010000/a013400/a013430/VISIONS2_YouTube.mp4)
- **Canonical A1 sidecar:** [`VISIONS2.en_US.vtt`](https://svs.gsfc.nasa.gov/vis/a010000/a013400/a013430/VISIONS2.en_US.vtt)
- **Sibling serialization:** [`VISIONS2.en_US.srt`](https://svs.gsfc.nasa.gov/vis/a010000/a013400/a013430/VISIONS2.en_US.srt)
- **Separate official HTML artifact:** [`script_28350_00.html`](https://svs.gsfc.nasa.gov/vis/a010000/a013400/a013430/script_28350_00.html); independence is unproven.
- **Verified source facts:** language `en-US`; MP4 duration and last VTT cue end both `00:07:58.293`; trailing gap `00:00:00.000`. Strict preparation found empty-text cue blocks at ordinals 88 and 108 and failed `INVALID_STRUCTURE`; no repair/drop is allowed. Content includes multiple interviewees/speakers, Arctic field and rocket audio, and varied accents.
- **Version-equivalence evidence:** the primary SVS media group labels the MP4 as the YouTube rendition and co-locates its VTT/SRT, transcript, and exact official YouTube link. Confidence: **high publication association**.
- **YouTube caption state:** **UNVERIFIED**.
- **Content rights:** NASA/SVS baseline applies; the source page lists NASA and university/partner participants but no third-party claim on caption text.
- **Caption rights:** provisional private benchmark use only under the cited NASA/SVS baseline; production/legal-policy review remains required.
- **Media rights:** the source page lists multiple licensed production-music tracks. Do not assume the audio bed is public domain or separably reusable.
- **Retention:** VTT/SRT and metadata: **yes**. MP4 with soundtrack: **conditional/link-only pending music clearance**. Visual-only use may follow SVS guidance, subject to any partner-shot footage noted in credits.
- **Attribution:** credit `NASA's Goddard Space Flight Center` and retain the detailed production/science credits on the source page; no endorsement implication.
- **Reference role:** **A1 preservation oracle only**; HTML is not an independent WER reference.

### NASA-A1-04 — OSIRIS-REx Sample Return Broadcast (full)

- **Official source page:** [NASA SVS 14415](https://svs.gsfc.nasa.gov/14415/)
- **YouTube:** ID `Kdwyqctp908`; canonical URL <https://www.youtube.com/watch?v=Kdwyqctp908>. The source page's official live-video link canonicalizes to this ID.
- **Source media:** [`OSIRIS-REx_Sample_Return_Broadcast.mp4`](https://svs.gsfc.nasa.gov/vis/a010000/a014400/a014415/OSIRIS-REx_Sample_Return_Broadcast.mp4)
- **Canonical A1 sidecar:** [`OSIRIS-REx_Sample_Return_Broadcast_Captions.en_US.vtt`](https://svs.gsfc.nasa.gov/vis/a010000/a014400/a014415/OSIRIS-REx_Sample_Return_Broadcast_Captions.en_US.vtt)
- **Sibling serialization:** [`OSIRIS-REx_Sample_Return_Broadcast_Captions.en_US.srt`](https://svs.gsfc.nasa.gov/vis/a010000/a014400/a014415/OSIRIS-REx_Sample_Return_Broadcast_Captions.en_US.srt)
- **Separate official HTML artifact:** none established for the full broadcast.
- **Verified source facts:** language `en-US`; MP4 duration `03:21:17.589`; last VTT cue end `03:19:31.826`; trailing uncovered interval `00:01:45.763`. The VTT terminal cue is valid. This is the corpus's greater-than-60-minute, live, many-speaker stress case.
- **Version-equivalence evidence:** the first media group on SVS 14415 is explicitly the full September 24, 2023 broadcast and co-locates the 4K MP4, matching caption files, and official YouTube link. Confidence: **high publication association**.
- **YouTube caption state:** **UNVERIFIED**.
- **Content rights:** NASA/SVS baseline applies. The item is a live broadcast with many identifiable people and possible partner inserts; the public page does not publish a segment-by-segment third-party rights inventory.
- **Caption rights:** provisional private benchmark use only under the cited NASA/SVS baseline; music/partner caveats and production/legal-policy review remain controlling.
- **Media rights:** NASA-produced portions fall under the baseline, but redistribution/commercial use of identifiable people or embedded partner material needs additional review.
- **Retention:** VTT/SRT and metadata: **yes**. The 56.3 GB MP4: **not needed for the corpus freeze and conditional on a segment/likeness review before materialization**. Prefer the official source URL for version verification.
- **Attribution:** credit `NASA's Goddard Space Flight Center` and retain the full broadcast credits; no endorsement or commercial-personality use.
- **Reference role:** **A1 preservation oracle only**. The 105.763-second trailing gap must be preserved as a coverage fact, not filled with invented text.

### NASA-A1-05 — 2023 International Observe the Moon Night

- **Official source page:** [NASA SVS 14433](https://svs.gsfc.nasa.gov/14433/)
- **YouTube:** ID `n-Z5XRD8j3I`; canonical URL <https://www.youtube.com/watch?v=n-Z5XRD8j3I>. The source page uses a Microsoft Safe Links wrapper whose underlying destination carries this ID.
- **Source media:** [`2023_INOMN_YouTubeHD.mp4`](https://svs.gsfc.nasa.gov/vis/a010000/a014400/a014433/2023_INOMN_YouTubeHD.mp4)
- **Canonical A1 sidecar:** [`2023_INOMN_YouTubeHD_CAPTIONS.en_US.vtt`](https://svs.gsfc.nasa.gov/vis/a010000/a014400/a014433/2023_INOMN_YouTubeHD_CAPTIONS.en_US.vtt)
- **Sibling serialization:** [`2023_INOMN_YouTubeHD_CAPTIONS.en_US.srt`](https://svs.gsfc.nasa.gov/vis/a010000/a014400/a014433/2023_INOMN_YouTubeHD_CAPTIONS.en_US.srt)
- **Separate official HTML artifact:** none established.
- **Verified source facts:** language `en-US`; MP4 duration `00:59:10.037`; last VTT cue end `00:58:24.466`; trailing uncovered interval `00:00:45.571`. Strict preparation found an empty-text cue block at ordinal 723 and failed `INVALID_STRUCTURE`; no repair/drop is allowed. This is a long, hosted, multi-segment and multi-speaker broadcast; it is **not** a greater-than-60-minute item.
- **Version-equivalence evidence:** SVS 14433 co-locates a media file named as the YouTube HD rendition, its matching captions, and the wrapped NASA Goddard YouTube destination. Confidence: **high publication association**.
- **YouTube caption state:** **UNVERIFIED**.
- **Content rights:** NASA/SVS baseline applies, with significant expressly licensed music.
- **Caption rights:** provisional private benchmark use only under the cited NASA/SVS baseline; music and production/legal-policy review remain controlling.
- **Media rights:** the credits include P!NK and the Ndlovu Youth Choir's “A Million Dreams,” Sony/UNICEF publishing arrangements, and Universal Production Music. Those licenses do not grant a downstream right to copy or extract the soundtrack.
- **Retention:** VTT/SRT and metadata: **yes**. MP4/audio: **link-only; do not retain or redistribute without affirmative music clearance**.
- **Attribution:** credit `NASA's Goddard Space Flight Center`, retain the detailed music credits, and do not imply endorsement.
- **Reference role:** **A1 preservation oracle only**. Preserve the 45.571-second uncovered tail as source coverage metadata.

### NASA-A1-06 — Solar Orbiter Trailer, Spanish

- **Official source page:** [NASA SVS 13509](https://svs.gsfc.nasa.gov/13509/)
- **YouTube:** ID `uwnOO54_m3o`; canonical URL <https://www.youtube.com/watch?v=uwnOO54_m3o>.
- **Source media:** [`SolO_Trailer_SpanishV2.mp4`](https://svs.gsfc.nasa.gov/vis/a010000/a013500/a013509/SolO_Trailer_SpanishV2.mp4)
- **Canonical A1 sidecar:** [`SolO_Trailer_SpanishV2.es_US.vtt`](https://svs.gsfc.nasa.gov/vis/a010000/a013500/a013509/SolO_Trailer_SpanishV2.es_US.vtt)
- **Sibling serialization:** [`SolO_Trailer_SpanishV2.es_US.srt`](https://svs.gsfc.nasa.gov/vis/a010000/a013500/a013509/SolO_Trailer_SpanishV2.es_US.srt)
- **Separate official HTML artifact:** [`SolO_Trailer_SpanishV2Transcripts.html`](https://svs.gsfc.nasa.gov/vis/a010000/a013500/a013509/SolO_Trailer_SpanishV2Transcripts.html); independence is unproven.
- **Verified source facts:** language `es-US`; MP4 duration `00:01:17.525` (77.525333 seconds); last VTT cue end `00:01:17.525`; sub-millisecond metadata difference after display rounding. Strict preparation found 10 empty-text cue blocks, beginning at ordinal 2, and failed `INVALID_STRUCTURE`; no repair/drop is allowed. Content is short Spanish narration over spacecraft animation and music.
- **Version-equivalence evidence:** the Spanish media group on SVS 13509 co-locates the `SpanishV2` MP4, identically named VTT/SRT, Spanish HTML transcript, and exact NASA en español YouTube link. Confidence: **high publication association**.
- **YouTube caption state:** **UNVERIFIED**.
- **Content rights:** NASA/SVS baseline applies, but the page expressly credits ESA/ATG Medialab animation.
- **Caption rights:** provisional private benchmark use only under the cited NASA/SVS baseline; source/translator provenance is retained and third-party/legal-policy review remains controlling.
- **Media rights:** animation is credited to ESA/ATG Medialab and music “Find Her” to Yuri Sazonoff. NASA's general permission does not convey rights to those third-party elements.
- **Retention:** VTT/SRT and metadata: **yes**. MP4/audio: **link-only unless ESA and music rights are separately cleared**.
- **Attribution:** credit `NASA's Goddard Space Flight Center`, ESA/ATG Medialab for animation, Yuri Sazonoff for music, and the named NASA translator; no endorsement implication.
- **Reference role:** **A1 preservation oracle only**; the HTML page is not an independent WER reference.

### NASA-A1-07 — NASA Flew Over a Fire — to Better Understand Future Ones

- **Official source page:** [NASA SVS 14894](https://svs.gsfc.nasa.gov/14894/)
- **YouTube:** ID `QFfZe9Zq2mY`; canonical URL <https://www.youtube.com/watch?v=QFfZe9Zq2mY>.
- **Source media:** [`20250919_SVS14894_FireSense_at_Fort_Stewart_Rx_Burn_4096x2160_29.97fps_ENGLISH_GAW_FINAL_CUT_V2.mp4`](https://svs.gsfc.nasa.gov/vis/a010000/a014800/a014894/20250919_SVS14894_FireSense_at_Fort_Stewart_Rx_Burn_4096x2160_29.97fps_ENGLISH_GAW_FINAL_CUT_V2.mp4)
- **Canonical A1 sidecar:** [`20250919_SVS14894_FireSense_at_Fort_Stewart_Rx_Burn_4096x2160_29.97fps_ENGLISH_GAW_FINAL_CUT_V2.en_US.vtt`](https://svs.gsfc.nasa.gov/vis/a010000/a014800/a014894/20250919_SVS14894_FireSense_at_Fort_Stewart_Rx_Burn_4096x2160_29.97fps_ENGLISH_GAW_FINAL_CUT_V2.en_US.vtt)
- **Sibling serialization:** [`20250919_SVS14894_FireSense_at_Fort_Stewart_Rx_Burn_4096x2160_29.97fps_ENGLISH_GAW_FINAL_CUT_V2.en_US.srt`](https://svs.gsfc.nasa.gov/vis/a010000/a014800/a014894/20250919_SVS14894_FireSense_at_Fort_Stewart_Rx_Burn_4096x2160_29.97fps_ENGLISH_GAW_FINAL_CUT_V2.en_US.srt)
- **Separate official HTML artifact:** the page says “Complete transcript available,” but no separately addressable transcript URL was established. Do not invent one.
- **Verified source facts:** language `en-US`; MP4 duration `00:12:32.384`; last VTT cue end `00:12:22.708`; trailing uncovered interval `00:00:09.676`. The VTT terminal cue is valid. Content includes multiple speakers, field audio, prescribed-fire footage, aircraft, and music.
- **Version-equivalence evidence:** the primary FireSense media group co-locates the exact long `FINAL_CUT_V2` MP4, same-stem sidecars, and official NASA.gov Video YouTube link. Confidence: **high publication association**.
- **YouTube caption state:** **UNVERIFIED**.
- **Content rights:** the page explicitly permits sharing/downloading the video in its entirety.
- **Caption rights:** provisional private benchmark use only under the cited NASA/SVS baseline; partner-content and production/legal-policy review remain controlling.
- **Media rights:** the page says imagery from Tridant Sensing Inc., U.S. Forest Service, Department of War, and Pond5 was used by permission and may not be excised or remixed. It also lists Universal Production Music tracks.
- **Retention:** VTT/SRT and metadata: **yes**. Intact MP4 for controlled validation: **yes under the page's express intact-use permission**. Frames, clips, extracted audio, or remixes: **no without separate permission**.
- **Attribution:** credit `NASA's Goddard Space Flight Center` and retain all listed third-party/agency/music credits; no endorsement implication.
- **Reference role:** **A1 preservation oracle only**. The unlinked “complete transcript” label is not an independent WER source.

### NASA-A1-08 — Three Missions Launch to Track Space Weather (official trailer)

- **Official source page:** [NASA SVS 14893](https://svs.gsfc.nasa.gov/14893/)
- **YouTube:** ID `UETFgQMLxZo`; canonical URL <https://www.youtube.com/watch?v=UETFgQMLxZo>.
- **Source media:** [`14893_IMAPTrailerShort_1080_H264.mp4`](https://svs.gsfc.nasa.gov/vis/a010000/a014800/a014893/14893_IMAPTrailerShort_1080_H264.mp4)
- **Canonical A1 sidecar:** [`14893_IMAPTrailerShort.en_US.vtt`](https://svs.gsfc.nasa.gov/vis/a010000/a014800/a014893/14893_IMAPTrailerShort.en_US.vtt)
- **Sibling serialization:** [`14893_IMAPTrailerShort.en_US.srt`](https://svs.gsfc.nasa.gov/vis/a010000/a014800/a014893/14893_IMAPTrailerShort.en_US.srt)
- **Separate official HTML artifact:** [`script_38876_00.html`](https://svs.gsfc.nasa.gov/vis/a010000/a014800/a014893/script_38876_00.html); independence is unproven.
- **Verified source facts:** language `en-US`; MP4 duration `00:00:54.997`; last VTT cue end `00:00:53.760`; trailing uncovered interval `00:00:01.237`. The VTT terminal cue is valid. Content is a short visual launch trailer with narration and music.
- **Version-equivalence evidence:** the first/short-trailer group on SVS 14893 co-locates the exact short MP4, `IMAPTrailerShort` sidecars and transcript, and official NASA Goddard YouTube link. The page also has an extended trailer; this row deliberately does not mix the two groups. Confidence: **high publication association**.
- **YouTube caption state:** **UNVERIFIED**.
- **Content rights:** NASA/SVS baseline applies.
- **Caption rights:** provisional private benchmark use only under the cited NASA/SVS baseline; music and production/legal-policy review remain controlling.
- **Media rights:** the item credits “Emergence” via Universal Production Music; the soundtrack is not public domain.
- **Retention:** VTT/SRT and metadata: **yes**. MP4 with soundtrack: **conditional/link-only pending music clearance**; an authorized visual-only derivative may follow SVS guidance.
- **Attribution:** credit `NASA's Goddard Space Flight Center` and retain the music credit; no endorsement implication.
- **Reference role:** **A1 preservation oracle only**; HTML is not an independent WER reference.

### NASA-A1-09 — NASA's Pandora Mission Closer to Probing Alien Atmospheres

- **Official source page:** [NASA SVS 14754](https://svs.gsfc.nasa.gov/14754/)
- **YouTube:** ID `Inxe5Bgarj0`; canonical URL <https://www.youtube.com/watch?v=Inxe5Bgarj0>.
- **Source media:** [`Pandora_ToS_Best.mp4`](https://svs.gsfc.nasa.gov/vis/a010000/a014700/a014754/Pandora_ToS_Best.mp4)
- **Canonical A1 sidecar:** [`14755PandoraToSCaptions.en_US.vtt`](https://svs.gsfc.nasa.gov/vis/a010000/a014700/a014754/14755PandoraToSCaptions.en_US.vtt)
- **Sibling serialization:** [`14755PandoraToSCaptions.en_US.srt`](https://svs.gsfc.nasa.gov/vis/a010000/a014700/a014754/14755PandoraToSCaptions.en_US.srt)
- **Separate official HTML artifact:** [`14754_Pandora_ToS_HTML_Transcript.html`](https://svs.gsfc.nasa.gov/vis/a010000/a014700/a014754/14754_Pandora_ToS_HTML_Transcript.html); independence is unproven.
- **Verified source facts:** language `en-US`; MP4 duration `00:01:29.792`; last VTT cue end `00:01:29.380`; trailing uncovered interval `00:00:00.412`. The VTT terminal cue is valid. Content is a short narrated exoplanet-mission explainer with animation and music.
- **Version-equivalence evidence:** the main horizontal media group on SVS 14754 co-locates the `Pandora_ToS_Best` rendition, main (non-REEL) sidecars and transcript, and official NASA Goddard YouTube link. The vertical reel is a separate group and is excluded. Confidence: **high publication association**.
- **YouTube caption state:** **UNVERIFIED**.
- **Content rights:** NASA/SVS baseline applies; individual visual items on the page have their own credits.
- **Caption rights:** provisional private benchmark use only under the cited NASA/SVS baseline; production/legal-policy review remains required.
- **Media rights:** the video credits Universal Production Music's “Mesmeric Thoughts.” Some underlying imagery/spacecraft material also carries named NASA/BCT or laboratory credits.
- **Retention:** VTT/SRT and metadata: **yes**. MP4 with soundtrack: **conditional/link-only pending music clearance**; retain item-specific visual credits if a cleared visual-only derivative is made.
- **Attribution:** credit `NASA's Goddard Space Flight Center` and the individual item credits indicated on the source page; no endorsement implication.
- **Reference role:** **A1 preservation oracle only**; HTML is not an independent WER reference.

## Authorized-media / no-official-sidecar coverage case

### NOAA-A2-01 — Cape Mendocino, California tsunami propagation, December 5, 2024

- **Official source hub:** [NOAA PMEL Videos](https://www.pmel.noaa.gov/news-and-media/noaa-pmel-videos)
- **Official event page:** [NOAA/NCTR event analysis](https://nctr.pmel.noaa.gov/california20241205/)
- **YouTube:** ID `vrfAtuC29Ow`; canonical URL <https://www.youtube.com/watch?v=vrfAtuC29Ow>.
- **Source media:** [`mendocino_propagation_animation_20241205.mp4`](https://www.pmel.noaa.gov/public/pmel/videos/mendocino_propagation_animation_20241205.mp4)
- **Official transcript/caption sidecar:** **none linked in the exact PMEL row**. This is a source-page observation, not a claim that YouTube has no captions.
- **Verified source facts:** MP4 duration `00:00:58.560`; container metadata includes both video and audio tracks. Spoken content and language were not established, so this row must not be labeled silent, speech-bearing, English, or captionless on YouTube without further inspection.
- **Version-equivalence evidence:** the exact “Cape Mendocino, California Tsunami propagation - December 5, 2024” PMEL hub row co-locates the YouTube, MP4, and event-page links; the event page links the same propagation animation. Confidence: **high publication association**.
- **YouTube caption state:** **UNVERIFIED**.
- **Content rights:** the PMEL hub expressly says its listed videos are freely available. The event page says the model results are preliminary research products, not an official forecast and not a basis for policy decisions.
- **Caption rights:** not applicable; no official sidecar was found for the row.
- **Media rights:** the hub's express availability statement supports retaining the official MP4 for a controlled benchmark; do not imply the animation is an operational forecast.
- **Retention:** metadata and MP4: **yes**, with the hub/event disclaimer and attribution retained. No transcript can be retained because none is supplied.
- **Attribution:** credit `NOAA / PMEL / Center for Tsunami Research`; state that use does not constitute NOAA endorsement.
- **Reference role:** **no A1 oracle and no independent WER reference**. This is only an authorized-media/no-ingestible-sidecar Gate 2 coverage case. It contributes one row to the trigger worksheet but is not a transcript-acquisition positive or a prevalence estimate.

## Structural unsupported-input control

### CTRL-STRUCT-01 — malformed YouTube video identifier

- **Input:** `youtube_url = "https://www.youtube.com/watch?v=not-an-id"`; parsed candidate ID `not-an-id` is nine characters, not a valid 11-character YouTube video ID.
- **Expected behavior:** reject as unsupported/malformed input before any network request, caption lookup, media access, retry, or fallback.
- **Source/YouTube/media/transcript/duration/language:** not applicable; this is deliberately not a real corpus video.
- **Version-equivalence and syntax evidence:** deterministic parser-shape failure; no external-state assertion is required.
- **Rights and retention:** no third-party content is fetched or retained. The synthetic input string may be kept with the test.
- **Reference role:** none.
- **Guardrail:** this control does not prove that any real YouTube video lacks captions, is unavailable, or has a particular caption-track type.

## Independent-reference provenance blocker

No candidate in this set has public evidence sufficient to certify an independently authored or independently reviewed timestamped speech reference:

1. Each `.srt` and `.vtt` pair is the same cue set in two formats.
2. The separate `script_*` and `*_transcript.html` pages are official, but NASA does not publish a derivation chain showing that they were transcribed from speech independently of the caption sidecar.
3. The NASA Science Black Hole page names a page editor and responsible official and renders timestamps, but that is page governance, not evidence of an independent transcript pass.
4. The two rows without HTML artifacts provide no alternative reference at all; FireSense's “Complete transcript available” label did not resolve to a separately addressable artifact during this review.

Accordingly, the corpus has **zero independently proven WER references**, not four. To unlock independent WER scoring, obtain an owner/custodian attestation identifying transcript authoring/review provenance, or commission a separately produced human verbatim transcript with documented annotator independence and adjudication.

## YouTube-side freeze requirements

Before a row is admitted to any benchmark stratum that depends on YouTube caption properties:

1. Record the YouTube video ID, visible title, channel, duration, and UTC observation time.
2. Use an owner-authorized YouTube `captions.list` response when available; retain track ID, language, name, and `trackKind` evidence. Public video metadata alone is insufficient.
3. Otherwise, manually open **Settings → Subtitles/CC** and preserve a screenshot showing every visible track label. Record the literal `(auto-generated)` marker when present. “Auto-translate” is a feature, not an uploaded source track.
4. Do not infer a YouTube track from the official source VTT, and do not infer absence from a source page that omits a sidecar.
5. Compare the visible YouTube duration to the source MP4 duration and reject or re-review material mismatches before treating the publication association as the frozen benchmark version.

Until those steps are complete, the five eligible NASA rows remain A1 **source-preservation** candidates, the other four NASA rows remain predeclared A1 rejection controls, and the NOAA row remains an authorized-media Gate 2 coverage case. None carries a verified YouTube auto/manual/multi-track or no-track label.
