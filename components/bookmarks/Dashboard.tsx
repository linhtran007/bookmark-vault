"use client";

import { useMemo } from "react";
import { Bookmark, Tag, Clock } from "lucide-react";
import DropdownMenu from "@/components/ui/DropdownMenu";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useUiStore } from "@/stores/useUiStore";

export function Dashboard() {
  const { bookmarks } = useBookmarks();
  const selectedSpaceId = useUiStore((s) => s.selectedSpaceId);

  // Filter bookmarks by selected space
  const bookmarksInSpace = useMemo(() => {
    if (selectedSpaceId === "all") return bookmarks;
    return bookmarks.filter((b) => b.spaceId === selectedSpaceId);
  }, [bookmarks, selectedSpaceId]);

  // Calculate stats
  const bookmarkCount = bookmarksInSpace.length;
  
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    bookmarksInSpace.forEach((b) => b.tags?.forEach((t) => tags.add(t)));
    return tags;
  }, [bookmarksInSpace]);
  
  const tagCount = uniqueTags.size;

  // Get 3 most recently added bookmarks
  const recentBookmarks = useMemo(() => {
    return [...bookmarksInSpace]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [bookmarksInSpace]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
      {/* Left: Stats */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/30">
            <Bookmark className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{bookmarkCount}</span>
            <span className="text-slate-500 dark:text-slate-400 text-sm ml-1">bookmarks</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{tagCount}</span>
            <span className="text-slate-500 dark:text-slate-400 text-sm ml-1">tags</span>
          </div>
        </div>
      </div>

      {/* Right: Recently added */}
      {recentBookmarks.length > 0 && (
        <DropdownMenu
          align="end"
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Show recent bookmarks"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Recent</span>
            </button>
          }
        >
          <div className="flex flex-col">
            {recentBookmarks.map((bookmark) => (
              <a
                key={bookmark.id}
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm text-slate-700 hover:bg-zinc-100 dark:text-slate-200 dark:hover:bg-slate-800"
                title={bookmark.title}
              >
                <span className="block truncate max-w-[180px]">
                  {bookmark.title}
                </span>
              </a>
            ))}
          </div>
        </DropdownMenu>
      )}
    </div>
  );
}
