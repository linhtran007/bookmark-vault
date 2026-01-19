"use client";

import { useCallback, useMemo, useState } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import {
  filterByTag,
  getUniqueTags,
  sortBookmarks,
  SortKey,
} from "@/lib/bookmarks";
import { PERSONAL_SPACE_ID } from "@/lib/spacesStorage";
import { Bookmark } from "@/lib/types";

interface UseBookmarkListStateProps {
  selectedSpaceId: "all" | string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedTag: string;
  onTagChange: (value: string) => void;
  sortKey: SortKey;
  onSortChange: (value: SortKey) => void;
}

function getBookmarkSpaceId(bookmark: Bookmark): string {
  return bookmark.spaceId ?? PERSONAL_SPACE_ID;
}

export function useBookmarkListState({
  selectedSpaceId,
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagChange,
  sortKey,
  onSortChange,
}: UseBookmarkListStateProps) {
  const {
    bookmarks,
    allBookmarks,
    deleteBookmark,
    errorMessage,
    clearError,
    pendingAdds,
    pendingDeletes,
    isInitialLoading,
    fetchPreview,
    refreshPreview,
  } = useBookmarks(searchQuery);

  const [deleteTarget, setDeleteTarget] = useState<Bookmark | null>(null);
  const [editTarget, setEditTarget] = useState<Bookmark | null>(null);

  const allBookmarksInScope = useMemo(() => {
    if (selectedSpaceId === "all") return allBookmarks;
    return allBookmarks.filter(
      (bookmark) => getBookmarkSpaceId(bookmark) === selectedSpaceId
    );
  }, [allBookmarks, selectedSpaceId]);

  const bookmarksInScope = useMemo(() => {
    if (selectedSpaceId === "all") return bookmarks;
    return bookmarks.filter(
      (bookmark) => getBookmarkSpaceId(bookmark) === selectedSpaceId
    );
  }, [bookmarks, selectedSpaceId]);

  const tagOptions = useMemo(
    () => getUniqueTags(allBookmarksInScope),
    [allBookmarksInScope]
  );

  const filteredBookmarks = useMemo(() => {
    const tagged = filterByTag(bookmarksInScope, selectedTag);
    return sortBookmarks(tagged, sortKey);
  }, [bookmarksInScope, selectedTag, sortKey]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(event.target.value);
      if (errorMessage) clearError();
    },
    [onSearchChange, errorMessage, clearError]
  );

  const handleClearSearch = useCallback(() => {
    onSearchChange("");
    if (errorMessage) clearError();
  }, [onSearchChange, errorMessage, clearError]);

  const handleTagChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => onTagChange(event.target.value),
    [onTagChange]
  );

  const handleSortChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) =>
      onSortChange(event.target.value as SortKey),
    [onSortChange]
  );

  const handleDeleteRequest = useCallback((bookmark: Bookmark) => {
    setDeleteTarget(bookmark);
  }, []);

  const handleEditRequest = useCallback((bookmark: Bookmark) => {
    setEditTarget(bookmark);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) deleteBookmark(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteBookmark, deleteTarget]);

  const handleCloseDelete = useCallback(() => setDeleteTarget(null), []);
  const handleCloseEdit = useCallback(() => setEditTarget(null), []);

  return {
    errorMessage,
    allBookmarksCount: allBookmarksInScope.length,
    filteredBookmarks,
    tagOptions,
    pendingAdds,
    pendingDeletes,
    isInitialLoading,
    fetchPreview,
    refreshPreview,
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
  };
}
