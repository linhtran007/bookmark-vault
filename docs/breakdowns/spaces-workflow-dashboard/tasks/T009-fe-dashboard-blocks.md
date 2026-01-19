# T009: FE - Implement dashboard blocks

- **ID**: T009
- **State**: `pending`

## Business Summary
Dashboard blocks make the app feel like a “home screen” and create a return habit.

## Logic
Show per-space blocks:
- stats: total bookmarks, unique tags
- recently added: top 5 most recent

## Technical Logic
- Derive from bookmarks already in memory (provider state).
- Recently added uses `createdAt` sorting.
- Keep blocks compact to preserve content focus.

## Testing
- No FE tests. Manual verification.

## Files
- Modify: `components/spaces/SpacesSidebar.tsx`
- Optional create: `components/spaces/SpaceDashboard.tsx`

## Reference Patterns
- Sorting helper: `lib/bookmarks.ts:24`
