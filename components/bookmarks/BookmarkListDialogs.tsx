"use client";

import { useEffect } from "react";
import BookmarkFormModal from "@/components/bookmarks/BookmarkFormModal";
import DeleteConfirmSheet from "@/components/bookmarks/DeleteConfirmSheet";
import { Bookmark } from "@/lib/types";
import { useUiStore } from "@/stores/useUiStore";

interface BookmarkListDialogsProps {
  editTarget: Bookmark | null;
  deleteTarget: Bookmark | null;
  onCloseEdit: () => void;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
}

export default function BookmarkListDialogs({
  editTarget,
  deleteTarget,
  onCloseEdit,
  onCloseDelete,
  onConfirmDelete,
}: BookmarkListDialogsProps) {
  const openEditForm = useUiStore((s) => s.openEditForm);
  const editingBookmark = useUiStore((s) => s.editingBookmark);

  // Trigger edit form when editTarget changes
  useEffect(() => {
    if (editTarget) {
      openEditForm(editTarget);
    }
  }, [editTarget, openEditForm]);

  // Clear editTarget when modal closes (editingBookmark becomes null)
  useEffect(() => {
    if (!editingBookmark && editTarget) {
      onCloseEdit();
    }
  }, [editingBookmark, editTarget, onCloseEdit]);

  return (
    <>
      <BookmarkFormModal onClose={onCloseEdit} />
      <DeleteConfirmSheet
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.title ?? ""}
        onCancel={onCloseDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
