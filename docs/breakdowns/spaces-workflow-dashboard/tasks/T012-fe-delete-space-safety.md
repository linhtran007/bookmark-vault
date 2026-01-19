# T012: FE - Delete space safety (reassign to Personal)

- **ID**: T012
- **State**: `pending`

## Business Summary
Prevents data loss and builds trust when users reorganize.

## Logic
When deleting a space (not Personal):
- confirm deletion
- reassign all bookmarks in that space to Personal
- delete the space
- update selection state if needed

## Technical Logic
- Add a bulk update function (either in `hooks/useBookmarks.ts` or `lib/`) that rewrites bookmarks with updated `spaceId`.
- Keep UI responsive; use toast feedback patterns.

## Testing
- Covered by BE tests where possible (migration + storage). Manual UI verification for integration.

## Files
- Modify: `hooks/useBookmarks.ts`
- Modify: `components/spaces/SpacesSidebar.tsx`
- Optional modify: `lib/spacesStorage.ts`

## Reference Patterns
- Bulk operation pattern: `hooks/useBookmarks.ts:350`
- Confirm dialog pattern: `components/ui/ConfirmDialog.tsx`
