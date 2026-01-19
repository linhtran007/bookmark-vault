import { getBookmarks, setBookmarks } from "@voc/lib/storage";
import type { Bookmark } from "@voc/lib/types";
import { ensureDefaultSpace } from "@voc/lib/spacesStorage";

/**
 * Migration: ensure a default Personal space exists and assign `spaceId`
 * to existing bookmarks that don't have one.
 */
export function runSpacesMigration(): void {
  if (typeof window === "undefined") return;

  try {
    const personal = ensureDefaultSpace();
    const bookmarks = getBookmarks();

    if (bookmarks.length === 0) return;

    let changed = false;
    const updated: Bookmark[] = bookmarks.map((bookmark) => {
      if (bookmark.spaceId) return bookmark;
      changed = true;
      return { ...bookmark, spaceId: personal.id };
    });

    if (!changed) return;
    setBookmarks(updated);
  } catch {
    // Ignore migration failures (storage unavailable, etc.)
  }
}
