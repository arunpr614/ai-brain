export interface AskStateMessage {
  id: string;
  role: string;
  content: string;
}

export function buildAskClientStateKey(
  threadId: string | null | undefined,
  messages: readonly AskStateMessage[] = [],
): string {
  return JSON.stringify({
    threadId: threadId ?? null,
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    })),
  });
}
