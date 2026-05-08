"use client";

import { useState } from "react";
import { AskInput } from "@/components/ask-input";
import { ChatMessage } from "@/components/chat-message";
import { useAskStream, type AskRetrievedChunk } from "@/lib/client/use-ask-stream";

interface Turn {
  id: string;
  question: string;
  answer: string;
  chunks: AskRetrievedChunk[];
  errorCode?: string;
  errorMessage?: string;
}

export function AskClient() {
  const stream = useAskStream();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const submit = async (question: string) => {
    const id = crypto.randomUUID();
    setPendingId(id);
    setTurns((prev) => [
      ...prev,
      { id, question, answer: "", chunks: [] },
    ]);
    await stream.ask({ question });
    // Finalize turn once stream resolves (done or error).
    setTurns((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              answer: stream.answer,
              chunks: stream.chunks,
              errorCode: stream.errorCode ?? undefined,
              errorMessage: stream.errorMessage ?? undefined,
            }
          : t,
      ),
    );
    setPendingId(null);
  };

  const busy = stream.phase === "connecting" || stream.phase === "retrieving" || stream.phase === "streaming";

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {turns.length === 0 && stream.phase === "idle" && (
          <p className="text-sm text-[var(--text-muted)]">
            Ask a question and I&apos;ll search your library for the answer.
          </p>
        )}

        {turns.map((t, idx) => {
          const isLast = idx === turns.length - 1;
          const answer = isLast && pendingId === t.id ? stream.answer : t.answer;
          const chunks = isLast && pendingId === t.id ? stream.chunks : t.chunks;
          const errCode = isLast && pendingId === t.id ? stream.errorCode : t.errorCode;
          const errMsg = isLast && pendingId === t.id ? stream.errorMessage : t.errorMessage;
          return (
            <div key={t.id} className="space-y-2">
              <ChatMessage role="user" content={t.question} />
              {errCode ? (
                <div className="mr-10 rounded-lg border border-[var(--danger)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wider">
                    Error · {errCode}
                  </div>
                  <p>{errMsg}</p>
                </div>
              ) : (
                <ChatMessage role="assistant" content={answer} chunks={chunks} />
              )}
            </div>
          );
        })}
      </div>

      <AskInput
        onSubmit={submit}
        onStop={stream.stop}
        busy={busy}
        autoFocus
      />
    </>
  );
}
