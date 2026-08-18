"use client";

import { useEffect, useState, useCallback } from "react";

export interface UseKeyboardTriageOptions<T> {
  items: T[];
  getId: (item: T) => string;
  onToggleSelect: (id: string, shiftKey?: boolean) => void;
  onArchive?: (selectedIds: string[]) => void;
  onSynthesize?: (selectedIds: string[]) => void;
  onQuickPeek?: (item: T) => void;
  onClearSelection?: () => void;
  selectedIds: Set<string>;
  enabled?: boolean;
}

export interface UseKeyboardTriageResult {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  focusedId: string | null;
}

export function useKeyboardTriage<T>({
  items,
  getId,
  onToggleSelect,
  onArchive,
  onSynthesize,
  onQuickPeek,
  onClearSelection,
  selectedIds,
  enabled = true,
}: UseKeyboardTriageOptions<T>): UseKeyboardTriageResult {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const focusedId = items[focusedIndex] ? getId(items[focusedIndex]) : null;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore when typing inside input / textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const total = items.length;
      if (total === 0) return;

      switch (e.key) {
        // J -> Next item
        case "j":
        case "J": {
          e.preventDefault();
          const next = Math.min(total - 1, focusedIndex + 1);
          setFocusedIndex(next);
          if (e.shiftKey && items[next]) {
            onToggleSelect(getId(items[next]), true);
          }
          break;
        }

        // K -> Prev item
        case "k":
        case "K": {
          e.preventDefault();
          const prev = Math.max(0, focusedIndex - 1);
          setFocusedIndex(prev);
          if (e.shiftKey && items[prev]) {
            onToggleSelect(getId(items[prev]), true);
          }
          break;
        }

        // X -> Toggle selection of focused item
        case "x":
        case "X": {
          e.preventDefault();
          if (items[focusedIndex]) {
            onToggleSelect(getId(items[focusedIndex]), e.shiftKey);
          }
          break;
        }

        // Space -> Quick peek
        case " ": {
          e.preventDefault();
          if (items[focusedIndex] && onQuickPeek) {
            onQuickPeek(items[focusedIndex]);
          }
          break;
        }

        // E -> Batch Archive
        case "e":
        case "E": {
          if (selectedIds.size > 0 && onArchive) {
            e.preventDefault();
            onArchive(Array.from(selectedIds));
          }
          break;
        }

        // A -> Batch Synthesize / ASR
        case "a":
        case "A": {
          if (selectedIds.size > 0 && onSynthesize) {
            e.preventDefault();
            onSynthesize(Array.from(selectedIds));
          }
          break;
        }

        // Escape -> Clear selection
        case "Escape": {
          if (selectedIds.size > 0 && onClearSelection) {
            e.preventDefault();
            onClearSelection();
          }
          break;
        }

        default:
          break;
      }
    },
    [
      enabled,
      items,
      getId,
      focusedIndex,
      onToggleSelect,
      onArchive,
      onSynthesize,
      onQuickPeek,
      onClearSelection,
      selectedIds,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    focusedIndex,
    setFocusedIndex,
    focusedId,
  };
}
