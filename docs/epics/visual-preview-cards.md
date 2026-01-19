---
title: Visual Preview Cards Epic — Bookmark Vault
stack: Next.js (App Router) + TailwindCSS + TypeScript
scope: rich bookmark previews + caching + refresh
non_goals:
  - No auth / sharing
  - No full reader mode
  - No analytics
---

# EPIC: Visual Preview Cards (Wow Link UI)

## Epic Goal
Make bookmarks feel premium by showing link previews (favicon, domain, OG image, description) while keeping the app fast and reliable.

## Definition of Done
- Cards show preview metadata when available:
  - favicon + domain
  - preview title + short description
  - optional OG image thumbnail (safe size constraints)
- Preview fetching is resilient (timeouts, invalid URL handling)
- Previews are cached locally and do not refetch aggressively
- User can manually refresh preview per bookmark
- Core actions (open/edit/delete/copy) always work even if preview fails

## Key Decisions Needed
- Preview fetch strategy:
  - Option A (recommended): Next.js route handler `/api/link-preview?url=` to fetch + parse server-side (avoids CORS)
  - Option B: client-only fetch (often blocked by CORS; less reliable)

---

## Tasks (Agent-Friendly)

### 1) Define preview model
- Decide where preview lives:
  - extend `Bookmark` with optional preview fields, OR
  - separate `BookmarkPreview` record keyed by bookmark `id`/normalized URL
- Include: `faviconUrl`, `siteName`, `ogImageUrl`, `previewTitle`, `previewDescription`, `lastFetchedAt`, `status`

### 2) Implement preview fetcher
- URL validation + allowlist rules
- Fetch HTML with strict limits (timeout, max bytes)
- Parse meta tags: `og:title`, `og:description`, `og:image`, `twitter:*`, fallback to `<title>`

### 3) Add caching + refresh policy
- Cache preview in storage
- Add stale policy (ex: refetch after 7 days)
- Add per-bookmark “Refresh preview” action

### 4) Update `BookmarkCard` UI
- Add preview thumbnail slot with fallback
- Add favicon + domain line
- Add loading skeleton and error fallback state

### 5) Settings (optional, quick win)
- Toggle: “Show preview images” (reduce noise/perf)

## Acceptance Criteria
- Adding a URL results in a rich card (wow)
- Slow/blocked URLs never freeze the UI
- Long text still respects truncation/marquee rules
