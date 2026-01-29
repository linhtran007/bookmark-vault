import { Bookmark } from "@/lib/types";
import { getBookmarks, setBookmarks, invalidateBookmarkCache } from "@/lib/storage";
import { debouncedRecalculateChecksumExport } from "@/lib/storage";

const MAX_TAG_LENGTH = 50;

export interface TagWithCount {
  name: string;
  count: number;
}

function validateTagName(name: string, allowExistingCheck?: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: "Tag name cannot be empty" };
  }

  if (trimmed.length > MAX_TAG_LENGTH) {
    return { valid: false, error: `Tag name must be ${MAX_TAG_LENGTH} characters or less` };
  }

  if (trimmed.includes(",")) {
    return { valid: false, error: "Tag name cannot contain commas" };
  }

  if (allowExistingCheck && trimmed === allowExistingCheck) {
    return { valid: true };
  }

  return { valid: true };
}

export function getTags(): TagWithCount[] {
  const bookmarks = getBookmarks();
  const tagCounts = new Map<string, number>();

  bookmarks.forEach((bookmark: Bookmark) => {
    bookmark.tags.forEach((tag: string) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  const tags: TagWithCount[] = [];
  tagCounts.forEach((count, name) => {
    tags.push({ name, count });
  });

  return tags.sort((a, b) => a.name.localeCompare(b.name));
}

export function renameTag(oldName: string, newName: string): boolean {
  const oldValidation = validateTagName(oldName);
  if (!oldValidation.valid) {
    console.error(`Invalid old tag name: ${oldValidation.error}`);
    return false;
  }

  const newValidation = validateTagName(newName, oldName);
  if (!newValidation.valid) {
    console.error(`Invalid new tag name: ${newValidation.error}`);
    return false;
  }

  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();

  const bookmarks = getBookmarks();
  let hasChanges = false;

  const updatedBookmarks = bookmarks.map((bookmark: Bookmark) => {
    const hasTag = bookmark.tags.includes(trimmedOldName);
    if (hasTag) {
      hasChanges = true;
      return {
        ...bookmark,
        tags: bookmark.tags.map((tag: string) =>
          tag === trimmedOldName ? trimmedNewName : tag
        ),
        updatedAt: new Date().toISOString(),
      };
    }
    return bookmark;
  });

  if (!hasChanges) {
    return true;
  }

  const saved = setBookmarks(updatedBookmarks);
  if (saved) {
    invalidateBookmarkCache();
    debouncedRecalculateChecksumExport();
  }

  return saved;
}

export function deleteTag(name: string): boolean {
  const validation = validateTagName(name);
  if (!validation.valid) {
    console.error(`Invalid tag name: ${validation.error}`);
    return false;
  }

  const trimmedName = name.trim();
  const bookmarks = getBookmarks();

  let hasChanges = false;
  const updatedBookmarks = bookmarks.map((bookmark: Bookmark) => {
    const hasTag = bookmark.tags.includes(trimmedName);
    if (hasTag) {
      hasChanges = true;
      return {
        ...bookmark,
        tags: bookmark.tags.filter((tag: string) => tag !== trimmedName),
        updatedAt: new Date().toISOString(),
      };
    }
    return bookmark;
  });

  if (!hasChanges) {
    return true;
  }

  const saved = setBookmarks(updatedBookmarks);
  if (saved) {
    invalidateBookmarkCache();
    debouncedRecalculateChecksumExport();
  }

  return saved;
}
