"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import BookmarkFormModal from "@/components/bookmarks/BookmarkFormModal";
import ImportExportModal from "@/components/bookmarks/ImportExportModal";
import BookmarkList from "@/components/BookmarkList";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
import { KeyboardShortcutsHelp } from "@/components/ui/KeyboardShortcutsHelp";
import { BottomSheet, Button } from "@/components/ui";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SortKey } from "@/lib/bookmarks";
import { BookmarksProvider } from "@/hooks/useBookmarks";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { runOnboardingMigration } from "@/lib/migration";
import { runSpacesMigration } from "@/lib/spacesMigration";
import { getSpaces } from "@/lib/spacesStorage";
import SpacesSidebar, { type SpaceSelection } from "@/components/spaces/SpacesSidebar";
import type { PinnedView } from "@/lib/types";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [selectedSpaceId, setSelectedSpaceId] = useState<SpaceSelection>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isSpacesOpen, setIsSpacesOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  // Run migration on mount
  useEffect(() => {
    runOnboardingMigration();
    runSpacesMigration();
  }, []);

  useKeyboardShortcuts({
    titleInputRef,
    searchInputRef,
    cardsContainerRef,
    onClearForm: () => setIsFormOpen(false),
    onClearSearch: () => setSearchQuery(""),
    onOpenForm: () => setIsFormOpen(true),
  });

  const handleAddBookmark = () => setIsFormOpen(true);

  const handleApplyPinnedView = (view: PinnedView) => {
    setSelectedSpaceId(view.spaceId as SpaceSelection);
    setSearchQuery(view.searchQuery);
    setSelectedTag(view.tag);
    setSortKey(view.sortKey);
  };

  const spacesLabel = useMemo(() => {
    if (selectedSpaceId === "all") return "All spaces";
    const match = getSpaces().find((space) => space.id === selectedSpaceId);
    return match?.name ?? "Space";
  }, [selectedSpaceId]);

  return (
    <ErrorBoundary>
      <BookmarksProvider>
        <div className="space-y-10">
          {/* Onboarding Panel - shows for first-time users */}
          <OnboardingPanel />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your personal vault</p>
              <h2 className="text-2xl font-semibold">Manage your bookmarks</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleAddBookmark}>Add bookmark</Button>
              <Button
                variant="secondary"
                onClick={() => setIsImportExportOpen(true)}
                aria-label="Import or export bookmarks"
              >
                <ImportExportIcon />
              </Button>
              {/* Keyboard Shortcuts Help */}
              <KeyboardShortcutsHelp position="bottom" />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
            <div className="hidden lg:block">
              <SpacesSidebar
                selectedSpaceId={selectedSpaceId}
                onSelectSpaceId={setSelectedSpaceId}
                searchQuery={searchQuery}
                selectedTag={selectedTag}
                sortKey={sortKey}
                onApplyPinnedView={handleApplyPinnedView}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 lg:hidden">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Space</p>
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {spacesLabel}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => setIsSpacesOpen(true)}
                >
                  Spaces
                </Button>
              </div>

              <BookmarkFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                titleInputRef={titleInputRef}
                defaultSpaceId={selectedSpaceId}
              />
              <ImportExportModal
                isOpen={isImportExportOpen}
                onClose={() => setIsImportExportOpen(false)}
              />
              <BookmarkList
                selectedSpaceId={selectedSpaceId}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedTag={selectedTag}
                onTagChange={setSelectedTag}
                sortKey={sortKey}
                onSortChange={setSortKey}
                searchInputRef={searchInputRef}
                cardsContainerRef={cardsContainerRef}
                onAddBookmark={handleAddBookmark}
              />
            </div>
          </div>

          <BottomSheet isOpen={isSpacesOpen} onClose={() => setIsSpacesOpen(false)} className="max-h-[80vh] overflow-auto">
            <SpacesSidebar
              selectedSpaceId={selectedSpaceId}
              onSelectSpaceId={(id) => {
                setSelectedSpaceId(id);
                setIsSpacesOpen(false);
              }}
              searchQuery={searchQuery}
              selectedTag={selectedTag}
              sortKey={sortKey}
              onApplyPinnedView={(view) => {
                handleApplyPinnedView(view);
                setIsSpacesOpen(false);
              }}
              className="w-full"
            />
          </BottomSheet>
        </div>
      </BookmarksProvider>
    </ErrorBoundary>
  );
}

function ImportExportIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

