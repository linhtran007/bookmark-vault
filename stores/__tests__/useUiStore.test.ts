import { describe, it, expect, beforeEach } from '@jest/globals';
import { useUiStore } from '../useUiStore';
import type { PinnedView } from '@/lib/types';

describe('useUiStore - clearAllFilters', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUiStore.setState({
      selectedSpaceId: 'all',
      searchQuery: '',
      selectedTag: 'all',
      sortKey: 'newest',
      isFormOpen: false,
      isImportExportOpen: false,
      isSpacesOpen: false,
    });
  });

  it('should reset all filters to default values', () => {
    // Set non-default filter values
    useUiStore.setState({
      searchQuery: 'test query',
      selectedTag: 'work',
      sortKey: 'oldest',
    });

    // Verify state before clear
    expect(useUiStore.getState().searchQuery).toBe('test query');
    expect(useUiStore.getState().selectedTag).toBe('work');
    expect(useUiStore.getState().sortKey).toBe('oldest');

    // Call clearAllFilters
    useUiStore.getState().clearAllFilters();

    // Verify reset to defaults
    expect(useUiStore.getState().searchQuery).toBe('');
    expect(useUiStore.getState().selectedTag).toBe('all');
    expect(useUiStore.getState().sortKey).toBe('newest');
  });

  it('should preserve selectedSpaceId when clearing filters', () => {
    // Set a specific space
    useUiStore.setState({
      selectedSpaceId: 'space-123',
      searchQuery: 'test',
    });

    // Clear filters
    useUiStore.getState().clearAllFilters();

    // Verify space is preserved
    expect(useUiStore.getState().selectedSpaceId).toBe('space-123');
    expect(useUiStore.getState().searchQuery).toBe('');
  });

  it('should not affect overlay states', () => {
    // Set overlay states
    useUiStore.setState({
      isFormOpen: true,
      isImportExportOpen: true,
      isSpacesOpen: true,
      searchQuery: 'test',
    });

    // Clear filters
    useUiStore.getState().clearAllFilters();

    // Verify filters cleared but overlays unchanged
    expect(useUiStore.getState().searchQuery).toBe('');
    expect(useUiStore.getState().isFormOpen).toBe(true);
    expect(useUiStore.getState().isImportExportOpen).toBe(true);
    expect(useUiStore.getState().isSpacesOpen).toBe(true);
  });
});

describe('useUiStore - applyPinnedView', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUiStore.setState({
      selectedSpaceId: 'all',
      searchQuery: '',
      selectedTag: 'all',
      sortKey: 'newest',
      isFormOpen: false,
      isImportExportOpen: false,
      isSpacesOpen: false,
    });
  });

  it('should apply all properties from PinnedView to store', () => {
    const mockView: PinnedView = {
      id: 'view-1',
      spaceId: 'space-work',
      name: 'Work Items',
      searchQuery: 'urgent',
      tag: 'priority',
      sortKey: 'oldest',
    };

    useUiStore.getState().applyPinnedView(mockView);

    expect(useUiStore.getState().selectedSpaceId).toBe('space-work');
    expect(useUiStore.getState().searchQuery).toBe('urgent');
    expect(useUiStore.getState().selectedTag).toBe('priority');
    expect(useUiStore.getState().sortKey).toBe('oldest');
  });

  it('should handle PinnedView with empty searchQuery', () => {
    const mockView: PinnedView = {
      id: 'view-2',
      spaceId: 'all',
      name: 'All Items',
      searchQuery: '',
      tag: 'all',
      sortKey: 'newest',
    };

    useUiStore.getState().applyPinnedView(mockView);

    expect(useUiStore.getState().selectedSpaceId).toBe('all');
    expect(useUiStore.getState().searchQuery).toBe('');
    expect(useUiStore.getState().selectedTag).toBe('all');
    expect(useUiStore.getState().sortKey).toBe('newest');
  });

  it('should handle PinnedView with "all" tag', () => {
    const mockView: PinnedView = {
      id: 'view-3',
      spaceId: 'space-personal',
      name: 'Personal',
      searchQuery: 'blog',
      tag: 'all',
      sortKey: 'title',
    };

    useUiStore.getState().applyPinnedView(mockView);

    expect(useUiStore.getState().selectedSpaceId).toBe('space-personal');
    expect(useUiStore.getState().searchQuery).toBe('blog');
    expect(useUiStore.getState().selectedTag).toBe('all');
    expect(useUiStore.getState().sortKey).toBe('title');
  });

  it('should not affect overlay states', () => {
    // Set overlay states
    useUiStore.setState({
      isFormOpen: true,
      isSpacesOpen: true,
    });

    const mockView: PinnedView = {
      id: 'view-4',
      spaceId: 'space-123',
      name: 'Test',
      searchQuery: 'test',
      tag: 'test',
      sortKey: 'oldest',
    };

    useUiStore.getState().applyPinnedView(mockView);

    // Verify filters updated but overlays unchanged
    expect(useUiStore.getState().selectedSpaceId).toBe('space-123');
    expect(useUiStore.getState().isFormOpen).toBe(true);
    expect(useUiStore.getState().isSpacesOpen).toBe(true);
  });
});

