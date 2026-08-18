"use client";

import { useState, useCallback, useMemo } from "react";

export interface UseRangeSelectionOptions<T> {
  items: T[];
  getId: (item: T) => string;
  initialSelectedIds?: string[];
}

export interface UseRangeSelectionResult {
  selectedIds: Set<string>;
  selectedCount: number;
  lastSelectedId: string | null;
  isSelected: (id: string) => boolean;
  toggleItem: (id: string, shiftKey?: boolean) => void;
  selectSingle: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  selectedItems: string[];
}

export function useRangeSelection<T>({
  items,
  getId,
  initialSelectedIds = [],
}: UseRangeSelectionOptions<T>): UseRangeSelectionResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSelectedIds),
  );
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(
    initialSelectedIds[initialSelectedIds.length - 1] ?? null,
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  const toggleItem = useCallback(
    (id: string, shiftKey = false) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);

        if (shiftKey && lastSelectedId) {
          const itemIds = items.map(getId);
          const anchorIdx = itemIds.indexOf(lastSelectedId);
          const targetIdx = itemIds.indexOf(id);

          if (anchorIdx !== -1 && targetIdx !== -1) {
            const start = Math.min(anchorIdx, targetIdx);
            const end = Math.max(anchorIdx, targetIdx);

            for (let i = start; i <= end; i++) {
              next.add(itemIds[i]);
            }
            return next;
          }
        }

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });

      setLastSelectedId(id);
    },
    [items, getId, lastSelectedId],
  );

  const selectSingle = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
    setLastSelectedId(id);
  }, []);

  const selectAll = useCallback(() => {
    const allIds = items.map(getId);
    setSelectedIds(new Set(allIds));
  }, [items, getId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const selectedCount = selectedIds.size;
  const isAllSelected = items.length > 0 && selectedCount === items.length;
  const isIndeterminate = selectedCount > 0 && selectedCount < items.length;

  const selectedItems = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedCount,
    lastSelectedId,
    isSelected,
    toggleItem,
    selectSingle,
    selectAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,
    selectedItems,
  };
}
