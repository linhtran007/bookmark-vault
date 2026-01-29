# T003: Create Tag Management Page Route

**Action:** Create  
**Business Summary:** Create `/settings/tags` page as the entry point for tag management UI.

## Logic

New Next.js page following existing settings route pattern, with proper layout and import structure.

## Technical Logic

- Create `app/settings/tags/page.tsx`
- Client component (needs `useBookmarks`)
- Render `TagManagement` component
- Wrap in standard page layout (padding, max-width)

## Risk & Avoidance

| Risk | Mitigation |
|------|------------|
| Layout consistency | Follow existing settings page structure |
| Hydration | Use `useBookmarks` which handles hydration |

## Testing

Manual - navigate to `/settings/tags` shows page

## State

pending

## Files

- `app/settings/tags/page.tsx` (new)
- `app/settings/tags/` directory

## Patterns

- `app/settings/page.tsx:1-50` - Settings page structure
- `app/layout.tsx:1-20` - Provider structure

## Reference

`components/settings/SettingsSection.tsx` - for section pattern

## Reference Skill

bookmark-patterns

## Skill Picker

Glob/Read/Write - Glob existing settings pages, read pattern, write new page

## Mermaid (After)

```mermaid
graph TD
    A[/settings/tags] --> B[app/settings/tags/page.tsx]
    B --> C[TagManagement component]
    C --> D[Tag list with counts]
    D --> E[Rename/Delete actions]
```
