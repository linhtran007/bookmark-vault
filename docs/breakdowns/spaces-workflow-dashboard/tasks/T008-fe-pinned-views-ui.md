# T008: FE - Implement pinned views UI

- **ID**: T008
- **State**: `pending`

## Business Summary
Pinned views provide a 1-click return path, increasing daily usage.

## Logic
From the current UI state (selected space + filters), user can:
- save a pinned view by name
- see pinned views under current space
- click a pinned view to apply filters
- delete pinned view

## Technical Logic
- Use `lib/pinnedViewsStorage.ts`.
- Pinned view stores: `spaceId + searchQuery + tag + sortKey`.
- Decide handling of duplicate names (block or overwrite) and record in SUMMARY.md.

## Testing
- No FE tests. Manual verification.

## Files
- Modify: `components/spaces/SpacesSidebar.tsx`
- Optional create: `components/spaces/PinnedViewForm.tsx`

## Reference Patterns
- Filter state source: `app/page.tsx:17`
- Clear all filters behavior: `components/bookmarks/BookmarkListView.tsx:50`
