import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AskClient } from "@/app/ask/ask-client";
import { getItem } from "@/db/items";
import {
  listItemAskHistory,
  loadItemThreadMessages,
} from "@/lib/ask/history";
import { buildAskScopeInfo } from "@/lib/ask/scope";
import { verifySessionCookie } from "@/lib/auth";

/**
 * /items/[id]/ask — per-item chat (v0.4.0 T-13 / ASK-3).
 *
 * Reuses AskClient; passes itemId to scope retrieval to this one item.
 */
export default async function ItemAskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ thread?: string }>;
}) {
  const { id } = await params;
  const { thread } = await searchParams;
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    const query = thread ? `?thread=${encodeURIComponent(thread)}` : "";
    redirect(`/unlock?next=${encodeURIComponent(`/items/${id}/ask${query}`)}`);
  }

  const item = getItem(id);
  if (!item) notFound();
  const restoredThread = loadItemThreadMessages(thread, item.id);

  return (
    <div className="mx-auto flex h-[calc(100svh-48px)] max-w-[1040px] flex-col px-5 pb-24 pt-6 md:px-6 md:py-8 md:pb-8">
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
      <p className="mb-5 break-words text-sm text-[var(--text-secondary)]">
        {item.title}
      </p>
      <AskClient
        itemId={item.id}
        scopeInfo={buildAskScopeInfo({
          kind: "item",
          label: "this item",
          items: [item],
        })}
        durableScope={{ scope: "item", itemId: item.id }}
        threadId={restoredThread?.thread.id}
        initialMessages={restoredThread?.messages}
        historyThreads={listItemAskHistory(item.id, restoredThread?.thread.id)}
      />
    </div>
  );
}
