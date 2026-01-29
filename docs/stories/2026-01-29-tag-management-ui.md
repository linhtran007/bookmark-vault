---
Output_To_Story_File: Yes
Checksum: 3f7c8e2a1b4d6f9c0e2a4b8c6d0e2f4a8b1c4d6e
---

## Add Tag Management UI for rename/delete with reference updates

## User intent (what user wants)
- **User**: End user of Bookmark Vault
- **Goal**: Rename or delete tags from a dedicated UI, with automatic updates to all affected bookmarks
- **Why now**: Tags currently exist only as strings in bookmarks with no management capabilities; users cannot fix typos or consolidate duplicate tags

## Support needed (what I, the agent, will provide)
- What I will do: Analyze current tag storage, propose solution, create tag storage module with rename/delete, build management UI page, update autocomplete to reflect changes
- What I will not do: Tag colors/categories, hierarchical tags, related tag suggestions

## How the user uses this (current flow)
- Entry point: No current entry point (feature doesn't exist)
- Steps:
  1. User cannot view all unique tags in collection
  2. User cannot rename a tag across all bookmarks
  3. User cannot delete unused tags
  4. Tags are only visible when adding/editing individual bookmarks
- Current outputs / side effects: N/A (feature doesn't exist)

## Repo evidence (NO assumptions)
- `lib/types.ts:38` — `tags: string[]` in Bookmark type
- `lib/bookmarks.ts:11-17` — `getUniqueTags()` derives unique tags from bookmarks
- `lib/storage.ts:178-189` — `updateBookmark()` updates single bookmark, sets `updatedAt`
- `components/bookmarks/TagInput.tsx:13-18` — `parseTags()` converts comma-separated string to array
- `components/settings/SettingsSection.tsx` — Settings page section pattern to follow

## Problem statement (what's wrong / missing)
- Tags exist only as denormalized strings in each bookmark
- No centralized tag registry or management UI
- Users cannot rename a tag (e.g., "reactjs" → "react") across all bookmarks
- Users cannot delete unused or misspelled tags systematically
- No visibility into tag usage counts

## Proposed solution (recommended)
- Behavior change:
  - Add new `/settings/tags` route with tag management page
  - Page shows list of all unique tags with usage counts
  - Each tag row has "Rename" and "Delete" actions
  - Rename opens modal with input and preview of affected bookmarks
  - Delete opens confirmation with affected bookmarks count
  - Changes propagate to all bookmarks immediately
  - Autocomplete in TagInput reflects renamed tags

- Where changes happen:
  - `lib/tagsStorage.ts` (new) — Tag storage module
  - `app/settings/tags/page.tsx` (new) — Tag management page
  - `components/tags/TagManagement.tsx` (new) — Main tag list component
  - `components/tags/RenameTagModal.tsx` (new) — Rename dialog
  - `components/tags/DeleteTagModal.tsx` (new) — Delete confirmation
  - `components/settings/index.ts` — Export new settings section
  - `app/settings/page.tsx` — Add Tags section to settings

- Data changes:
  - Create `lib/tagsStorage.ts` module with functions:
    - `getTags()` — returns `{ name: string, count: number }[]`
    - `renameTag(oldName: string, newName: string)` — bulk update bookmarks
    - `deleteTag(name: string)` — remove tag from all bookmarks
    - No new schema; tags remain strings in bookmarks

- Error handling:
  - Rename: prevent empty/whitespace names, validate max 50 chars
  - Rename: show error if new name already exists
  - Delete: confirm before proceeding, show affected count
  - Both: toast notification on success/failure

- Backwards compatibility: Tags remain strings; existing bookmarks work unchanged

## Alternatives considered
1. **Separate Tag Entity** — Create `Tag` type with id, store in separate collection
   - Pros: Enables future features (colors, categories, synonyms)
   - Cons: Requires migration, more complex, bigger scope
   - Chosen: No, too large for this story

2. **Inline in Settings** — Add tag management to existing settings page without new route
   - Pros: Fewer files, faster to implement
   - Cons: Clutters settings page, no dedicated URL
   - Chosen: No, dedicated page follows existing patterns

3. **Bulk Edit from List View** — Add rename/delete in bookmark list with multi-select
   - Pros: Contextual, less navigation
   - Cons: More complex UI state, unclear UX
   - Chosen: No, dedicated UI is clearer

## Acceptance criteria (must be testable)
- [ ] `/settings/tags` route shows all unique tags with usage counts
- [ ] Clicking "Rename" opens modal with current name pre-filled
- [ ] Renaming updates all affected bookmarks immediately
- [ ] Tag autocomplete shows renamed tag after change
- [ ] Clicking "Delete" shows confirmation with affected bookmark count
- [ ] Deleting removes tag from all bookmarks
- [ ] Toast notifications appear on success/failure
- [ ] No duplicate tags after rename operation
- [ ] Tags with count=0 can still be renamed/deleted
- [ ] Existing bookmarks without affected tags unchanged

## Implementation plan (tasks)
1. Create `lib/tagsStorage.ts` with `getTags()`, `renameTag()`, `deleteTag()`
2. Add `updateBookmarksByTag()` helper in `lib/storage.ts` (or tagsStorage)
3. Create `app/settings/tags/page.tsx` route
4. Build `components/tags/TagManagement.tsx` with tag list
5. Build `components/tags/RenameTagModal.tsx` dialog
6. Build `components/tags/DeleteTagModal.tsx` confirmation
7. Add Tags section to `app/settings/page.tsx`
8. Update `components/bookmarks/TagInput.tsx` to use new tag functions
9. Add unit tests for tag storage functions
10. Run lint and typecheck

Include:
- Code touch points: `lib/storage.ts`, `lib/bookmarks.ts`, `app/settings/page.tsx`
- Migrations: None (tags remain strings)
- Feature flags: None

## Testing plan
- Unit tests:
  - `renameTag()` updates all bookmarks with old tag name
  - `renameTag()` handles empty/duplicate names
  - `deleteTag()` removes tag from all bookmarks
  - `getTags()` returns correct counts
- Integration:
  - Navigate to `/settings/tags` shows list
  - Rename flow updates UI and bookmarks
  - Delete flow updates UI and bookmarks
- Manual QA:
  - Create bookmarks with tags, verify counts
  - Rename tag, verify all bookmarks updated
  - Delete tag, verify tag removed from bookmarks
  - Check autocomplete reflects changes

## Risks & open questions
- Risks: None significant; simple string replacement in arrays
- Open questions: Should we prevent deleting tags with many bookmarks? (Recommend: No, confirm dialog is sufficient)

## Out of scope
- Tag colors or categories
- Hierarchical/parent-child tags
- Tag synonyms or aliases
- Related tag suggestions (co-occurrence)
- Domain-based tag suggestions
- Bulk import/export of tags
- Tag permissions or sharing

## Follow-ups
- Tag colors/categories for visual organization (future story)
- Domain tag suggestions in autocomplete (future story)
- Related tags co-occurrence (future story)
