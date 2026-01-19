# T017: FE - Responsive Spaces UI (mobile bottom sheet)

- **ID**: T017
- **State**: `pending`

## Business Summary
On mobile, the sidebar is too tall; move Spaces navigation into a bottom sheet for a cleaner, faster experience.

## Logic
- Desktop: keep left sidebar
- Mobile/tablet: show a compact “Spaces” button that opens a bottom sheet with the same content

## Technical Logic
- Use `components/ui/BottomSheet`.
- Hide desktop sidebar on small screens (`hidden lg:block`).
- Add a mobile “Spaces” bar above the list (`lg:hidden`).
- Make desktop sidebar sticky (`lg:sticky lg:top-6`).

## Testing
- No FE tests. Verify manually.

## Files
- Modify: `app/page.tsx`
- Modify: `components/spaces/SpacesSidebar.tsx`

## Reference Patterns
- BottomSheet primitive: `components/ui/BottomSheet.tsx:15`
- Existing desktop grid: `app/page.tsx:80`
