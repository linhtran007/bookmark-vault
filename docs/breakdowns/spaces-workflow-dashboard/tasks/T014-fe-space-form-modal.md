# T014: FE - Space form modal (create + rename)

- **ID**: T014
- **State**: `pending`

## Business Summary
Replace browser prompts with a consistent modal UX for creating and renaming spaces.

## Logic
Users can create and rename spaces using a modal (similar pattern to Add Bookmark).

## Technical Logic
- Create `SpaceFormModal` using `components/ui/Modal`.
- Support modes:
  - `create` (empty initial name)
  - `edit` (prefilled name)
- Validate: name required, trimmed.
- Return created/updated space to caller.

## Testing
- No FE tests (per epic decision). Verify manually.

## Files
- Create: `components/spaces/SpaceFormModal.tsx`

## Reference Patterns
- Modal pattern: `components/bookmarks/BookmarkFormModal.tsx:53`
- Input pattern: `components/ui/Input.tsx`
