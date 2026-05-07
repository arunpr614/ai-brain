import { NextResponse, type NextRequest } from "next/server";
import { getItem } from "@/db/items";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Markdown export (F-105). Emits Obsidian-compatible YAML frontmatter + body.
 * URL: /api/items/[id]/export.md
 *
 * v0.10.0 Obsidian sync will reuse this exact format when writing files
 * into the vault folder. Keep the frontmatter keys stable.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  const item = getItem(id);
  if (!item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const captured = new Date(item.captured_at).toISOString();
  const lines: string[] = ["---"];
  lines.push(`title: ${yamlString(item.title)}`);
  lines.push(`source_type: ${item.source_type}`);
  if (item.source_url) lines.push(`source_url: ${item.source_url}`);
  if (item.author) lines.push(`author: ${yamlString(item.author)}`);
  lines.push(`captured: ${captured}`);
  lines.push(`brain_id: ${item.id}`);
  if (item.total_pages) lines.push(`total_pages: ${item.total_pages}`);
  if (item.extraction_warning)
    lines.push(`extraction_warning: ${yamlString(item.extraction_warning)}`);
  lines.push("---", "", `# ${item.title}`, "", item.body);
  const md = lines.join("\n");

  return new NextResponse(md, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${slugify(item.title)}.md"`,
    },
  });
}

function yamlString(value: string): string {
  // Safe scalar quoting: double-quote + escape backslash and double-quote.
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
