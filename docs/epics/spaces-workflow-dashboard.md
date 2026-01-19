---
title: Spaces + Pinned Dashboard Epic — Bookmark Vault
stack: Next.js (App Router) + TailwindCSS + TypeScript
scope: spaces, pinned views, dashboards
non_goals:
  - No collaboration
  - No server sync
  - No permissions system
---

# EPIC: Spaces + Workflow + Pinned Dashboard (Wow Organization)

## Epic Goal
Give users a real “vault” structure:
- Spaces (Work/Learning/Personal)
- Pinned views (saved filters)
- A dashboard per space so returning users instantly see what matters

## Definition of Done
- Spaces exist and users can manage them (create/edit/delete)
- Each bookmark belongs to a space (default assigned)
- User can switch space quickly (header or toolbar)
- Pinned views can be saved and opened in 1 click
- Dashboard shows quick stats and “recently added” per space

## Key Decisions Needed
- Default spaces:
  - Option A: create Work/Learning/Personal on first run
  - Option B: start with a single “Personal” space
- “All spaces” mode:
  - include a global view option or keep strictly per-space

---

## Tasks (Agent-Friendly)

### 1) Data model + storage
- `Space`: `{ id, name, color?, createdAt }`
- Bookmark adds `spaceId`
- `PinnedView`: `{ id, spaceId, name, searchQuery, tag, sortKey, status?, createdAt }`

### 2) Space migration
- Existing bookmarks auto-assign to default space

### 3) Space switcher UI
- Add selector + clear visual current space

### 4) Pinned views
- “Save current filters as view”
- List pinned views for the current space
- Clicking a pinned view applies filters instantly

### 5) Dashboard blocks
- Stats: total, unread/inbox count (if status epic exists), unique tags
- “Recently added” (top 5)

### 6) Delete space safety
- On delete: reassign bookmarks to default space (never delete silently)

## Acceptance Criteria
- User can open a pinned view in 1 click (wow)
- Switching spaces is instant and predictable
- No bookmarks lost when deleting spaces
