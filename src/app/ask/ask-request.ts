import type { AskRequestBody } from "@/lib/client/use-ask-stream";

export interface BuildAskRequestBodyInput {
  question: string;
  itemId?: string;
  itemIds?: string[];
  threadId?: string | null;
}

export function buildAskRequestBody({
  question,
  itemId,
  itemIds,
  threadId,
}: BuildAskRequestBodyInput): AskRequestBody {
  const body: AskRequestBody = { question };
  if (threadId) body.thread_id = threadId;

  const selectedIds = Array.from(new Set(itemIds?.filter(Boolean) ?? []));
  if (selectedIds.length > 0) {
    return {
      ...body,
      scope: "items",
      item_ids: selectedIds,
    };
  }

  if (itemId) {
    return {
      ...body,
      scope: "item",
      item_id: itemId,
    };
  }

  return body;
}
