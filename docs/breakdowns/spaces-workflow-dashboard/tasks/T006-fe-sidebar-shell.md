# T006: FE - Create sidebar shell component

- **ID**: T006
- **State**: `pending`

## Business Summary
Adds a left sidebar foundation to make Spaces and pinned views discoverable.

## Logic
Create a sidebar container to render:
- current space selector
- pinned views list
- dashboard blocks (stats + recently added)

## Technical Logic
- Create `components/spaces/SpacesSidebar.tsx` as a client component.
- Keep it composable (subcomponents allowed if file grows).

## Testing
- No FE tests (per decision). Verify via manual UI.

## Files
- Create: `components/spaces/SpacesSidebar.tsx`

## Reference Patterns
- Card/layout styling: `components/bookmarks/BookmarkToolbar.tsx:39`
- App page composition: `app/page.tsx:42`
