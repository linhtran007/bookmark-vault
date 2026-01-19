# Epic Breakdown: Zustand UI Optimization

## Epic Overview

**Epic Name**: Zustand UI Optimization (Faster Loading + Interaction)
**Epic File**: `docs/epics/zustand-ui-optimization.md`
**Breakdown Date**: 2026-01-19
**Total Tasks**: 20 (5 BE-TEST, 15 FE)

---

## Project Tech Context

**Stack**:
- Frontend: Next.js (App Router) + React 19 + TypeScript
- Styling: TailwindCSS
- State Management: React Context (`useBookmarks`) + `useState` (current) → **Zustand** (target)
- Persistence: `localStorage` (client-side only)
- Data: No backend/API, client-side bookmark management

**Existing Patterns**:
- Context providers for shared state (`BookmarksProvider` from `hooks/useBookmarks.ts`)
- Custom hooks for complex state logic (`useBookmarkForm`, `useImportBookmarks`, `useKeyboardShortcuts`)
- Functional components with `"use client"` directive for client-side features
- Props drilling from `app/page.tsx` down to child components
- Type definitions in `lib/types.ts`

---

## Scope & Logic Analysis

### State Migration to Zustand

**Moving to Store** (7 total):
- **Filters** (4): `selectedSpaceId`, `searchQuery`, `selectedTag`, `sortKey`
- **Overlays** (3): `isFormOpen`, `isImportExportOpen`, `isSpacesOpen`

**Actions**:
- Individual setters for each state
- `clearAllFilters()` - resets filters to defaults
- `applyPinnedView(view)` - applies PinnedView object to filters
- Modal helpers: `openForm()`, `closeForm()`, `openImportExport()`, `closeImportExport()`, `openSpaces()`, `closeSpaces()`

### Integration Points

1. **app/page.tsx** - removes 7 `useState` hooks, uses store selectors
2. **BookmarkToolbar** - subscribes to filter state + clear action
3. **BookmarkListView** - subscribes to filters for computing view
4. **SpacesSidebar** - subscribes to selected space + apply view action
5. **BookmarkFormModal** - subscribes to isFormOpen + defaultSpaceId
6. **ImportExportModal** - subscribes to isImportExportOpen
7. **BottomSheet** (spaces) - subscribes to isSpacesOpen
8. **useKeyboardShortcuts** - calls store actions directly

---

## User Answers & Architectural Decisions

### Q1: E2E Testing
**Answer**: Skip E2E tests
**Decision**: Backend unit tests only for store actions. No E2E test coverage.

### Q2: Hydration Strategy
**Answer**: Best practice
**Decision**: Use client-only store pattern. Store initializes with default values, safe for SSR. No window/document access during SSR render. Similar to existing `useBookmarks` hydration pattern.

### Q3: Render Optimization
**Answer**: Conservative memo
**Decision**: Apply `React.memo` only to **BookmarkToolbar** and **SpacesSidebar**. Measure before adding more memoization. Rely on selector granularity for other components.

### Q4: Persistence
**Answer**: No persistence
**Decision**: Filters reset to defaults on every page load. Simplest implementation. Store architecture allows persistence to be added later.

---

## Task Breakdown

### Backend Test Tasks (BE-TEST) - 5 tasks

| ID | Task | File(s) |
|----|------|---------|
| T001 | Add Zustand Dependency | `package.json` |
| T002 | Create useUiStore with Type Definitions | `stores/useUiStore.ts` (new) |
| T003 | Write Unit Tests for clearAllFilters Action | `stores/__tests__/useUiStore.test.ts` (new) |
| T004 | Write Unit Tests for applyPinnedView Action | `stores/__tests__/useUiStore.test.ts` (new) |
| T005 | Write Unit Tests for Modal/Sheet Actions | `stores/__tests__/useUiStore.test.ts` (new) |

### Frontend Implementation Tasks (FE) - 15 tasks

| ID | Task | File(s) | Memo |
|----|------|---------|------|
| T006 | Create Hydration-Safe Store Wrapper | `stores/useUiStore.ts` | - |
| T007 | Refactor page.tsx to Use Store Selectors (Phase 1) | `app/page.tsx` | - |
| T008 | Refactor page.tsx Callbacks to Use Store Actions | `app/page.tsx` | - |
| T009 | Refactor BookmarkToolbar to Consume Store Directly | `components/bookmarks/BookmarkToolbar.tsx` | Yes |
| T010 | Refactor BookmarkListView to Consume Store Selectors | `components/bookmarks/BookmarkListView.tsx` | - |
| T011 | Refactor BookmarkList to Remove Filter Props | `components/bookmarks/BookmarkList.tsx` | - |
| T012 | Refactor SpacesSidebar to Use Store Selectors | `components/spaces/SpacesSidebar.tsx` | Yes |
| T013 | Update SpacesSidebar Props in page.tsx | `app/page.tsx` | - |
| T014 | Refactor BookmarkFormModal to Use Store Overlay State | `components/bookmarks/BookmarkFormModal.tsx` | - |
| T015 | Update BookmarkFormModal Usage in page.tsx | `app/page.tsx` | - |
| T016 | Refactor ImportExportModal to Use Store Overlay State | `components/bookmarks/ImportExportModal.tsx` | - |
| T017 | Update ImportExportModal Usage in page.tsx | `app/page.tsx` | - |
| T018 | Refactor BottomSheet Spaces to Use Store State | `app/page.tsx` | - |
| T019 | Refactor useKeyboardShortcuts Integration | `hooks/useKeyboardShortcuts.ts` | - |
| T020 | Update useKeyboardShortcuts Usage in page.tsx | `app/page.tsx` | - |

---

## Dependency Graph

```
T001 (Add Zustand)
  ↓
T002 (Create useUiStore) ← T006 (Hydration Wrapper)
  ↓
T003-T005 (Unit Tests - can run in parallel)
  ↓
T007-T008 (page.tsx Refactor - foundation)
  ↓
T009-T012 (Toolbar/ListView/Sidebar Refactor - parallel)
  ↓
T013-T018 (Modal/Overlay Refactor - parallel after T012)
  ↓
T019-T020 (Keyboard Shortcuts - final integration)
```

---

## Acceptance Criteria

From Epic:

- [ ] Zustand store exists with state + actions
- [ ] `app/page.tsx` no longer uses `useState` for global UI state
- [ ] Components read state via selectors (minimum rerenders)
- [ ] Keyboard shortcuts call store actions directly
- [ ] Render reduction pass applied (memo on Toolbar + Sidebar)
- [ ] No hydration mismatch introduced
- [ ] Basic unit tests for store actions exist

Performance verification:

- [ ] Typing search does not rerender unrelated UI (sidebar, modals)
- [ ] Switching tag/sort/space feels instant
- [ ] Opening/closing modals does not cause full list rerender

---

## Progress Tracking

See `progress.md` for detailed task status and completion logs.
