import Link from "next/link";
import { FileText, Globe, StickyNote } from "lucide-react";
import type { RelatedItem } from "@/lib/related";

interface RelatedItemsProps {
  items: RelatedItem[];
}

function iconFor(type: string) {
  if (type === "pdf") return FileText;
  if (type === "url") return Globe;
  return StickyNote;
}

/**
 * Sidebar panel listing semantically-related items (T-15, EXP-3).
 * Server component; receives already-resolved RelatedItem[].
 * Renders nothing when the list is empty (no embedded chunks / new corpus).
 */
export function RelatedItems({ items }: RelatedItemsProps) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        Related
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((r) => {
          const Icon = iconFor(r.item.source_type);
          return (
            <li key={r.item.id}>
              <Link
                href={`/items/${r.item.id}`}
                className="flex items-start gap-2 rounded-md p-2 -mx-2 hover:bg-[var(--surface-raised)]"
                title={`similarity ${r.similarity.toFixed(3)}`}
              >
                <span className="mt-0.5 shrink-0 text-[var(--text-muted)]">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--text-primary)]">
                    {r.item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {(r.similarity * 100).toFixed(0)}% match
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
