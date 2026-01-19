# T003: BE - Create pinned views storage module

- **ID**: T003
- **State**: `pending`

## Business Summary
Allow users to save views and return with one click, boosting daily engagement.

## Logic
Persist pinned views per space and support basic CRUD.

## Technical Logic
- Create `lib/pinnedViewsStorage.ts`.
- Storage key: `bookmark-vault-pinned-views`.
- Implement:
  - `getPinnedViews(spaceId?: string): PinnedView[]`
  - `addPinnedView(input): PinnedView`
  - `deletePinnedView(id): boolean`
  - (optional) `updatePinnedView(view): PinnedView | null`
- Enforce minimal validation:
  - `name.trim()` non-empty
  - normalize empty fields: `searchQuery: ''`, `tag: 'all'`, `sortKey: 'newest'`

## Testing
- Covered by T005 unit tests.

## Files
- Create: `lib/pinnedViewsStorage.ts`

## Reference Patterns
- JSON parse safety: `lib/storage.ts:14`
- Derivation fields live in: `app/page.tsx:17`
