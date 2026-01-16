## Bookmark Vault

A bookmark manager built with Next.js App Router, TailwindCSS, and TypeScript. Data persists in `localStorage` (client-side only).

## Stack

- Next.js (App Router)
- React 19
- TypeScript (strict)
- TailwindCSS
- Zod (validation)
- `localStorage` (persistence)
- Framer Motion (Modal/BottomSheet animation)
- Sonner (toasts)

## Conventions

- Functional components only.
- Any component/hook that touches `window`, `document`, or `localStorage` must be a client component (`"use client"`).
- Prefer small components (< 100 lines): split UI into primitives + feature modules.
- Use UI primitives from `components/ui` (and the barrel `@/components/ui` where possible).

## Key Hooks (What They Do)

- `hooks/useBookmarks.ts`
  - Source of truth for bookmark state (Context + reducer).
  - Loads bookmarks on the client after mount to avoid hydration mismatch.
  - Exposes CRUD (`addBookmark`, `updateBookmark`, `deleteBookmark`) and `importBookmarks`.
  - Handles optimistic UI + error toasts.

- `hooks/useBookmarkForm.ts`
  - Form state + Zod validation for create/edit.
  - Returns input values, errors, and a submit handler used by the modal.

- `hooks/useImportBookmarks.ts`
  - Import flow state machine: reads JSON file text, validates with `BookmarkSchema`, shows preview.
  - Supports merge/replace + duplicate handling.

- `hooks/useKeyboardShortcuts.ts`
  - Keyboard shortcuts for focusing inputs, opening/closing modals, and clearing search.

## Happy Path (User Flow)

1. Click **Add bookmark** → modal opens → fill title/url/description/tags → **Save** → toast confirms.
2. Use **Search**, **Tag**, and **Sort** controls to filter the list.
3. Edit or delete a bookmark from the list (edit modal / delete sheet).
4. Click the **Import/Export** icon → modal opens:
   - Export downloads `bookmarks-YYYY-MM-DD.json`.
   - Import selects a JSON file → preview → choose mode/options → import.

## Folder Structure

```text
app/
  layout.tsx              # Providers (e.g. ToastProvider)
  page.tsx                # Home: toolbar + list + modals
components/
  bookmarks/              # Feature UI modules
    BookmarkFormModal.tsx
    BookmarkToolbar.tsx
    ImportExportModal.tsx
    ...
  ui/                     # UI primitives (+ `components/ui/index.ts` barrel)
    Button.tsx
    Input.tsx
    Modal.tsx
    Select.tsx
    ToastProvider.tsx
    ...
hooks/                    # State + behaviors
  useBookmarks.ts
  useBookmarkForm.ts
  useImportBookmarks.ts
  useKeyboardShortcuts.ts
lib/                      # Storage + validation + types
  storage.ts
  validation.ts
  types.ts
public/
docs/
```
