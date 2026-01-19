# T007: FE - Implement spaces list + manage actions

- **ID**: T007
- **State**: `pending`

## Business Summary
Users can see and manage spaces, making organization feel intentional and “pro”.

## Logic
Add UI in the sidebar:
- list spaces
- select active space
- create/rename space
- delete space (with safety constraints)

## Technical Logic
- Use `lib/spacesStorage.ts` CRUD.
- Enforce: `Personal` cannot be deleted.
- Use `ConfirmDialog` for destructive actions.

## Testing
- No FE tests. Manual verification.

## Files
- Modify: `components/spaces/SpacesSidebar.tsx`
- Optional create: `components/spaces/SpaceEditorModal.tsx`

## Reference Patterns
- Confirmation UI: `components/ui/ConfirmDialog.tsx`
- Modal pattern: `components/bookmarks/BookmarkFormModal.tsx`
