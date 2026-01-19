---
title: Tags Power Tools Epic — Bookmark Vault
stack: Next.js (App Router) + TailwindCSS + TypeScript
scope: tag UX, tag management, bulk tagging
non_goals:
  - No AI/ML tagging (heuristics only)
  - No collaboration
---

# EPIC: Tags Power Tools (Wow: Organizing Becomes Effortless)

## Epic Goal
Make tags feel like a real system (not just text): fast to apply, easy to clean up, and powerful for navigation.

## Definition of Done
- Add/Edit form supports tag autocomplete and fast entry
- Users can manage tags (rename/merge/delete) safely
- Bulk actions support add/remove tags for many bookmarks
- Tag filter UI scales to many tags (searchable + grouped)
- Tag UI is consistent in light/dark themes

## Key Decisions Needed
- Tag normalization rules:
  - trim + lowercase
  - enforce max tag count per bookmark?
- Deleting a tag:
  - remove from all bookmarks OR merge into another tag

---

## Tasks (Agent-Friendly)

### 1) Tag input UX upgrade
- Autocomplete suggestions from existing tags
- Support keyboard flow:
  - Enter to add
  - Backspace to remove last
  - Paste comma-separated tags

### 2) Tag normalization + validation
- Centralize normalization in `lib/bookmarks.ts` (or similar)
- Prevent duplicates (`React` + `react`)

### 3) Tag manager screen/modal
- List all tags with counts
- Actions: rename, merge, delete
- Confirm destructive operations

### 4) Bulk tag edit
- When selection exists:
  - Add tag(s) to selected
  - Remove tag(s) from selected
- Clear feedback via toasts

### 5) Tag filter scalability
- Searchable tag dropdown
- Optional: show top tags first + “more…”

### 6) Export/Import compatibility
- Ensure tags remain stable when exporting/importing
- Run normalization on import

## Acceptance Criteria
- User can clean up messy tags quickly (wow)
- Tagging many bookmarks is fast (bulk)
- Tag filter remains usable at 100+ tags
