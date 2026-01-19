"use client";

import Input from "@/components/ui/Input";

interface BookmarkSearchBarProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function BookmarkSearchBar({
  value,
  onChange,
  inputRef,
}: BookmarkSearchBarProps) {
  return (
    <Input
      ref={inputRef}
      label="Search"
      value={value}
      onChange={onChange}
      placeholder="Search by title, URL, tags"
    />
  );
}
