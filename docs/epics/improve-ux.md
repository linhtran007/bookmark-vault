---
title: UX Improvements Epic — Bookmark Vault
stack: Next.js (App Router) + TailwindCSS + TypeScript + localStorage
scope: productivity + clarity + bulk actions + readability
non_goals:
  - No backend / DB
  - No auth / sharing
  - No analytics
  - No undo delete
---

# EPIC: Improve UX (Daily Productivity)

## Epic Goal
Make Bookmark Vault faster and clearer for daily use:
- Bulk actions for power users (select many, delete once)
- Better handling for long titles/URLs (readable without breaking layout)
- Clear, consistent “filters” behavior (no misleading actions)
- More discoverable keyboard + quick actions

## Definition of Done
- Users can select multiple bookmarks and delete in one confirmed action
- “Select all” works on the current filtered view (search/tag/sort)
- Long titles reveal on hover via marquee (only when overflow, respects reduced motion)
- “Clear filters” truly clears search + tag + sort back to defaults
- Bookmark cards provide at least one fast “copy URL” action
- Shortcut help matches actual supported shortcuts

---

## UX Problems Observed (Current)
- “Clear filters” CTA only clears search (tag/sort remain), causing confusion
- Long titles/URLs are truncated with no built-in way to reveal full text
- No bulk selection or multi-delete flow
- Shortcut UI and shortcut behavior can drift over time

---

## Epic Tasks (Short List)

### 1) Bulk Select + Bulk Delete
- Add selection state (checkbox per card + selected count)
- Add actions bar: Select all (filtered view), Clear selection, Delete selected (N)
- Add destructive confirmation copy for deleting multiple
- Ensure pending state + toasts remain clear during bulk actions

### 2) “Clear Filters” Actually Clears Filters
- Add a single clear action that resets:
  - search query
  - selected tag
  - sort key
- Ensure “No results” empty state uses the clear-filters behavior

### 3) Long Title Marquee-on-Hover (Overflow Only)
- Title stays truncated by default
- On hover/focus: animate marquee only if text overflows
- Respect `prefers-reduced-motion` (fallback to tooltip or no animation)

### 4) Copy URL Quick Action
- Add “Copy URL” on each bookmark card
- Use clipboard API + toast feedback
- Keep it keyboard accessible (button focusable + clear label)

### 5) Sticky Toolbar (Optional, High Value)
- Make toolbar sticky while scrolling long lists
- Ensure it doesn’t cover content and works on mobile

### 6) Active Filter Chips + Reset
- Show active filter indicators (search/tag/sort) as removable chips
- Provide one-click “Reset” that calls clear-filters

### 7) Keyboard Shortcuts: Align + Document
- Ensure supported shortcuts are consistent between:
  - actual handler logic
  - shortcut help popover
- Add at least: open add, focus search, escape clear/close

### 8) Small Empty-State Improvements
- Empty “No bookmarks” and “No results” states include clear next actions
- Copy is short and action-focused

---

## Notes / Decisions
- Bulk delete is in-scope; undo delete is explicitly out-of-scope
- “Select all” applies to the current filtered view to avoid accidental mass deletion
- Marquee is hover/focus only, overflow only, reduced-motion safe
