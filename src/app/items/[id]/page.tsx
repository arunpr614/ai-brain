import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteItemAction } from "@/app/actions";
import { getItem } from "@/db/items";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = getItem(id);
  if (!item) notFound();

  const captured = new Date(item.captured_at).toLocaleString();

  return (
    <div className="mx-auto max-w-[68ch] px-8 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Library
      </Link>

      <article className="article">
        <header className="mb-6 border-b border-[var(--border)] pb-5">
          <h1 className="font-sans text-[28px] font-semibold leading-[1.3] tracking-[-0.01em] text-[var(--text-primary)]">
            {item.title}
          </h1>
          <p className="mt-2 font-sans text-xs text-[var(--text-secondary)]">
            <span className="uppercase tracking-wide">{item.source_type}</span>
            <span className="mx-2 text-[var(--text-muted)]">·</span>
            <span>captured {captured}</span>
            {item.total_chars && (
              <>
                <span className="mx-2 text-[var(--text-muted)]">·</span>
                <span>{item.total_chars.toLocaleString()} chars</span>
              </>
            )}
          </p>
        </header>

        <div className="whitespace-pre-wrap">{item.body}</div>
      </article>

      <footer className="mt-12 border-t border-[var(--border)] pt-6">
        <form
          action={async () => {
            "use server";
            await deleteItemAction(item.id);
          }}
        >
          <button
            type="submit"
            className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm font-medium text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--surface)]"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            Delete
          </button>
        </form>
      </footer>
    </div>
  );
}
