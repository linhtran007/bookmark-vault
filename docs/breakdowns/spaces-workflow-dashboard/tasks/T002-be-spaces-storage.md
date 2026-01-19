# T002: BE - Create spaces storage module

- **ID**: T002
- **State**: `pending`

## Business Summary
Persist spaces across sessions so users can maintain organization.

## Logic
Implement localStorage-backed CRUD for spaces, with a safe default `Personal` space.

## Technical Logic
- Create `lib/spacesStorage.ts`.
- Storage key: `bookmark-vault-spaces`.
- Implement:
  - `getSpaces(): Space[]`
  - `addSpace(input): Space`
  - `updateSpace(space): Space | null`
  - `deleteSpace(spaceId): boolean`
  - `ensureDefaultSpace(): Space` (creates/returns Personal)
- SSR-safe (`typeof window === 'undefined'`) and resilient JSON parsing.

## Testing
- Covered by T005 unit tests with mocked `localStorage`.

## Files
- Create: `lib/spacesStorage.ts`

## Reference Patterns
- localStorage parse/save safety: `lib/storage.ts:14`
- Local storage flags approach: `lib/onboarding.ts`
