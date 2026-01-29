# Tag Management UI - Breakdown Summary

## Repo Context Summary

| Aspect | Details |
|--------|---------|
| **Framework** | Next.js 14 App Router, React 19, TypeScript (strict) |
| **Styling** | TailwindCSS, lucide-react icons |
| **Storage** | `localStorage` with in-memory cache (`lib/storage.ts:17`) |
| **Bookmark Key** | `bookmark-vault-bookmarks` |
| **Tag Storage** | Tags are `string[]` in each Bookmark (`lib/types.ts:38`), no centralized registry |
| **Tag Utilities** | `getUniqueTags()` in `lib/bookmarks.ts:11-17` returns sorted unique tags |
| **Tag Input** | `TagInput.tsx` with autocomplete suggestions |
| **Bookmark CRUD** | `updateBookmark()` at `lib/storage.ts:178` sets `updatedAt` on changes |
| **Settings Pattern** | `SettingsSection.tsx` wrapper, `app/settings/page.tsx` for composition |
| **State Management** | BookmarksContext + reducer (`hooks/useBookmarks.ts`), syncs automatically on write |
| **Toasts** | `sonner` for notifications |

## Before/After Analysis

### Before Change (Current Behavior)

| Aspect | Current State |
|--------|---------------|
| **Tag Visibility** | Only visible when adding/editing individual bookmarks via TagInput |
| **Tag Management** | No UI exists - users cannot view, rename, or delete tags |
| **Tag Counts** | `getUniqueTags()` returns only tag names, no usage counts |
| **Tag Persistence** | Tags remain as denormalized strings in each bookmark |
| **Evidence** | `lib/bookmarks.ts:11-17` only returns `string[]`, no count data |

### After Change (Target Behavior)

| Aspect | New State |
|--------|-----------|
| **New Route** | `/settings/tags` shows all unique tags with usage counts |
| **Actions** | Each tag row has "Rename" and "Delete" buttons |
| **Rename Flow** | Modal with input, preview of affected bookmarks, validation (no empty, max 50 chars, no duplicates) |
| **Delete Flow** | Confirmation dialog showing affected bookmark count |
| **Propagation** | Changes update all affected bookmarks immediately via `updateBookmark()` |
| **Autocomplete** | TagInput reflects renamed/deleted tags in suggestions |

## Decisions + Q&A Answers

### Q&A Results

| Question | Answer | Rationale |
|----------|--------|-----------|
| Delete tags with many bookmarks? | **A: Allow with confirmation** | Simpler UX, confirmation dialog is sufficient protection |
| Rename case-sensitivity? | **B: Exact match only** | Safer, more predictable, aligns with simple string replacement |
| Empty state handling? | **A: Show message** | Clear user feedback, consistent with other empty states |
| Unit tests required? | **Yes** | Small test suite for tagsStorage.ts functions |

### Design Decisions

1. **New storage module** (`lib/tagsStorage.ts`) follows existing pattern (`lib/spacesStorage.ts`) for consistent architecture
2. **Dedicated route** (`/settings/tags`) follows existing settings pattern (`/settings/page.tsx`)
3. **Bulk operations** use existing `updateBookmark()` - no new sync logic needed
4. **Optimistic updates** via existing BookmarksContext reducer pattern

## Task Tree

| ID | Action | Task | Status |
|----|--------|------|--------|
| T001 | Create | Tag Storage Module | [tasks/T001-create-tag-storage-module.md](./tasks/T001-create-tag-storage-module.md) |
| T002 | Modify | Bookmark Update Function for Bulk Tag Updates | [tasks/T002-modify-bookmark-update-function.md](./tasks/T002-modify-bookmark-update-function.md) |
| T003 | Create | Tag Management Page Route | [tasks/T003-create-tag-management-page-route.md](./tasks/T003-create-tag-management-page-route.md) |
| T004 | Create | Tag List Component | [tasks/T004-create-tag-list-component.md](./tasks/T004-create-tag-list-component.md) |
| T005 | Create | Rename Tag Modal | [tasks/T005-create-rename-tag-modal.md](./tasks/T005-create-rename-tag-modal.md) |
| T006 | Create | Delete Tag Modal | [tasks/T006-create-delete-tag-modal.md](./tasks/T006-create-delete-tag-modal.md) |
| T007 | Modify | Add Tags Section to Settings | [tasks/T007-modify-add-tags-section.md](./tasks/T007-modify-add-tags-section.md) |
| T008 | Modify | Update TagInput with Dynamic Suggestions | [tasks/T008-modify-taginput-suggestions.md](./tasks/T008-modify-taginput-suggestions.md) |
| T009 | Create | Unit Tests for Tag Storage | [tasks/T009-create-unit-tests.md](./tasks/T009-create-unit-tests.md) |
| T010 | Run | Lint and Typecheck | [tasks/T010-run-lint-typecheck.md](./tasks/T010-run-lint-typecheck.md) |

## Progress

See [progress.md](./progress.md) for ongoing status updates.
