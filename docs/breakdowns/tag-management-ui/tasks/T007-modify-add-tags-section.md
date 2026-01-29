# T007: Add Tags Section to Settings

**Action:** Modify  
**Business Summary:** Add "Tags" section to `/settings` page linking to the new tag management route.

## Logic

New SettingsSection with description and a link/button to navigate to `/settings/tags`.

## Technical Logic

- Add new `SettingsSection` in `app/settings/page.tsx`
- Title: "Tags"
- Description: "Rename or delete tags across all your bookmarks"
- Content: Link or button to navigate to `/settings/tags`
- Use existing `SettingsSection` component

## Risk & Avoidance

| Risk | Mitigation |
|------|------------|
| Navigation | Use Next.js `Link` component for client-side navigation |
| Layout | Match existing sections spacing and style |

## Testing

Manual - verify section appears and links work

## State

pending

## Files

- `app/settings/page.tsx` (modify)

## Patterns

- `app/settings/page.tsx:17-36` - Existing section pattern

## Reference

`components/settings/SettingsSection.tsx` - Section wrapper

## Reference Skill

bookmark-patterns

## Skill Picker

Read/Edit - Read settings page, edit to add section

## Mermaid (After)

```mermaid
graph TD
    A[/settings] --> B[SettingsSection: Cloud Sync]
    A --> C[SettingsSection: Appearance]
    A --> D[SettingsSection: API]
    A --> E[SettingsSection: Tags]:::highlight
    E --> F[Link to /settings/tags]
    class highlight fill:#f9d
```
