# T013: FE/BE - Import/Export compatibility for spaceId

- **ID**: T013
- **State**: `pending`

## Business Summary
Keeps backups reliable and prevents breaking existing user files.

## Logic
- Export includes `spaceId` when present.
- Import tolerates missing `spaceId` and unknown space ids by normalizing to Personal.

## Technical Logic
- Add a normalization step when importing bookmarks:
  - if `spaceId` missing → assign Personal
  - if `spaceId` references deleted/unknown space → assign Personal
- Prefer extracting normalization to `lib/` so it can be unit tested (fits BE-test-only decision).

## Testing
- Add/extend unit tests if normalization extracted into `lib/` (recommended).

## Files
- Modify: `hooks/useImportBookmarks.ts`
- Optional create: `lib/spaceNormalize.ts`
- Modify: `components/bookmarks/ImportExportModal.tsx` only if copy needs update

## Reference Patterns
- Import parse/validate pattern: `hooks/useImportBookmarks.ts:28`
- Bookmark schema: `lib/validation.ts`
