# Epic Breakdown: Improve UX (Daily Productivity)

**Epic Name**: `improve-ux`
**Project**: Bookmark Vault
**Stack**: Next.js (App Router) + React 19 + TypeScript (strict) + TailwindCSS + localStorage

---

## User Answers Record

| Question | Answer |
|----------|--------|
| Bulk Delete Pattern | Use existing ConfirmDialog component |
| Filter Chips | Supplement (add chips + keep Clear button) |
| Marquee Implementation | Pure CSS animation |
| Testing Level | Unit tests only |

---

## Epic Goal

Make Bookmark Vault faster and clearer for daily use:
- Bulk actions for power users (select many, delete once)
- Better handling for long titles/URLs (readable without breaking layout)
- Clear, consistent "filters" behavior (no misleading actions)
- More discoverable keyboard + quick actions

---

## Task Tree

### Phase 1: Foundation (Backend/Logic)

| ID | Task | Files |
|----|------|-------|
| [T001](tasks/T001.md) | Create `useBookmarkSelection` Hook | `hooks/useBookmarkSelection.ts` |
| [T002](tasks/T002.md) | Add `bulkDelete` to `useBookmarks` Hook | `hooks/useBookmarks.ts` |
| [T003](tasks/T003.md) | Create `FilterChips` Component | `components/bookmarks/FilterChips.tsx` |
| [T004](tasks/T004.md) | Create `useComprehensiveClearFilters` Hook | `hooks/useComprehensiveClearFilters.ts` |

### Phase 2: Backend Tests

| ID | Task | Files |
|----|------|-------|
| [T005](tasks/T005.md) | Unit Tests for `useBookmarkSelection` | `hooks/__tests__/useBookmarkSelection.test.ts` |
| [T006](tasks/T006.md) | Unit Tests for `bulkDelete` | `hooks/__tests__/useBookmarks.bulkDelete.test.ts` |
| [T007](tasks/T007.md) | Unit Tests for `useComprehensiveClearFilters` | `hooks/__tests__/useComprehensiveClearFilters.test.ts` |

### Phase 3: Frontend - Bulk Actions UI

| ID | Task | Files |
|----|------|-------|
| [T008](tasks/T008.md) | Add Checkbox to `BookmarkCard` | `components/bookmarks/BookmarkCard.tsx` |
| [T009](tasks/T009.md) | Create `BulkActionsBar` Component | `components/bookmarks/BulkActionsBar.tsx` |
| [T010](tasks/T010.md) | Wire Bulk Delete Confirmation | `app/page.tsx` |

### Phase 4: Frontend - Filters & Chips

| ID | Task | Files |
|----|------|-------|
| [T011](tasks/T011.md) | Integrate `FilterChips` into `BookmarkListView` | `components/bookmarks/BookmarkListView.tsx` |
| [T012](tasks/T012.md) | Wire `clearAllFilters` to "Clear Filters" Button | `components/bookmarks/BookmarkListView.tsx`, `components/bookmarks/BookmarkSearchBar.tsx` |

### Phase 5: Frontend - Marquee & Copy URL

| ID | Task | Files |
|----|------|-------|
| [T013](tasks/T013.md) | Create `MarqueeText` Component | `components/ui/MarqueeText.tsx` |
| [T014](tasks/T014.md) | Add CSS Keyframe Animation for Marquee | `app/globals.css` |
| [T015](tasks/T015.md) | Apply `MarqueeText` to Bookmark Card Titles | `components/bookmarks/BookmarkCard.tsx` |
| [T016](tasks/T016.md) | Add "Copy URL" Button to BookmarkCard | `components/bookmarks/BookmarkCard.tsx` |

### Phase 6: Frontend - Polish & Alignment

| ID | Task | Files |
|----|------|-------|
| [T017](tasks/T017.md) | Update Empty States with Clearer Copy | `components/bookmarks/BookmarkListView.tsx` |
| [T018](tasks/T018.md) | Align Keyboard Shortcuts Help with Implementation | `hooks/useKeyboardShortcuts.ts`, `components/ui/KeyboardShortcutsHelp.tsx` |
| [T019](tasks/T019.md) | Make Toolbar Sticky (Optional Polish) | `components/bookmarks/BookmarkListView.tsx` |

### Phase 7: Frontend Tests

| ID | Task | Files |
|----|------|-------|
| [T020](tasks/T020.md) | Unit Tests for `FilterChips` Component | `components/bookmarks/__tests__/FilterChips.test.tsx` |
| [T021](tasks/T021.md) | Unit Tests for `BulkActionsBar` Component | `components/bookmarks/__tests__/BulkActionsBar.test.tsx` |
| [T022](tasks/T022.md) | Unit Tests for `MarqueeText` Component | `components/ui/__tests__/MarqueeText.test.tsx` |

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1. Foundation | T001-T004 | Hooks & core logic |
| 2. Backend Tests | T005-T007 | Unit tests for hooks |
| 3. Frontend - Bulk | T008-T010 | Selection UI + bulk delete |
| 4. Frontend - Filters | T011-T012 | Filter chips + comprehensive clear |
| 5. Frontend - Marquee/Copy | T013-T016 | Marquee text + copy URL |
| 6. Frontend - Polish | T017-T019 | Empty states + shortcuts + sticky |
| 7. Frontend Tests | T020-T022 | Component unit tests |

**Total: 22 tasks**

---

## File Structure

```
hooks/
  useBookmarkSelection.ts          [T001]
  useComprehensiveClearFilters.ts  [T004]
  __tests__/
    useBookmarkSelection.test.ts   [T005]
    useBookmarks.bulkDelete.test.ts [T006]
    useComprehensiveClearFilters.test.ts [T007]

components/
  bookmarks/
    BookmarkCard.tsx               [T008, T015, T016]
    BookmarkListView.tsx           [T011, T012, T017, T019]
    BulkActionsBar.tsx             [T009]
    FilterChips.tsx                [T003]
    __tests__/
      FilterChips.test.tsx         [T020]
      BulkActionsBar.test.tsx      [T021]
  ui/
    MarqueeText.tsx                [T013]
    __tests__/
      MarqueeText.test.tsx         [T022]

app/
  globals.css                      [T014]
  page.tsx                         [T010]
```

---

## Reference Patterns

| Pattern | Location |
|---------|----------|
| Set-based state | `hooks/useBookmarks.ts` (pendingAdds, pendingDeletes) |
| ConfirmDialog | Existing delete confirmation flow |
| Toast feedback | `toast.success/error` in useBookmarks |
| Ghost button | BookmarkCard Edit/Delete buttons |
| EmptyState | `components/ui/EmptyState.tsx` |
| Keyboard shortcuts | `hooks/useKeyboardShortcuts.ts` |
