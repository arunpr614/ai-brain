import type { CaptureQuality } from "./types";

export interface YoutubeBodyInput {
  title: string;
  channel: string | null;
  publishedAt: number | null;
  durationSeconds: number | null;
  sourceUrl: string;
  description: string | null;
  transcript: string | null;
  captureQuality: CaptureQuality;
}

export function buildYoutubeBody(input: YoutubeBodyInput): string {
  const lines: string[] = [
    `Title: ${input.title}`,
    `Channel: ${input.channel ?? "Unknown"}`,
  ];
  if (input.publishedAt) {
    lines.push(`Published: ${new Date(input.publishedAt).toISOString()}`);
  }
  if (input.durationSeconds !== null) {
    lines.push(`Duration: ${formatDuration(input.durationSeconds)}`);
  }
  lines.push(`URL: ${input.sourceUrl}`);
  lines.push(`Capture quality: ${input.captureQuality}`);

  const sections = [lines.join("\n")];
  const description = input.description?.trim();
  if (description) {
    sections.push(`Description:\n${description}`);
    const chapters = extractChapters(description);
    if (chapters.length > 0) {
      sections.push(`Chapters:\n${chapters.join("\n")}`);
    }
  }

  sections.push(
    input.transcript?.trim()
      ? `Transcript:\n${input.transcript.trim()}`
      : "Transcript:\n[No transcript available for this video]",
  );

  return sections.join("\n\n");
}

export function extractChapters(description: string): string[] {
  return description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(?:\d{1,2}:)?\d{1,2}:\d{2}\s+\S/.test(line))
    .slice(0, 100);
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
