# T016: FE - Bookmark form: space dropdown + default selection

- **ID**: T016
- **State**: `pending`

## Business Summary
When users work inside a Space, newly added bookmarks should land in that space by default, with an explicit dropdown to override.

## Logic
- Add “Space” dropdown to Add/Edit Bookmark form
- Default to the current selected space (from page state)
- Edit mode preserves existing bookmark space

## Technical Logic
- Add `spaceId` to bookmark form state.
- Pass `defaultSpaceId` into `BookmarkFormModal`.
- Use `getSpaces()` to populate dropdown options.
- When `defaultSpaceId === 'all'`, fallback to `Personal`.

## Testing
- No FE tests. Verify manually.

## Files
- Modify: `app/page.tsx`
- Modify: `components/bookmarks/BookmarkFormModal.tsx`
- Modify: `hooks/useBookmarkForm.ts`
- Modify: `components/BookmarkFormFields.tsx`

## Reference Patterns
- Form fields module: `components/BookmarkFormFields.tsx:26`
- Form hook: `hooks/useBookmarkForm.ts:37`
- Spaces source: `lib/spacesStorage.ts:47`
