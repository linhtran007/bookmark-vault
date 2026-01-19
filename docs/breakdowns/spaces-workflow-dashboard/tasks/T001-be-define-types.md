# T001: BE - Define Space/PinnedView types

- **ID**: T001
- **State**: `pending`

## Business Summary
Introduce typed contracts for Spaces and pinned views to enable safe persistence and UI integration.

## Logic
Add new entities (`Space`, `PinnedView`) and add `spaceId` to bookmarks so the rest of the system can filter and render by “space”.

## Technical Logic
- Modify `Bookmark` to include `spaceId: string`.
- Add:
  - `export interface Space { id: string; name: string; color?: string; createdAt: string }`
  - `export interface PinnedView { id: string; spaceId: string; name: string; searchQuery: string; tag: string; sortKey: SortKey; createdAt: string }`
- Keep types small; IDs are UUID strings (pattern already used by bookmarks).

## Testing
- No direct tests (covered via T005 tests for storage + migration).

## Files
- Modify: `lib/types.ts`

## Reference Patterns
- Bookmark type shape: `lib/types.ts:12`
- SortKey type: `lib/bookmarks.ts:3`
