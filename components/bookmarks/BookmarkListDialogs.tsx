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

  // Trigger edit form when editTarget changes
  useEffect(() => {
    if (editTarget) {
      openEditForm(editTarget);
    }
  }, [editTarget, openEditForm]);

  return (
    <>
      <BookmarkFormModal />
      <DeleteConfirmSheet
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.title ?? ""}
        onCancel={onCloseDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
