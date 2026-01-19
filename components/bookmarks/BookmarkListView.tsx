"use client";

import BookmarkToolbar from "@/components/bookmarks/BookmarkToolbar";
import FilterChips from "@/components/bookmarks/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import { BookmarkListSkeleton } from "@/components/bookmarks/BookmarkCardSkeleton";
import { SortKey } from "@/lib/bookmarks";
import { useComprehensiveClearFilters } from "@/hooks/useComprehensiveClearFilters";

interface BookmarkListViewProps {
  searchQuery: string;
  selectedTag: string;
  sortKey: SortKey;
  tagOptions: string[];
  resultsCount: number;
  totalCount: number;
  errorMessage: string | null;
  isInitialLoading?: boolean;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onTagChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  cardsContainerRef: React.RefObject<HTMLDivElement | null>;
  cards: React.ReactNode;
  onAddBookmark?: () => void;
}

export default function BookmarkListView({
  searchQuery,
  selectedTag,
  sortKey,
  tagOptions,
  resultsCount,
  totalCount,
  errorMessage,
  isInitialLoading = false,
  onSearchChange,
  onClearSearch,
  onTagChange,
  onSortChange,
  searchInputRef,
  cardsContainerRef,
  cards,
  onAddBookmark,
}: BookmarkListViewProps) {
  const isEmpty = !isInitialLoading && totalCount === 0;
  const isFilteredEmpty = !isInitialLoading && !isEmpty && resultsCount === 0;

  // Hook to clear all filters at once
  const { clearAllFilters } = useComprehensiveClearFilters({
    onClearSearch,
    onClearTag: () => onTagChange({ target: { value: "all" } } as React.ChangeEvent<HTMLSelectElement>),
    onResetSort: () => onSortChange({ target: { value: "newest" } } as React.ChangeEvent<HTMLSelectElement>),
  });

  const hasActiveFilters = searchQuery || selectedTag !== "all" || sortKey !== "newest";

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <BookmarkToolbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onClearSearch={clearAllFilters}
        tagOptions={tagOptions}
        selectedTag={selectedTag}
        onTagChange={onTagChange}
        sortKey={sortKey}
        onSortChange={onSortChange}
        resultsCount={resultsCount}
        totalCount={totalCount}
        searchInputRef={searchInputRef}
      />
      </div>
      {hasActiveFilters && (
        <FilterChips
          searchQuery={searchQuery}
          selectedTag={selectedTag}
          sortKey={sortKey}
          onClearSearch={clearAllFilters}
          onClearTag={() => onTagChange({ target: { value: "all" } } as React.ChangeEvent<HTMLSelectElement>)}
          onResetSort={() => onSortChange({ target: { value: "newest" } } as React.ChangeEvent<HTMLSelectElement>)}
        />
      )}
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      {isInitialLoading ? (
        <BookmarkListSkeleton count={6} />
      ) : isEmpty ? (
        <EmptyState
          title="No bookmarks yet"
          description="Add your first bookmark to get started."
          actionLabel="Add your first bookmark"
          onAction={onAddBookmark}
        />
      ) : isFilteredEmpty ? (
        <EmptyState
          title="No results found"
          description="No bookmarks match your filters. Try different filters or clear all."
          actionLabel="Clear all filters"
          onAction={clearAllFilters}
        />
      ) : (
        <div
          ref={cardsContainerRef}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {cards}
        </div>
      )}
    </div>
  );
}
