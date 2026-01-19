# T005: BE-TEST - Unit tests for spaces/pinned/migration

- **ID**: T005
- **State**: `pending`

## Business Summary
Guarantee data safety and predictable behavior for Spaces and pinned views.

## Logic
Add Jest unit tests for:
- Spaces storage CRUD
- Pinned views storage CRUD
- Spaces migration (assigning `spaceId` defaults)

## Technical Logic
- Use mocked `localStorage` pattern.
- Keep tests deterministic (fixed timestamps if needed).

## Testing
- Jest unit tests (mandatory).

## Files
- Create: `lib/__tests__/spacesStorage.test.ts`
- Create: `lib/__tests__/pinnedViewsStorage.test.ts`
- Create: `lib/__tests__/spacesMigration.test.ts`

## Reference Patterns
- localStorage mock pattern: `lib/__tests__/storage.test.ts:15`
