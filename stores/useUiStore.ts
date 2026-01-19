import { create } from 'zustand';
import type { SortKey } from '@/lib/bookmarks';
import type { SpaceSelection } from '@/components/spaces/SpacesSidebar';
import type { PinnedView, Bookmark } from '@/lib/types';

interface UiState {
  // Filters
  selectedSpaceId: SpaceSelection;
  searchQuery: string;
  selectedTag: string;
  sortKey: SortKey;

  // Overlays
  isFormOpen: boolean;
  isImportExportOpen: boolean;
  isSpacesOpen: boolean;

  // Edit mode
  editingBookmark: Bookmark | null;
}

interface UiActions {
  // Filter setters
  setSelectedSpaceId: (id: SpaceSelection) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string) => void;
  setSortKey: (key: SortKey) => void;

  // Overlay setters
  setIsFormOpen: (open: boolean) => void;
  setIsImportExportOpen: (open: boolean) => void;
  setIsSpacesOpen: (open: boolean) => void;

  // Composite actions
  clearAllFilters: () => void;
  clearSearch: () => void;
  applyPinnedView: (view: PinnedView) => void;

  // Convenience helpers
  openForm: () => void;
  closeForm: () => void;
  openImportExport: () => void;
  closeImportExport: () => void;
  openSpaces: () => void;
  closeSpaces: () => void;

  // Edit mode helpers
  openEditForm: (bookmark: Bookmark) => void;
}

type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>((set) => ({
  // Initial state
  selectedSpaceId: 'all',
  searchQuery: '',
  selectedTag: 'all',
  sortKey: 'newest',
  isFormOpen: false,
  isImportExportOpen: false,
  isSpacesOpen: false,
  editingBookmark: null,

  // Filter setters
  setSelectedSpaceId: (id) => set({ selectedSpaceId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  setSortKey: (key) => set({ sortKey: key }),

  // Overlay setters
  setIsFormOpen: (open) => set({ isFormOpen: open }),
  setIsImportExportOpen: (open) => set({ isImportExportOpen: open }),
  setIsSpacesOpen: (open) => set({ isSpacesOpen: open }),

  // Composite actions
  clearAllFilters: () => set({
    searchQuery: '',
    selectedTag: 'all',
    sortKey: 'newest',
    // Note: selectedSpaceId is NOT cleared
  }),

  clearSearch: () => set({ searchQuery: '' }),

  applyPinnedView: (view) => set({
    selectedSpaceId: view.spaceId as SpaceSelection,
    searchQuery: view.searchQuery,
    selectedTag: view.tag,
    sortKey: view.sortKey,
  }),

  // Convenience helpers
  openForm: () => set({ isFormOpen: true, editingBookmark: null }),
  closeForm: () => set({ isFormOpen: false, editingBookmark: null }),
  openImportExport: () => set({ isImportExportOpen: true }),
  closeImportExport: () => set({ isImportExportOpen: false }),
  openSpaces: () => set({ isSpacesOpen: true }),
  closeSpaces: () => set({ isSpacesOpen: false }),

  // Edit mode helpers
  openEditForm: (bookmark) => set({ isFormOpen: true, editingBookmark: bookmark }),
}));
