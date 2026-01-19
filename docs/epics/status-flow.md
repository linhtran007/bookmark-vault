---
title: Status Flow Epic — Bookmark Vault
stack: Next.js (App Router) + TailwindCSS + TypeScript
scope: read-later workflow + quick actions + filters
non_goals:
  - No notifications/reminders
  - No automation rules
---

# EPIC: Status Flow (Wow: Bookmarks Become a Workflow)

## Epic Goal
Turn a bookmark list into a daily workflow so users come back:
- Inbox/Unread to process
- Done/Archive to keep clean
- Fast actions + filters

## Proposed Status Model
- `inbox` (default) → `done`
Optional later: add `reading`

## Definition of Done
- Bookmarks have a `status` field with a default value
- Card has one-click actions: Mark done / Move to inbox
- Toolbar can filter by status and composes with tag/search/sort
- Bulk actions support status changes (if selection exists)

---

## Tasks (Agent-Friendly)

### 1) Types + storage migration
- Add `status` to `Bookmark`
- Migrate existing bookmarks to default (`inbox`)

### 2) UI quick actions
- Add status badge (subtle)
- Add actions on card (button or menu): Done / Inbox

### 3) Status filter
- Add status control in toolbar: All / Inbox / Done

### 4) Empty states
- “Inbox empty” friendly message + CTA (add bookmark)
- “No results” includes clear-filters

### 5) Bulk status changes
- If selection exists: Mark selected done / Move selected to inbox

### 6) Keyboard shortcuts (optional)
- On focused card: `D` done, `I` inbox

## Acceptance Criteria
- User can keep an Inbox and “finish” bookmarks (wow)
- Status filtering works correctly with other filters
- Bulk actions feel safe (confirm when destructive)
