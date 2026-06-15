import { AskClient } from "./ask-client";
import Link from "next/link";
import {
  countItemsInCollection,
  getCollection,
  listItemsInCollection,
} from "@/db/collections";
import {
  countItems,
  countNeedsUpgradeItems,
  getItemsByIds,
  listItems,
} from "@/db/items";
import { countItemsForTopic, getTopicBySlug, listItemsForTopic } from "@/db/topics";
import {
  listLibraryAskHistory,
  loadLibraryThreadMessages,
} from "@/lib/ask/history";
import { buildAskScopeInfo } from "@/lib/ask/scope";

/**
 * /ask — RAG chat page (v0.4.0 T-11).
 *
 * Single-exchange UX: ask a question, see the streamed answer + retrieved
 * chunks. Thread history + per-item scope ship in T-13. Auth gate is the
 * same session cookie check that all app routes rely on; the middleware
 * handles redirect for unauth'd users (see src/proxy.ts).
 */
function parseSelectedIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ).slice(0, 50);
}

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; ids?: string; tag?: string; topic?: string; collection?: string; thread?: string }>;
}) {
  const { scope, ids, tag, topic: topicSlug, collection: collectionId, thread } = await searchParams;
  const restoredThread = !scope || scope === "library"
    ? loadLibraryThreadMessages(thread)
    : null;
  const selectedItems = scope === "selected" ? getItemsByIds(parseSelectedIds(ids)) : [];
  const tagItems = scope === "tag" && tag ? listItems({ tag, limit: 50 }) : [];
  const tagCount = scope === "tag" && tag ? countItems({ tag }) : 0;
  const topic = scope === "topic" && topicSlug ? getTopicBySlug(topicSlug) : null;
  const topicItems = topic ? listItemsForTopic(topic.id, 50) : [];
  const topicCount = topic ? countItemsForTopic(topic.id) : 0;
  const collection =
    scope === "collection" && collectionId ? getCollection(collectionId) : null;
  const collectionItems = collection ? listItemsInCollection(collection.id).slice(0, 50) : [];
  const collectionCount = collection ? countItemsInCollection(collection.id) : 0;
  const scopedItems =
    scope === "topic"
      ? topicItems
      : scope === "collection"
        ? collectionItems
        : scope === "tag"
          ? tagItems
          : selectedItems;
  const selectedScopeLabel =
    selectedItems.length === 1
      ? "1 selected source"
      : selectedItems.length > 1
        ? `${selectedItems.length} selected sources`
        : null;
  const hasMissingScope =
    (scope === "selected" && selectedItems.length === 0) ||
    (scope === "tag" && (!tag || tagItems.length === 0)) ||
    (scope === "topic" && (!topic || topicItems.length === 0)) ||
    (scope === "collection" && (!collection || collectionItems.length === 0));
  const title =
    scope === "collection" && collection
      ? `Ask ${collection.name}`
      : scope === "topic" && topic
        ? `Ask ${topic.name}`
        : scope === "tag" && tag
          ? `Ask ${tag}`
          : selectedScopeLabel
            ? "Ask selected"
            : "Ask";
  const scopeInfo =
    scope === "collection" && collection
      ? buildAskScopeInfo({
          kind: "collection",
          label: `the ${collection.name} collection`,
          items: collectionItems,
          sourceCount: collectionCount,
        })
      : scope === "topic" && topic
        ? buildAskScopeInfo({
            kind: "topic",
            label: `the ${topic.name} topic`,
            items: topicItems,
            sourceCount: topicCount,
          })
        : scope === "tag" && tag
          ? buildAskScopeInfo({
              kind: "tag",
              label: `the ${tag} tag`,
              items: tagItems,
              sourceCount: tagCount,
            })
          : scope === "selected"
            ? buildAskScopeInfo({
                kind: "selected",
                label: selectedScopeLabel ?? "selected sources",
                items: selectedItems,
              })
            : buildAskScopeInfo({
                kind: "library",
                label: "all saved sources",
                sourceCount: countItems(),
                limitedCount: countNeedsUpgradeItems(),
              });

  // The mobile bottom-nav (Sidebar mobile branch) is fixed at z-40 and ~60px
  // tall including safe-area. The Ask input sits at the bottom of this flex
  // column; without pb-20 on mobile its send button would be visually covered
  // and tap-blocked by the nav.
  return (
    <div className="mx-auto flex h-[calc(100vh-48px)] max-w-[1040px] flex-col px-6 py-8 pb-20 md:pb-8">
      <h1 className="mb-6 text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
        {title}
      </h1>
      {hasMissingScope ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          <p>
            {scope === "collection"
              ? "This collection has no available sources."
              : scope === "topic"
                ? "This topic has no available sources."
                : scope === "tag"
                  ? "This tag has no available sources."
                  : "The selected sources could not be found."}
          </p>
          <Link
            href="/library"
            className="mt-3 inline-flex h-8 items-center rounded-md bg-[var(--accent-9)] px-3 text-sm font-medium text-[var(--on-accent)] hover:bg-[var(--accent-10)]"
          >
            Back to Library
          </Link>
        </div>
      ) : (
        <AskClient
          itemIds={scopedItems.map((item) => item.id)}
          scopeInfo={scopeInfo}
          durableScope={!scope || scope === "library" ? { scope: "library" } : undefined}
          threadId={restoredThread?.thread.id}
          initialMessages={restoredThread?.messages}
          historyThreads={listLibraryAskHistory(restoredThread?.thread.id)}
        />
      )}
    </div>
  );
}
