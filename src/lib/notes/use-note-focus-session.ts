"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  addNoteFocusToUrl,
  hasOwnedNoteFocusState,
  isNoteFocusRequested,
  mergeNoteFocusState,
  removeNoteFocusFromState,
  removeNoteFocusFromUrl,
} from "./focus-history";
import { isolateForNoteFocus } from "./focus-isolation";

interface FocusSnapshot {
  activeElement: HTMLElement | null;
  pageX: number;
  pageY: number;
  textareaWasActive: boolean;
  selectionStart: number | null;
  selectionEnd: number | null;
  selectionDirection: "forward" | "backward" | "none" | null;
  textareaScrollTop: number;
  textareaScrollLeft: number;
}

export interface NoteFocusTextareaView {
  wasActive: boolean;
  selectionStart: number | null;
  selectionEnd: number | null;
  selectionDirection: "forward" | "backward" | "none" | null;
  scrollTop: number;
  scrollLeft: number;
}

export function readNoteFocusTextareaView(
  textarea: HTMLTextAreaElement | null,
  activeElement: Element | null,
): NoteFocusTextareaView {
  return {
    wasActive: activeElement === textarea,
    selectionStart: textarea?.selectionStart ?? null,
    selectionEnd: textarea?.selectionEnd ?? null,
    selectionDirection: textarea?.selectionDirection ?? null,
    scrollTop: textarea?.scrollTop ?? 0,
    scrollLeft: textarea?.scrollLeft ?? 0,
  };
}

