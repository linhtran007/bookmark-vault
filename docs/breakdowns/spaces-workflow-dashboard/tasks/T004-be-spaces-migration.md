# T004: BE - Migration: ensure Personal + assign bookmarks

- **ID**: T004
- **State**: `pending`

## Business Summary
Ensure existing users seamlessly gain Spaces without losing bookmarks.

## Logic
On first run after upgrade:
- Ensure `Personal` exists
- Assign any existing bookmark missing `spaceId` to `Personal`

## Technical Logic
- Create `lib/spacesMigration.ts`:
  - `runSpacesMigration()` (client-only)
  - Reads bookmarks via `getBookmarks()`
  - Writes back via `setBookmarks()`
  - Uses `ensureDefaultSpace()` to get personal space id
- Wire to run on mount in `app/page.tsx` similar to onboarding migration.

## Testing
- Covered by T005: unit test migration scenarios.

## Files
- Create: `lib/spacesMigration.ts`
- Modify: `app/page.tsx`

## Reference Patterns
- Existing migration wiring: `app/page.tsx:26` + `lib/migration.ts`
- Storage write pattern: `lib/storage.ts:91`
