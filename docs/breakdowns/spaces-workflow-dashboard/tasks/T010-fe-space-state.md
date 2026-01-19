# T010: FE - Add selectedSpaceId state + “All spaces”

- **ID**: T010
- **State**: `pending`

## Business Summary
Enables users to operate per-space while still supporting global browsing/search.

## Logic
Add a new space selection state in the page:
- `selectedSpaceId = 'all' | <spaceId>`

## Technical Logic
- Update `app/page.tsx` to store and pass `selectedSpaceId`.
- Update sidebar to control this state.
- Update list pipeline to filter by this selection.

## Testing
- No FE tests. Manual verification.

## Files
- Modify: `app/page.tsx`
- Modify: `components/bookmarks/BookmarkList.tsx`
- Modify: `components/bookmarks/useBookmarkListState.ts`
- Modify/Create: `components/spaces/SpacesSidebar.tsx`

## Reference Patterns
- Existing state pattern: `app/page.tsx:17`
