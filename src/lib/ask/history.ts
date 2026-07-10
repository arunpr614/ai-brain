import {
  getThread,
  listMessages,
  listThreads,
  type ChatMessageRow,
  type ChatThreadRow,
} from "@/db/chat";
import type {
  AskHistoryThread,
  AskInitialMessage,
} from "@/app/ask/ask-client";
import type { AskRetrievedChunk } from "@/lib/client/use-ask-stream";

function threadTitle(thread: ChatThreadRow): string {
  return thread.title?.trim() || "Untitled chat";
}

function parseCitations(raw: string | null): AskRetrievedChunk[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((chunk): chunk is AskRetrievedChunk => {
      return (
        typeof chunk === "object" &&
        chunk !== null &&
        typeof chunk.chunk_id === "string" &&
        typeof chunk.item_id === "string" &&
        typeof chunk.item_title === "string" &&
        typeof chunk.similarity === "number"
      );
    });
  } catch {
    return [];
  }
}

function toInitialMessage(message: ChatMessageRow): AskInitialMessage | null {
  if (message.role !== "user" && message.role !== "assistant") return null;
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    chunks: parseCitations(message.citations),
  };
}

export function listLibraryAskHistory(activeThreadId?: string | null): AskHistoryThread[] {
  return listThreads({ scope: "library" }).map((thread) => ({
    id: thread.id,
    title: threadTitle(thread),
    href: `/ask?thread=${thread.id}`,
    updatedAt: thread.updated_at,
    active: thread.id === activeThreadId,
  }));
}

export function listItemAskHistory(
  itemId: string,
  activeThreadId?: string | null,
): AskHistoryThread[] {
  return listThreads({ item_id: itemId }).map((thread) => ({
    id: thread.id,
    title: threadTitle(thread),
    href: `/items/${itemId}/ask?thread=${thread.id}`,
    updatedAt: thread.updated_at,
    active: thread.id === activeThreadId,
  }));
}

export function loadLibraryThreadMessages(threadId?: string | null): {
  thread: ChatThreadRow;
  messages: AskInitialMessage[];
} | null {
  if (!threadId) return null;
  const thread = getThread(threadId);
  if (!thread || thread.scope !== "library") return null;
  return {
    thread,
    messages: listMessages(thread.id)
      .map(toInitialMessage)
      .filter((message): message is AskInitialMessage => Boolean(message)),
  };
}

export function loadItemThreadMessages(
  threadId: string | null | undefined,
  itemId: string,
): {
  thread: ChatThreadRow;
  messages: AskInitialMessage[];
} | null {
  if (!threadId) return null;
  const thread = getThread(threadId);
  if (!thread || thread.scope !== "item" || thread.item_id !== itemId) return null;
  return {
    thread,
    messages: listMessages(thread.id)
      .map(toInitialMessage)
      .filter((message): message is AskInitialMessage => Boolean(message)),
  };
}
