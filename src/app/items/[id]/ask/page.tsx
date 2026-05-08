import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskClient } from "@/app/ask/ask-client";
import { getItem } from "@/db/items";

/**
 * /items/[id]/ask — per-item chat (v0.4.0 T-13 / ASK-3).
 *
 * Reuses AskClient; passes itemId to scope retrieval to this one item.
 */
export default async function ItemAskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = getItem(id);
  if (!item) notFound();

  return (
    <div className="mx-auto flex h-[calc(100vh-48px)] max-w-[760px] flex-col px-6 py-8">
      <Link
        href={`/items/${item.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to item
      </Link>
      <h1 className="mb-1 text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
        Ask this item
      </h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">{item.title}</p>
      <AskClient itemId={item.id} />
    </div>
  );
}
