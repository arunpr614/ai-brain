import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseTranscriptFile,
  TranscriptFileParseError,
} from "./parse-file";

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function longCue(label: string): string {
  return `${label} explains customer discovery, product tradeoffs, validation steps, implementation risks, operational handoffs, and follow-up decisions in enough detail for useful analysis.`;
}

test("parses VTT cues with identifiers, settings, and tag stripping", () => {
  const parsed = parseTranscriptFile({
    filename: "sample.vtt",
    contentType: "text/vtt",
    bytes: bytes(`WEBVTT

intro
00:00:01.000 --> 00:00:04.500 align:start
<v Arun>${longCue("The first cue")}</v>

00:00:05.000 --> 00:00:08.000
${longCue("The second cue")} <b>without markup</b>.
`),
  });

  assert.equal(parsed.extension, ".vtt");
  assert.equal(parsed.timestampMode, "timestamped");
  assert.equal(parsed.segments.length, 2);
  assert.equal(parsed.segments[0].startMs, 1000);
  assert.equal(parsed.segments[0].endMs, 4500);
  assert.equal(parsed.segments[0].durationMs, 3500);
  assert.match(parsed.segments[0].text, /The first cue explains/);
  assert.equal(parsed.segments[0].text.includes("<v"), false);
  assert.equal(parsed.normalizedText.includes("<b>"), false);
});

test("skips impossible VTT cues and rejects files with no useful cues", () => {
  assert.throws(
    () =>
      parseTranscriptFile({
        filename: "bad.vtt",
        contentType: "text/vtt",
        bytes: bytes(`WEBVTT

00:00:05.000 --> 00:00:04.000
${longCue("Impossible timing")}
`),
      }),
    (err) =>
      err instanceof TranscriptFileParseError &&
      err.code === "malformed_transcript_file",
  );
});

test("parses SRT multiline cues with comma millisecond timestamps", () => {
  const parsed = parseTranscriptFile({
    filename: "sample.srt",
    contentType: "application/x-subrip",
    bytes: bytes(`1
00:00:01,250 --> 00:00:04,000
${longCue("The first SRT cue")}

2
00:00:05,000 --> 00:00:08,500
${longCue("The second SRT cue")}
continues across a second line with more implementation detail.
`),
  });

  assert.equal(parsed.extension, ".srt");
  assert.equal(parsed.timestampMode, "timestamped");
  assert.equal(parsed.segments.length, 2);
  assert.equal(parsed.segments[0].startMs, 1250);
  assert.equal(parsed.segments[1].endMs, 8500);
  assert.match(parsed.segments[1].text, /continues across a second line/);
});

test("parses TXT and Markdown as paragraph-only sanitized text", () => {
  const text = `${longCue("Paragraph one")}\n\n<script>alert("x")</script>\n${longCue("Paragraph two")}`;
  const txt = parseTranscriptFile({
    filename: "sample.txt",
    contentType: "text/plain",
    bytes: bytes(text),
  });
  const md = parseTranscriptFile({
    filename: "sample.md",
    contentType: "text/markdown",
    bytes: bytes(`# Heading\n\n${longCue("Markdown paragraph one")}\n\n- ${longCue("Markdown paragraph two")}`),
  });

  assert.equal(txt.timestampMode, "paragraph_only");
  assert.equal(txt.segments.length, 2);
  assert.equal(txt.segments[0].startMs, null);
  assert.equal(txt.normalizedText.includes("<script>"), false);

  assert.equal(md.timestampMode, "paragraph_only");
  assert.equal(md.segments.length, 3);
  assert.match(md.normalizedText, /# Heading/);
});

test("rejects unsupported extension or content type", () => {
  assert.throws(
    () =>
      parseTranscriptFile({
        filename: "sample.html",
        contentType: "text/plain",
        bytes: bytes(longCue("Unsupported extension")),
      }),
    (err) =>
      err instanceof TranscriptFileParseError &&
      err.code === "unsupported_transcript_file",
  );

  assert.throws(
    () =>
      parseTranscriptFile({
        filename: "sample.vtt",
        contentType: "text/html",
        bytes: bytes(longCue("Unsupported content type")),
      }),
    (err) =>
      err instanceof TranscriptFileParseError &&
      err.code === "unsupported_transcript_file",
  );
});
