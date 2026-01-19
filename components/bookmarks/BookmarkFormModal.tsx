"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "@/components/ui";
import BookmarkFormFields from "@/components/BookmarkFormFields";
import { useBookmarkForm } from "@/hooks/useBookmarkForm";
import { getSpaces, PERSONAL_SPACE_ID } from "@/lib/spacesStorage";
import { Bookmark } from "@/lib/types";

interface BookmarkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  initialBookmark?: Bookmark | null;
  defaultSpaceId?: "all" | string;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function BookmarkFormModal({
  isOpen,
  onClose,
  mode = "create",
  initialBookmark,
  defaultSpaceId = "all",
  titleInputRef,
}: BookmarkFormModalProps) {
  const {
    form,
    errors,
    isLoading,
    errorMessage,
    isValid,
    resetForm,
    handleChange,
    handleSubmit,
    registerField,
  } = useBookmarkForm({
    mode,
    initialBookmark,
    defaultSpaceId,
    onSuccess: onClose,
  });

  const [spaceOptions, setSpaceOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      resetForm(initialBookmark ?? null);
      const spaces = getSpaces();
      setSpaceOptions(
        spaces.map((space) => ({ value: space.id, label: space.name }))
      );
    }
  }, [isOpen, initialBookmark, resetForm]);

  const safeSpaceOptions = useMemo(() => {
    if (spaceOptions.length > 0) return spaceOptions;
    return [{ value: PERSONAL_SPACE_ID, label: "Personal" }];
  }, [spaceOptions]);

  const title = mode === "edit" ? "Edit Bookmark" : "Add Bookmark";
  const submitLabel = mode === "edit" ? "Save changes" : "Add Bookmark";

  // Check if form has any errors
  const hasErrors = Object.keys(errors).some((key) => errors[key as keyof typeof errors]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <BookmarkFormFields
          form={form}
          errors={errors}
          onChange={handleChange}
          titleInputRef={titleInputRef}
          registerField={registerField}
          spaceOptions={safeSpaceOptions}
        />
        {errorMessage && (
          <p className="text-sm text-red-600" role="alert">{errorMessage}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || hasErrors || !isValid}
            aria-describedby={hasErrors ? "form-errors" : undefined}
          >
            {isLoading ? "Saving..." : submitLabel}
          </Button>
        </div>
        {hasErrors && (
          <p id="form-errors" className="text-xs text-slate-500 text-center">
            Please fix the errors above to save
          </p>
        )}
      </form>
    </Modal>
  );
}
