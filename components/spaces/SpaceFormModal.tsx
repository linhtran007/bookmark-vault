"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { Space } from "@/lib/types";

type SpaceFormMode = "create" | "edit";

interface SpaceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: SpaceFormMode;
  initialSpace?: Space | null;
  onSubmit: (input: { name: string }) => void;
}

export default function SpaceFormModal({
  isOpen,
  onClose,
  mode,
  initialSpace,
  onSubmit,
}: SpaceFormModalProps) {
  const title = mode === "edit" ? "Rename space" : "Add space";

  const initialName = useMemo(() => {
    if (mode === "edit") return initialSpace?.name ?? "";
    return "";
  }, [initialSpace?.name, mode]);

  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!isOpen) return;
    setName(initialName);
    setError(undefined);
  }, [isOpen, initialName]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }

    onSubmit({ name: trimmed });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(undefined);
          }}
          error={error}
          placeholder="e.g. Work"
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