describe('useUiStore - Modal/Sheet Actions', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUiStore.setState({
      selectedSpaceId: 'all',
      searchQuery: '',
      selectedTag: 'all',
      sortKey: 'newest',
      isFormOpen: false,
      isImportExportOpen: false,
      isSpacesOpen: false,
    });
  });

  describe('Form Modal', () => {
    it('should open form when openForm is called', () => {
      expect(useUiStore.getState().isFormOpen).toBe(false);

      useUiStore.getState().openForm();

      expect(useUiStore.getState().isFormOpen).toBe(true);
    });

    it('should close form when closeForm is called', () => {
      useUiStore.setState({ isFormOpen: true });

      useUiStore.getState().closeForm();

      expect(useUiStore.getState().isFormOpen).toBe(false);
    });
  });

  describe('Import/Export Modal', () => {
    it('should open import/export when openImportExport is called', () => {
      expect(useUiStore.getState().isImportExportOpen).toBe(false);

      useUiStore.getState().openImportExport();

      expect(useUiStore.getState().isImportExportOpen).toBe(true);
    });

    it('should close import/export when closeImportExport is called', () => {
      useUiStore.setState({ isImportExportOpen: true });

      useUiStore.getState().closeImportExport();

      expect(useUiStore.getState().isImportExportOpen).toBe(false);
    });
  });

  describe('Spaces Sheet', () => {
    it('should open spaces when openSpaces is called', () => {
      expect(useUiStore.getState().isSpacesOpen).toBe(false);

      useUiStore.getState().openSpaces();

      expect(useUiStore.getState().isSpacesOpen).toBe(true);
    });

    it('should close spaces when closeSpaces is called', () => {
      useUiStore.setState({ isSpacesOpen: true });

      useUiStore.getState().closeSpaces();

      expect(useUiStore.getState().isSpacesOpen).toBe(false);
    });
  });

  it('should maintain state isolation between overlays', () => {
    // Open all overlays
    useUiStore.getState().openForm();
    useUiStore.getState().openImportExport();
    useUiStore.getState().openSpaces();

    expect(useUiStore.getState().isFormOpen).toBe(true);
    expect(useUiStore.getState().isImportExportOpen).toBe(true);
    expect(useUiStore.getState().isSpacesOpen).toBe(true);

    // Close one overlay
    useUiStore.getState().closeForm();

    // Verify only form is closed, others remain open
    expect(useUiStore.getState().isFormOpen).toBe(false);
    expect(useUiStore.getState().isImportExportOpen).toBe(true);
    expect(useUiStore.getState().isSpacesOpen).toBe(true);
  });
});
