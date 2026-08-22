"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  parseViewModeFromUrl,
  resolveViewModePreference,
  serializeViewModeCookie,
  VIEW_MODE_EVENT,
  VIEW_MODE_STORAGE_KEY,
  type ViewMode,
} from "@/lib/view-mode";

interface ViewModeContextValue {
  viewMode: ViewMode;
  effectiveViewMode: "mobile" | "desktop";
  isOverridden: boolean;
  setViewMode: (mode: ViewMode) => void;
  resetToAuto: () => void;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

function getViewportWidthSnapshot(): number {
  if (typeof window === "undefined") return 1024;
  return window.innerWidth;
}

function subscribeViewportResize(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function createViewModeSnapshotGetter(initialMode: ViewMode) {
  return function getViewModeSnapshot(): ViewMode {
    if (typeof window === "undefined") return initialMode;
    const urlMode = parseViewModeFromUrl(window.location.search);
    if (urlMode) return urlMode;
    try {
      const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (stored) return resolveViewModePreference(stored);
    } catch {}
    return initialMode;
  };
}

function subscribeViewMode(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(VIEW_MODE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(VIEW_MODE_EVENT, callback);
  };
}

export function ViewModeProvider({
  children,
  initialMode = "auto",
}: {
  children: React.ReactNode;
  initialMode?: ViewMode;
}) {
  const getSnapshot = useMemo(() => createViewModeSnapshotGetter(initialMode), [initialMode]);
  const viewMode = useSyncExternalStore(
    subscribeViewMode,
    getSnapshot,
    () => initialMode
  );

  const viewportWidth = useSyncExternalStore(
    subscribeViewportResize,
    getViewportWidthSnapshot,
    () => 1024
  );

  const setViewMode = useCallback((mode: ViewMode) => {
    if (typeof document !== "undefined") {
      document.cookie = serializeViewModeCookie(mode);
      document.documentElement.setAttribute("data-view-mode", mode);
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
        window.dispatchEvent(new Event(VIEW_MODE_EVENT));
      } catch {}
    }
  }, []);

  const resetToAuto = useCallback(() => {
    setViewMode("auto");
  }, [setViewMode]);

  const effectiveViewMode: "mobile" | "desktop" = useMemo(() => {
    if (viewMode === "mobile") return "mobile";
    if (viewMode === "desktop") return "desktop";
    return viewportWidth < 768 ? "mobile" : "desktop";
  }, [viewMode, viewportWidth]);

  const isOverridden = useMemo(() => {
    if (viewMode === "auto") return false;
    const naturallyMobile = viewportWidth < 768;
    return (viewMode === "mobile" && !naturallyMobile) || (viewMode === "desktop" && naturallyMobile);
  }, [viewMode, viewportWidth]);

  const value = useMemo<ViewModeContextValue>(
    () => ({
      viewMode,
      effectiveViewMode,
      isOverridden,
      setViewMode,
      resetToAuto,
    }),
    [viewMode, effectiveViewMode, isOverridden, setViewMode, resetToAuto]
  );

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextValue {
  const context = useContext(ViewModeContext);
  if (!context) {
    return {
      viewMode: "auto",
      effectiveViewMode: "desktop",
      isOverridden: false,
      setViewMode: () => {},
      resetToAuto: () => {},
    };
  }
  return context;
}
