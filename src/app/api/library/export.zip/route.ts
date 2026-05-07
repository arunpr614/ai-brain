import JSZip from "jszip";
import { NextResponse, type NextRequest } from "next/server";
import { type ItemRow } from "@/db/client";
import { listItems } from "@/db/items";
import { listTagsForItem } from "@/db/tags";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "item"
  );
}

function itemToMarkdown(item: ItemRow, tags: { name: string }[]): string {
  const lines: string[] = ["---"];
  lines.push(`title: ${yamlString(item.title)}`);
  lines.push(`source_type: ${item.source_type}`);
  if (item.source_url) lines.push(`source_url: ${item.source_url}`);
  if (item.author) lines.push(`author: ${yamlString(item.author)}`);
  lines.push(`captured: ${new Date(item.captured_at).toISOString()}`);
  lines.push(`brain_id: ${item.id}`);
  if (item.category) lines.push(`category: ${yamlString(item.category)}`);
  if (item.total_pages) lines.push(`total_pages: ${item.total_pages}`);
  if (tags.length > 0) {
    lines.push(`tags: [${tags.map((t) => yamlString(t.name)).join(", ")}]`);
  }
  if (item.extraction_warning) {
    lines.push(`extraction_warning: ${yamlString(item.extraction_warning)}`);
  }
  lines.push("---", "", `# ${item.title}`);
  if (item.summary) {
    lines.push("", "## Summary", "", item.summary);
  }
  lines.push("", "## Body", "", item.body);
  return lines.join("\n");
}

/**
 * Bulk library export — F-208.
 * Streams a zip of every item as a markdown file, grouped by source_type.
 */
export async function GET(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const items = listItems({ limit: 10_000 });
  const zip = new JSZip();
  const seen = new Map<string, number>(); // filename → count for dedupe

  for (const item of items) {
    const tags = listTagsForItem(item.id);
    const body = itemToMarkdown(item, tags);
    const base = slugify(item.title);
    const dir = item.source_type;
    // Dedupe: if two items slugify to the same name, suffix with a counter.
    const key = `${dir}/${base}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    const name = n === 1 ? `${base}.md` : `${base}-${n}.md`;
    zip.file(`${dir}/${name}`, body);
  }

  // Top-level README so the zip is self-describing when opened.
  zip.file(
    "README.md",
    `# AI Brain — Library export\n\nGenerated ${new Date().toISOString()}\n\n${items.length} item${items.length === 1 ? "" : "s"}, grouped by source type.\n\nEach \`.md\` file has YAML frontmatter compatible with Obsidian.\n`,
  );

  const buf = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new NextResponse(new Blob([new Uint8Array(buf)], { type: "application/zip" }), {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="ai-brain-library-${new Date()
        .toISOString()
        .slice(0, 10)}.zip"`,
      "cache-control": "no-store",
    },
  });
}
