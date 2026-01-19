import { useCallback } from "react";

export interface UseComprehensiveClearFiltersProps {
  onClearSearch: () => void;
  onClearTag: () => void;
  onResetSort: () => void;
}

export interface ComprehensiveClearFiltersReturn {
  clearAllFilters: () => void;
}

/**
 * Hook to clear all filters (search, tag, and sort) at once.
 * Simple composition pattern that executes all callbacks in sequence.
 *
 * @example
 * const { clearAllFilters } = useComprehensiveClearFilters({
 *   onClearSearch: () => setSearchQuery(''),
 *   onClearTag: () => setSelectedTag('all'),
 *   onResetSort: () => setSortKey('newest'),
 * })
 */
export function useComprehensiveClearFilters({
  onClearSearch,
  onClearTag,
  onResetSort,
}: UseComprehensiveClearFiltersProps): ComprehensiveClearFiltersReturn {
  const clearAllFilters = useCallback(() => {
    onClearSearch();
    onClearTag();
    onResetSort();
  }, [onClearSearch, onClearTag, onResetSort]);

  return { clearAllFilters };
}