interface NoteFocusSessionOptions {
  enabled: boolean;
  ready: boolean;
  surfaceRef: RefObject<HTMLElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  headingRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

function newFocusToken(): string {
  const words = new Uint32Array(4);
  crypto.getRandomValues(words);
  return Array.from(words, (word) => word.toString(16).padStart(8, "0")).join("");
}

function currentUrl(): URL {
  return new URL(window.location.href);
}

export function useNoteFocusSession({
  enabled,
  ready,
  surfaceRef,
  textareaRef,
  headingRef,
  triggerRef,
}: NoteFocusSessionOptions) {
  const [isFocused, setIsFocused] = useState(false);
  const focusedRef = useRef(false);
  const tokenRef = useRef<string | null>(null);
  const ownsHistoryRef = useRef(false);
  const snapshotRef = useRef<FocusSnapshot | null>(null);
  const initialIntentHandledRef = useRef(false);

  useEffect(() => {
    focusedRef.current = isFocused;
  }, [isFocused]);

  const captureSnapshot = useCallback(() => {
    const textarea = textareaRef.current;
    const active = document.activeElement;
    const view = readNoteFocusTextareaView(textarea, active);
    snapshotRef.current = {
      activeElement: active instanceof window.HTMLElement ? active : null,
      pageX: window.scrollX,
      pageY: window.scrollY,
      textareaWasActive: view.wasActive,
      selectionStart: view.selectionStart,
      selectionEnd: view.selectionEnd,
      selectionDirection: view.selectionDirection,
      textareaScrollTop: view.scrollTop,
      textareaScrollLeft: view.scrollLeft,
    };
  }, [textareaRef]);

  const activate = useCallback(
    (owned: boolean) => {
      if (!enabled || focusedRef.current) return;
      captureSnapshot();
      ownsHistoryRef.current = owned;
      focusedRef.current = true;
      setIsFocused(true);
    },
    [captureSnapshot, enabled],
  );

  const enterFocus = useCallback(
    (trigger: HTMLElement | null) => {
      if (!enabled || focusedRef.current) return;
      const token = newFocusToken();
      tokenRef.current = token;
      activate(true);
      if (snapshotRef.current && trigger) snapshotRef.current.activeElement = trigger;
      const nextUrl = addNoteFocusToUrl(currentUrl());
      window.history.pushState(
        mergeNoteFocusState(window.history.state, token),
        "",
        nextUrl.href,
      );
    },
    [activate, enabled],
  );

  const exitFocus = useCallback(
    (reason: "button" | "escape" | "history") => {
      void reason;
      if (!focusedRef.current) return;
      focusedRef.current = false;
      setIsFocused(false);
      const token = tokenRef.current;
      if (
        ownsHistoryRef.current &&
        token &&
        hasOwnedNoteFocusState(window.history.state, token)
      ) {
        ownsHistoryRef.current = false;
        window.history.back();
        return;
      }
      ownsHistoryRef.current = false;
      const normalUrl = removeNoteFocusFromUrl(currentUrl());
      window.history.replaceState(
        removeNoteFocusFromState(window.history.state),
        "",
        normalUrl.href,
      );
    },
    [],
  );

  useEffect(() => {
    if (!ready || initialIntentHandledRef.current) return;
    initialIntentHandledRef.current = true;
    const url = currentUrl();
    const requested = enabled && isNoteFocusRequested(url);
    if (!requested && url.searchParams.has("note_mode")) {
      window.history.replaceState(
        removeNoteFocusFromState(window.history.state),
        "",
        removeNoteFocusFromUrl(url).href,
      );
    }
    if (requested) activate(false);
  }, [activate, enabled, ready]);

  useEffect(() => {
    const onPopState = () => {
      const url = currentUrl();
      const requested = enabled && isNoteFocusRequested(url);
      if (!requested && url.searchParams.has("note_mode")) {
        window.history.replaceState(
          removeNoteFocusFromState(window.history.state),
          "",
          removeNoteFocusFromUrl(url).href,
        );
      }
      if (requested && !focusedRef.current) {
        ownsHistoryRef.current = Boolean(
          tokenRef.current && hasOwnedNoteFocusState(window.history.state, tokenRef.current),
        );
        activate(ownsHistoryRef.current);
      } else if (!requested && focusedRef.current) {
        ownsHistoryRef.current = false;
        focusedRef.current = false;
        setIsFocused(false);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [activate, enabled]);

  useLayoutEffect(() => {
    if (!isFocused || !surfaceRef.current) return;
    const cleanupIsolation = isolateForNoteFocus(surfaceRef.current);
    const snapshot = snapshotRef.current;
    const entryFrame = window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (snapshot?.textareaWasActive && textarea) {
        textarea.focus({ preventScroll: true });
        if (snapshot.selectionStart !== null && snapshot.selectionEnd !== null) {
          textarea.setSelectionRange(
            snapshot.selectionStart,
            snapshot.selectionEnd,
            snapshot.selectionDirection ?? undefined,
          );
        }
        textarea.scrollTop = snapshot.textareaScrollTop;
        textarea.scrollLeft = snapshot.textareaScrollLeft;
      } else {
        headingRef.current?.focus({ preventScroll: true });
      }
    });

    return () => {
      window.cancelAnimationFrame(entryFrame);
      const exitView = readNoteFocusTextareaView(textareaRef.current, document.activeElement);
      cleanupIsolation();
      window.requestAnimationFrame(() => {
        try {
          window.scrollTo(snapshot?.pageX ?? 0, snapshot?.pageY ?? 0);
        } catch {
          // Some test/browser shells do not implement scrolling.
        }
        // The current node is intentional: it is the post-exit React tree, not the entry snapshot.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const textarea = textareaRef.current;
        if (textarea) {
          if (exitView.selectionStart !== null && exitView.selectionEnd !== null) {
            textarea.setSelectionRange(
              exitView.selectionStart,
              exitView.selectionEnd,
              exitView.selectionDirection ?? undefined,
            );
          }
          textarea.scrollTop = exitView.scrollTop;
          textarea.scrollLeft = exitView.scrollLeft;
        }
        if (exitView.wasActive && textarea) {
          textarea.focus({ preventScroll: true });
        } else if (triggerRef.current) {
          // eslint-disable-next-line react-hooks/exhaustive-deps
          triggerRef.current.focus({ preventScroll: true });
        } else if (snapshot?.activeElement?.isConnected) {
          snapshot.activeElement.focus({ preventScroll: true });
        } else {
          // eslint-disable-next-line react-hooks/exhaustive-deps
          headingRef.current?.focus({ preventScroll: true });
        }
      });
    };
  }, [headingRef, isFocused, surfaceRef, textareaRef, triggerRef]);

  return { isFocused, enterFocus, exitFocus };
}
