"use client";

import BookmarkSearchBar from "@/components/bookmarks/BookmarkSearchBar";
import { Button, Select } from "@/components/ui";
import { SortKey, SORT_OPTIONS } from "@/lib/bookmarks";

interface BookmarkToolbarProps {
  searchQuery: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onClearFilters: () => void;
  tagOptions: string[];
  selectedTag: string;
  onTagChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  sortKey: SortKey;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  resultsCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function BookmarkToolbar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  onClearFilters,
  tagOptions,
  selectedTag,
  onTagChange,
  sortKey,
  onSortChange,
  resultsCount,
  totalCount,
  hasActiveFilters,
  searchInputRef,
}: BookmarkToolbarProps) {
  const tagSelectOptions = [
    { value: "all", label: "All tags" },
    ...tagOptions.map((tag) => ({ value: tag, label: tag })),
  ];

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
        <div className="sm:col-span-2 lg:col-auto">
          <BookmarkSearchBar
            value={searchQuery}
            onChange={onSearchChange}
            inputRef={searchInputRef}
          />
        </div>
        <Select
          label="Tag"
          value={selectedTag}
          onChange={onTagChange}
          options={tagSelectOptions}
        />
        <Select
          label="Sort"
          value={sortKey}
          onChange={onSortChange}
          options={SORT_OPTIONS}
        />
        <div className="flex items-end justify-end sm:col-span-2 lg:col-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={onClearFilters}
            disabled={!hasActiveFilters}
          >
            Clear all
          </Button>
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Showing {resultsCount} of {totalCount} bookmarks
      </p>
    </div>
  );
}
