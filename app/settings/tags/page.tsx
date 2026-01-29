"use client";

import { useState } from "react";
import { useIncomingSync } from "@/hooks/useIncomingSync";
import { TagManagement, RenameTagModal, DeleteTagModal } from "@/components/tags";
import { renameTag, deleteTag } from "@/lib/tagsStorage";
import { toast } from "sonner";
import type { TagWithCount } from "@/lib/tagsStorage";

export default function TagSettingsPage() {
  useIncomingSync();

  const [renameModalTag, setRenameModalTag] = useState<TagWithCount | null>(null);
  const [deleteModalTag, setDeleteModalTag] = useState<TagWithCount | null>(null);

  const handleRename = (tag: TagWithCount) => {
    setRenameModalTag(tag);
  };

  const handleRenameConfirm = (oldName: string, newName: string) => {
    const success = renameTag(oldName, newName);
    if (success) {
      toast.success(`Renamed "${oldName}" to "${newName}"`);
    } else {
      toast.error("Failed to rename tag");
    }
  };

  const handleDelete = (tag: TagWithCount) => {
    setDeleteModalTag(tag);
  };

  const handleDeleteConfirm = (name: string) => {
    const success = deleteTag(name);
    if (success) {
      toast.success(`Deleted "${name}"`);
    } else {
      toast.error("Failed to delete tag");
    }
  };

  return (
    <>
      <div className="pt-24">
        <div className="mx-auto max-w-2xl p-4">
          <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">Tag Management</h1>
          <TagManagement onRename={handleRename} onDelete={handleDelete} />
        </div>
      </div>

      <RenameTagModal
        isOpen={!!renameModalTag}
        onClose={() => setRenameModalTag(null)}
        tag={renameModalTag}
        onRename={handleRenameConfirm}
      />

      <DeleteTagModal
        isOpen={!!deleteModalTag}
        onClose={() => setDeleteModalTag(null)}
        tag={deleteModalTag}
        onDelete={handleDeleteConfirm}
      />
    </>
  );
}
