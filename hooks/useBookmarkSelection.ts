import { useState, useCallback, useMemo } from "react";

export interface SelectionState {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  selectAll: (visibleIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
}

/**
 * Hook for managing bookmark selection state for bulk actions.
 * Uses a Set to track selected IDs for O(1) lookups.
 *
 * @example
 * const { selectedIds, toggle, selectAll, clearSelection, isSelected, selectedCount } = useBookmarkSelection()
 */
export function useBookmarkSelection(): SelectionState {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((visibleIds: string[]) => {
    setSelectedIds(new Set(visibleIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const value = useMemo(
    () => ({
      selectedIds,
      toggle,
      selectAll,
      clearSelection,
      isSelected,
      selectedCount: selectedIds.size,
    }),
    [selectedIds, toggle, selectAll, clearSelection, isSelected]
  );

  return value;
}
