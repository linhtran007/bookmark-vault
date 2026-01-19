
**Epic**: [Spaces + Pinned Dashboard](../../epics/spaces-workflow-dashboard.md)
**Generated**: 2026-01-19
**Status**: Ready for Implementation

---

## Project Tech Context

| Area | Value |
|------|-------|
| Framework | Next.js App Router + React 19 |
| Language | TypeScript (strict) |
| Styling | TailwindCSS |
| Persistence | `localStorage` via `lib/storage.ts` (SSR-safe guards) |
| State | Context + reducer in `hooks/useBookmarks.ts` |
| Filtering | Derived list in `components/bookmarks/useBookmarkListState.ts` + helpers in `lib/bookmarks.ts` |
| Testing | Jest configured (`npm test`) |

---

## Architecture Decisions (User Answers)

| Decision | Value | Rationale |
|----------|-------|-----------|
| Default spaces | Single default space: `Personal` | Keep UX minimal to start |
| “All spaces” mode | Yes | Enables global search/navigation |
| Pinned view fields | `spaceId + searchQuery + tag + sortKey` | Keep pinned views simple; status is out-of-scope |
| UI layout | Left sidebar | Best discoverability + “dashboard” feel |
| Testing | BE tests only (Jest), no FE tests, no E2E | Keep scope focused and fast |
| Pinned view duplicate name | Block duplicates per-space | Avoid silent overwrites; simple UX |

---

## Scope & Logic Analysis

### Systems involved
- **Data layer**: introduce `Space[]` and `PinnedView[]` persisted in `localStorage`; add `spaceId` to `Bookmark`.
- **Migration**: existing bookmarks must be auto-assigned to the default `Personal` space.
- **Filtering chain**: space filtering must compose with existing search/tag/sort pipeline.
- **UI**: add a left sidebar for space switching, pinned views, and dashboard stats.
- **Safety**: deleting a space must reassign bookmarks to `Personal` (never silently delete bookmarks).

### Risks
- **Data compatibility**: updating `Bookmark` shape requires safe migration and import tolerance.
- **Derivation correctness**: space + search + tag + sort must remain consistent.

---

## Task Tree Overview

```
spaces-workflow-dashboard/
├── Phase 1: Foundation (BE)
│   ├── T001: BE - Define Space/PinnedView types
│   ├── T002: BE - Create spaces storage module
│   ├── T003: BE - Create pinned views storage module
│   ├── T004: BE - Migration: ensure Personal + assign bookmarks
│   └── T005: BE-TEST - Unit tests for spaces/pinned/migration
│
├── Phase 2: Core UI (FE)
│   ├── T006: FE - Create sidebar shell component
│   ├── T007: FE - Implement spaces list + manage actions
│   ├── T008: FE - Implement pinned views UI
│   └── T009: FE - Implement dashboard blocks
│
├── Phase 3: Integration
│   ├── T010: FE - Add selectedSpaceId state + “All spaces”
│   ├── T011: FE - Filter pipeline: space → search → tag → sort
│   ├── T012: FE - Delete space safety (reassign to Personal)
│   └── T013: FE/BE - Import/Export compatibility for spaceId
│
├── Phase 4: UX Polish (Responsive + Forms)
│   ├── T014: FE - Space form modal (create + rename)
│   ├── T015: FE - Wire space modal into sidebar
│   ├── T016: FE - Bookmark form: space dropdown + default selection
│   └── T017: FE - Responsive Spaces UI (mobile bottom sheet)
└── progress.md
```

---

## Task Details (Condensed)

Each task has its own file under `docs/breakdowns/spaces-workflow-dashboard/tasks/`.

**Reference breakdown format**: `docs/breakdowns/user-foundation/SUMMARY.md`
