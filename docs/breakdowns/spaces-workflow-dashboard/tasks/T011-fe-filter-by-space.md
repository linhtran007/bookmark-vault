# T011: FE - Filter pipeline: space → search → tag → sort

- **ID**: T011
- **State**: `pending`

## Business Summary
Space switching must feel instant and correct, without breaking existing filters.

## Logic
Compose filters in a predictable order:
1) space filter
2) search
3) tag
4) sort

## Technical Logic
- Implement space filtering inside `useBookmarkListState` before applying tag/sort.
- Improve tag options to derive from the active space (better UX).

## Testing
- No FE tests. Manual verification.

## Files
- Modify: `components/bookmarks/useBookmarkListState.ts`

## Reference Patterns
- Existing derivation: `components/bookmarks/useBookmarkListState.ts:38`
- Tag options: `components/bookmarks/useBookmarkListState.ts:38`
