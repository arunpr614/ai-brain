"use client";

import { useEffect } from "react";

export interface AppendNoteTextPayload {
  itemId: string;
  text: string;
  timestampMs?: number;
}

export const NOTE_EVENT_APPEND_TEXT = "brain:append-note-text";

export function dispatchAppendNoteText(payload: AppendNoteTextPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AppendNoteTextPayload>(NOTE_EVENT_APPEND_TEXT, {
      detail: payload,
    }),
  );
}

export function useNoteEventListener(
  itemId: string,
  onAppendText: (payload: AppendNoteTextPayload) => void,
) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<AppendNoteTextPayload>;
      if (customEvent.detail && customEvent.detail.itemId === itemId) {
        onAppendText(customEvent.detail);
      }
    };

    window.addEventListener(NOTE_EVENT_APPEND_TEXT, handler);
    return () => window.removeEventListener(NOTE_EVENT_APPEND_TEXT, handler);
  }, [itemId, onAppendText]);
}
