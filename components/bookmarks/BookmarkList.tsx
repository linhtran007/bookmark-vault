"use client";
import { useMemo, useState } from "react";
import BookmarkCard from "@/components/bookmarks/BookmarkCard";
import BookmarkListDialogs from "@/components/bookmarks/BookmarkListDialogs";
import BookmarkListView from "@/components/bookmarks/BookmarkListView";
import BulkActionsBar from "@/components/bookmarks/BulkActionsBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { SortKey } from "@/lib/bookmarks";
import { useBookmarkListState } from "@/components/bookmarks/useBookmarkListState";
import { useBookmarkSelection } from "@/hooks/useBookmarkSelection";
import { useBookmarks } from "@/hooks/useBookmarks";
interface BookmarkListProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedTag: string;
  onTagChange: (value: string) => void;
  sortKey: SortKey;
  onSortChange: (value: SortKey) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  cardsContainerRef: React.RefObject<HTMLDivElement | null>;
  onAddBookmark?: () => void;
}

export default function BookmarkList({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagChange,
  sortKey,
  onSortChange,
  searchInputRef,
  cardsContainerRef,
  onAddBookmark,
}: BookmarkListProps) {
  const {
    errorMessage,
    allBookmarksCount,
    filteredBookmarks,
    tagOptions,
    pendingAdds,
    pendingDeletes,
    handleSearchChange,
    handleClearSearch,
    handleTagChange,
    handleSortChange,
    handleDeleteRequest,
    handleEditRequest,
    deleteTarget,
    editTarget,
    handleConfirmDelete,
    handleCloseDelete,
    handleCloseEdit,
  } = useBookmarkListState({
    searchQuery,
    onSearchChange,
    selectedTag,
    onTagChange,
    sortKey,
    onSortChange,
  });

  const {
    selectedIds,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount,
  } = useBookmarkSelection();

  const visibleIds = useMemo(
    () => filteredBookmarks.map((b) => b.id),
    [filteredBookmarks]
  );

  const { bulkDelete } = useBookmarks();
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const result = await bulkDelete(ids);
    if (result.success) {
      clearSelection();
      setShowBulkDeleteConfirm(false);
    }
  };

  const cards = useMemo(
    () =>
      filteredBookmarks.map((bookmark) => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          onDelete={handleDeleteRequest}
          onEdit={handleEditRequest}
          isPendingAdd={pendingAdds.has(bookmark.id)}
          isPendingDelete={pendingDeletes.has(bookmark.id)}
          isSelected={isSelected(bookmark.id)}
          onToggleSelect={() => toggle(bookmark.id)}
        />
      )),
    [filteredBookmarks, handleDeleteRequest, handleEditRequest, pendingAdds, pendingDeletes, isSelected, toggle]
  );

  return (
    <div className="space-y-6">
      <BookmarkListView
        searchQuery={searchQuery}
        selectedTag={selectedTag}
        sortKey={sortKey}
        tagOptions={tagOptions}
        resultsCount={filteredBookmarks.length}
        totalCount={allBookmarksCount}
        errorMessage={errorMessage}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onTagChange={handleTagChange}
        onSortChange={handleSortChange}
        searchInputRef={searchInputRef}
        cardsContainerRef={cardsContainerRef}
        cards={cards}
        onAddBookmark={onAddBookmark}
      />
      <BulkActionsBar
        selectedCount={selectedCount}
        visibleCount={visibleIds.length}
        onSelectAll={() => selectAll(visibleIds)}
        onClearSelection={clearSelection}
        onDeleteSelected={() => setShowBulkDeleteConfirm(true)}
      />
      <BookmarkListDialogs
        searchQuery={searchQuery}
        selectedTag={selectedTag}
        sortKey={sortKey}
        tagOptions={tagOptions}
        resultsCount={filteredBookmarks.length}
        totalCount={allBookmarksCount}
        errorMessage={errorMessage}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onTagChange={handleTagChange}
        onSortChange={handleSortChange}
        searchInputRef={searchInputRef}
        cardsContainerRef={cardsContainerRef}
        cards={cards}
        onAddBookmark={onAddBookmark}
      />
      <BookmarkListDialogs
        editTarget={editTarget}
        deleteTarget={deleteTarget}
        onCloseEdit={handleCloseEdit}
        onCloseDelete={handleCloseDelete}
        onConfirmDelete={handleConfirmDelete}
      />
      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        title={`Delete ${selectedCount} bookmarks?`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />
    </div>
  );
}
