"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface PinnedViewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingNames: string[];
  onSubmit: (input: { name: string }) => void;
}

export default function PinnedViewFormModal({
  isOpen,
  onClose,
  existingNames,
  onSubmit,
}: PinnedViewFormModalProps) {
  const normalizedExisting = useMemo(
    () => new Set(existingNames.map((n) => n.trim().toLowerCase())),
    [existingNames]
  );

  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setError(undefined);
  }, [isOpen]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }

    if (normalizedExisting.has(trimmed.toLowerCase())) {
      setError("A pinned view with this name already exists");
      return;
    }

    onSubmit({ name: trimmed });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save pinned view">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(undefined);
          }}
          error={error}
          placeholder="e.g. React resources"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
