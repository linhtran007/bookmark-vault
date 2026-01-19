"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import {
  getSpaces,
  PERSONAL_SPACE_ID,
  addSpace,
  deleteSpace,
  updateSpace,
} from "@/lib/spacesStorage";
import { addPinnedView, deletePinnedView, getPinnedViews } from "@/lib/pinnedViewsStorage";
import type { PinnedView } from "@/lib/types";
import type { SortKey } from "@/lib/bookmarks";
import { useBookmarks } from "@/hooks/useBookmarks";

export type SpaceSelection = "all" | string;

interface SpacesSidebarProps {
  selectedSpaceId: SpaceSelection;
  onSelectSpaceId: (spaceId: SpaceSelection) => void;

  searchQuery: string;
  selectedTag: string;
  sortKey: SortKey;

  onApplyPinnedView: (view: PinnedView) => void;
}

export default function SpacesSidebar({
  selectedSpaceId,
  onSelectSpaceId,
  searchQuery,
  selectedTag,
  sortKey,
  onApplyPinnedView,
}: SpacesSidebarProps) {
  const [spacesVersion, setSpacesVersion] = useState(0);
  const [pinnedVersion, setPinnedVersion] = useState(0);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { allBookmarks, moveBookmarksToSpace } = useBookmarks();

  const spaces = useMemo(() => {
    void spacesVersion;
    return getSpaces();
  }, [spacesVersion]);

  const pinnedViews = useMemo(() => {
    void pinnedVersion;
    return getPinnedViews(selectedSpaceId);
  }, [pinnedVersion, selectedSpaceId]);

  const bookmarkCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const bookmark of allBookmarks) {
      const spaceId = bookmark.spaceId ?? PERSONAL_SPACE_ID;
      counts.set(spaceId, (counts.get(spaceId) ?? 0) + 1);
    }
    return counts;
  }, [allBookmarks]);

  const bookmarksInSelectedSpace = useMemo(() => {
    if (selectedSpaceId === "all") return allBookmarks;
    return allBookmarks.filter(
      (bookmark) => (bookmark.spaceId ?? PERSONAL_SPACE_ID) === selectedSpaceId
    );
  }, [allBookmarks, selectedSpaceId]);

  const uniqueTagCount = useMemo(() => {
    const tags = new Set<string>();
    for (const bookmark of bookmarksInSelectedSpace) {
      for (const tag of bookmark.tags) tags.add(tag);
    }
    return tags.size;
  }, [bookmarksInSelectedSpace]);

  const recentBookmarks = useMemo(() => {
    const sorted = [...bookmarksInSelectedSpace].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted.slice(0, 5);
  }, [bookmarksInSelectedSpace]);

  const deleteTarget = useMemo(
    () => (deleteTargetId ? spaces.find((s) => s.id === deleteTargetId) ?? null : null),
    [deleteTargetId, spaces]
  );

  useEffect(() => {
    // Ensure default space exists after mount.
    setSpacesVersion((v) => v + 1);
  }, []);

  const handleAddSpace = () => {
    const name = window.prompt("New space name");
    if (!name || !name.trim()) return;

    const created = addSpace({ name: name.trim() });
    setSpacesVersion((v) => v + 1);
    onSelectSpaceId(created.id);
  };

  const handleRenameSpace = (spaceId: string) => {
    if (spaceId === PERSONAL_SPACE_ID) {
      window.alert("Personal space cannot be renamed.");
      return;
    }

    const space = spaces.find((s) => s.id === spaceId);
    const nextName = window.prompt("Rename space", space?.name ?? "");
    if (!nextName || !nextName.trim()) return;

    updateSpace({
      id: spaceId,
      name: nextName.trim(),
      createdAt: space?.createdAt ?? new Date().toISOString(),
      color: space?.color,
    });
    setSpacesVersion((v) => v + 1);
  };

  const requestDeleteSpace = (spaceId: string) => {
    if (spaceId === PERSONAL_SPACE_ID) {
      window.alert("Personal space cannot be deleted.");
      return;
    }

    setDeleteTargetId(spaceId);
  };

  const confirmDeleteSpace = () => {
    if (!deleteTargetId) return;

    const moveResult = moveBookmarksToSpace(deleteTargetId, PERSONAL_SPACE_ID);
    if (!moveResult.success) {
      setDeleteTargetId(null);
      return;
    }

    // Remove pinned views tied to the deleted space.
    for (const view of getPinnedViews(deleteTargetId)) {
      deletePinnedView(view.id);
    }

    deleteSpace(deleteTargetId);
    setSpacesVersion((v) => v + 1);
    setPinnedVersion((v) => v + 1);

    if (selectedSpaceId === deleteTargetId) {
      onSelectSpaceId("all");
    }

    setDeleteTargetId(null);
  };

  const handleSavePinnedView = () => {
    const name = window.prompt("Name this view");
    if (!name || !name.trim()) return;

    // Decision: block duplicate names within the same space.
    const normalized = name.trim().toLowerCase();
    const duplicate = pinnedViews.some(
      (view) => view.name.trim().toLowerCase() === normalized
    );
    if (duplicate) {
      window.alert("A pinned view with this name already exists.");
      return;
    }

    addPinnedView({
      spaceId: selectedSpaceId,
      name: name.trim(),
      searchQuery,
      tag: selectedTag,
      sortKey,
    });
    setPinnedVersion((v) => v + 1);
  };

  const handleDeletePinnedView = (id: string) => {
    deletePinnedView(id);
    setPinnedVersion((v) => v + 1);
  };

  return (
    <aside className="w-full lg:w-72">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Spaces
            </h3>
            <Button
              variant="secondary"
              className="px-3 py-1.5"
              onClick={handleAddSpace}
            >
              Add
            </Button>
          </div>

          <div className="mt-3 space-y-1">
            <button
              type="button"
              onClick={() => onSelectSpaceId("all")}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                selectedSpaceId === "all"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  : "text-slate-700 hover:bg-zinc-100 dark:text-slate-200 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span>All spaces</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {allBookmarks.length}
                </span>
              </div>
            </button>

            {spaces.map((space) => {
              const count = bookmarkCounts.get(space.id) ?? 0;
              const active = selectedSpaceId === space.id;
              return (
                <div
                  key={space.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
                    active
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                      : "text-slate-700 hover:bg-zinc-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectSpaceId(space.id)}
                    className="min-w-0 flex-1 text-left text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{space.name}</span>
                      <span
                        className={cn(
                          "text-xs",
                          active
                            ? "text-rose-600 dark:text-rose-300"
                            : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {count}
                      </span>
                    </div>
                  </button>

                  {space.id !== PERSONAL_SPACE_ID && (
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleRenameSpace(space.id)}
                        className="rounded-md p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                        aria-label={`Rename space ${space.name}`}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M4 13.5V16h2.5l7.373-7.373-2.5-2.5L4 13.5z" />
                          <path d="M14.854 2.646a.5.5 0 01.707 0l1.793 1.793a.5.5 0 010 .707l-1.44 1.44-2.5-2.5 1.44-1.44z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteSpace(space.id)}
                        className="rounded-md p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                        aria-label={`Delete space ${space.name}`}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.366-.446.915-.699 1.493-.699h.5c.578 0 1.127.253 1.493.699L12.414 4H16a.75.75 0 010 1.5h-.636l-.621 10.06A2.25 2.25 0 0112.5 17.75h-5A2.25 2.25 0 015.257 15.56L4.636 5.5H4a.75.75 0 010-1.5h3.586l.671-.901zM6.777 5.5l.56 9.06a.75.75 0 00.748.69h5a.75.75 0 00.748-.69l.56-9.06H6.777z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Dashboard
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Bookmarks
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {bookmarksInSelectedSpace.length}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs text-slate-500 dark:text-slate-400">Tags</div>
              <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {uniqueTagCount}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
              Recently added
            </div>
            {recentBookmarks.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                No bookmarks yet.
              </p>
            ) : (
              <div className="mt-2 space-y-1">
                {recentBookmarks.map((bookmark) => (
                  <a
                    key={bookmark.id}
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-zinc-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <div className="truncate font-medium">{bookmark.title}</div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {bookmark.url}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Pinned views
            </h3>
            <Button
              variant="secondary"
              className="px-3 py-1.5"
              onClick={handleSavePinnedView}
            >
              Save
            </Button>
          </div>

          {pinnedViews.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Save your current filters to access them in 1 click.
            </p>
          ) : (
            <div className="mt-3 space-y-1">
              {pinnedViews.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center gap-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-800"
                >
                  <button
                    type="button"
                    onClick={() => onApplyPinnedView(view)}
                    className="flex-1 px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200"
                  >
                    <div className="font-medium">{view.name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {view.tag !== "all" ? `Tag: ${view.tag}` : "All tags"} · {view.sortKey}
                      {view.searchQuery ? ` · “${view.searchQuery}”` : ""}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePinnedView(view.id)}
                    className="mr-1 rounded-md p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                    aria-label={`Delete pinned view ${view.name}`}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.366-.446.915-.699 1.493-.699h.5c.578 0 1.127.253 1.493.699L12.414 4H16a.75.75 0 010 1.5h-.636l-.621 10.06A2.25 2.25 0 0112.5 17.75h-5A2.25 2.25 0 015.257 15.56L4.636 5.5H4a.75.75 0 010-1.5h3.586l.671-.901zM6.777 5.5l.56 9.06a.75.75 0 00.748.69h5a.75.75 0 00.748-.69l.56-9.06H6.777z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={`Delete space "${deleteTarget?.name ?? ""}"? (${bookmarkCounts.get(deleteTargetId ?? "") ?? 0} bookmarks)`}
        description={`Bookmarks in this space will be moved to Personal. This will also remove pinned views for this space.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteSpace}
        onClose={() => setDeleteTargetId(null)}
      />
    </aside>
  );
}
