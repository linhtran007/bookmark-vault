---
title: Theme Toggle Epic — Light / Dark / System
stack: Next.js (App Router) + TailwindCSS v4 + TypeScript
scope: class-based dark mode + persisted preference + UI toggle
non_goals:
  - No redesign of components
  - No new color palette
  - No backend work
---

# EPIC: Dark Mode / Light Mode (User-Controlled)

## Reference
Follow the rules in `.claude/skills/fe-desginer/SKILL.md`:
- Use **class-based dark mode** (toggle `dark` on `<html>`)
- Persist user preference to `localStorage`
- Ensure every surface/text/border has `dark:*` equivalents (no light-only UI)

## Epic Goal
Let users choose **Light / Dark / System** theme with:
- Zero/low “flash” on load
- Persistent preference across refresh
- Consistent colors and readable contrast in both modes

## Decisions (Confirmed)
- Modes: **Light / Dark / System**
- Default: **System**

## Definition of Done
- `ThemeToggle` exists and is reachable from the main header
- Theme preference persists in `localStorage` (e.g. `bookmark-vault-theme`)
- `dark` class is applied to `<html>` based on the resolved theme:
  - `light` → no `dark`
  - `dark` → add `dark`
  - `system` → follow `prefers-color-scheme` and update live
- Tailwind `dark:` variants work via **class-based** strategy (not only media)
- App surfaces (canvas/cards/modals/inputs) render correctly in both modes
- No hydration mismatch or UI jump from theme switching

---

## Current State (What We’re Fixing)
- `dark:*` classes exist across components, but there is no app-level theme preference or toggle.
- `app/globals.css` uses `@media (prefers-color-scheme: dark)` for CSS variables, which doesn’t support a manual Light/Dark override.

---

## Epic Tasks (Short List)

### 1) Add theme storage + resolver
- Add a small theme module:
  - `getStoredTheme()` / `setStoredTheme()`
  - `resolveTheme(mode)` → `light|dark` (system uses matchMedia)
- Ensure safe behavior when `localStorage` is unavailable.

### 2) Enable Tailwind class-based dark variant
- Update `app/globals.css` to enable class-based `dark:` variant (Tailwind v4 style).
- Ensure the app uses a single strategy (avoid mixing “dark via media” and “dark via class”).

### 3) Prevent theme flash on first paint
- Apply theme class as early as possible:
  - Inline bootstrap script in `app/layout.tsx` (before first render)
  - Or a dedicated `ThemeScript` component placed in layout
- Goal: correct theme before the UI paints.

### 4) Build `ThemeToggle` UI
- Add a compact toggle in the header:
  - Options: Light / Dark / System
  - Accessible labels + keyboard navigation
  - Clear selected state
- Reuse existing UI primitives from `components/ui`.

### 5) Live update for System mode
- When user selects System:
  - listen to `matchMedia('(prefers-color-scheme: dark)')`
  - update `<html class="dark">` automatically when OS theme changes

### 6) Theme audit + polish pass
- Verify common primitives in both themes:
  - `components/ui/Button.tsx`
  - `components/ui/Input.tsx`
  - `components/ui/Modal.tsx`
  - `components/ui/BottomSheet.tsx`
  - `components/ui/Select.tsx`
  - key screens: `app/layout.tsx`, `app/page.tsx`, bookmark cards/toolbars/modals
- Fix any missing `dark:*` colors and contrast issues.

### 7) Tests (lightweight)
- Add/adjust unit tests for theme resolver and storage helpers.
- Smoke-test: toggling theme updates `<html>` class and persists preference.

---

## Acceptance Criteria
- Switching theme updates UI immediately without layout shift
- Refresh preserves user choice
- System mode correctly tracks OS changes
- No components become unreadable in dark mode (text/border/background contrast)
