/**
 * useAskStream — client-side hook for /api/ask SSE consumption (T-11).
 *
 * Parses `data: <json>\n\n` frames, dispatches into typed callbacks for
 * retrieve / token / citation / done / error. Owns an AbortController so
 * the caller's Stop button can interrupt mid-stream without tearing down
 * the whole React tree.
 *
 * Intentional simplifications:
 * - No automatic retry on error; caller re-submits if the user wants.
 * - No keep-alive ping; personal-LAN use + Next dev server are fine.
 */
"use client";

import { useCallback, useRef, useState } from "react";

export interface AskRetrievedChunk {
  chunk_id: string;
  item_id: string;
  item_title: string;
  similarity: number;
}

export type AskPhase = "idle" | "connecting" | "retrieving" | "streaming" | "done" | "error";

export interface UseAskStreamResult {
  phase: AskPhase;
  answer: string;
  chunks: AskRetrievedChunk[];
  errorCode: string | null;
  errorMessage: string | null;
  ask: (body: AskRequestBody) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export interface AskRequestBody {
  question: string;
  scope?: "library" | "item";
  item_id?: string;
  thread_id?: string;
  top_k?: number;
  min_similarity?: number;
}

type Frame =
  | { type: "retrieve"; chunks: AskRetrievedChunk[] }
  | { type: "token"; text: string }
  | { type: "citation"; chunk_id: string }
  | { type: "done" }
  | { type: "error"; code: string; message: string };

export function useAskStream(): UseAskStreamResult {
  const [phase, setPhase] = useState<AskPhase>("idle");
  const [answer, setAnswer] = useState("");
  const [chunks, setChunks] = useState<AskRetrievedChunk[]>([]);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPhase("idle");
    setAnswer("");
    setChunks([]);
    setErrorCode(null);
    setErrorMessage(null);
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const ask = useCallback(async (body: AskRequestBody) => {
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    setPhase("connecting");
    setAnswer("");
    setChunks([]);
    setErrorCode(null);
    setErrorMessage(null);

    let res: Response;
    try {
      res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setPhase("idle");
        return;
      }
      setErrorCode("NETWORK");
      setErrorMessage((err as Error).message);
      setPhase("error");
      return;
    }

    if (!res.body) {
      setErrorCode("NO_BODY");
      setErrorMessage("Response had no body");
      setPhase("error");
      return;
    }

    // Even on 4xx/5xx, the body is an SSE error frame — parse it the same way.
    setPhase("retrieving");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, sep).trim();
          buffer = buffer.slice(sep + 2);
          if (!raw.startsWith("data:")) continue;
          const json = raw.slice(raw.indexOf(":") + 1).trim();
          let frame: Frame;
          try {
            frame = JSON.parse(json) as Frame;
          } catch {
            continue;
          }
          if (frame.type === "retrieve") {
            setChunks(frame.chunks);
            setPhase("streaming");
          } else if (frame.type === "token") {
            setAnswer((prev) => prev + frame.text);
          } else if (frame.type === "citation") {
            // Citations arrive inline as [CITE:id] inside token text today;
            // a dedicated citation frame is reserved for v0.4.x.
          } else if (frame.type === "done") {
            setPhase("done");
          } else if (frame.type === "error") {
            setErrorCode(frame.code);
            setErrorMessage(frame.message);
            setPhase("error");
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setPhase("idle");
        return;
      }
      setErrorCode("STREAM_READ");
      setErrorMessage((err as Error).message);
      setPhase("error");
    } finally {
      reader.releaseLock();
    }
  }, []);

  return { phase, answer, chunks, errorCode, errorMessage, ask, stop, reset };
}
