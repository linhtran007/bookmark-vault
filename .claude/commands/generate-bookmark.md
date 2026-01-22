---
description: Generate bookmark-related code (component, hook, test, or type)
---

# Generate Bookmark Code

Generate code for the Bookmark Vault project based on argument provided.

**Arguments:** `$ARGUMENTS`

## Generation Rules

Based on the argument, generate appropriate code following Bookmark Vault patterns:

### If argument contains "component"
Generate a new React component:
- Add `"use client"` directive at top
- TypeScript with strict types (interface Props)
- TailwindCSS for styling (utility classes only)
- Keep under 100 lines (split if larger)
- Props pattern: `interface ComponentNameProps { ... }`
- Import UI primitives from `components/ui`
- Export as default function

**Files to check:**
- `components/bookmarks/` - Bookmark feature components
- `components/ui/` - Reusable UI primitives
- `lib/types.ts` - Type definitions
- `lib/validation.ts` - Zod schemas

### If argument contains "hook"
Generate a custom hook:
- Follow naming: `useBookmarkXxx` pattern
- Includes loading/error states
- Return typed interface
- Handle async operations with try/catch
- Use `useCallback` for callbacks
- Include dependencies in `useEffect`
- Export from `hooks/` directory

**Files to check:**
- `hooks/useBookmarks.ts` - Main state management pattern
- `hooks/useSyncEngineUnified.ts` - Sync pattern
- `hooks/useImportBookmarks.ts` - State machine pattern
- `lib/types.ts` - Return type definitions

### If argument contains "test"
Generate Jest/React Testing Library test:
- Mock `localStorage` with `jest.mock`
- Mock API calls with `fetch` mock
- Test happy path first
- Test error cases
- Use `screen.getByRole()` for queries (never `getByTestId`)
- Render with `render()` from React Testing Library
- Clean up after each test

**Files to check:**
- `__tests__/` - Existing test patterns
- `jest.config.js` - Jest configuration
- `lib/types.ts` - Types used in tests

### If argument contains "type"
Generate TypeScript types/schemas:
- Define interface in `lib/types.ts`
- Create Zod schema in `lib/validation.ts`
- Use `z.infer<typeof SchemaName>` pattern
- Export both interface and schema
- Add JSDoc comments
- Include optional fields where needed

**Files to check:**
- `lib/types.ts` - Interface definitions (146 lines)
- `lib/validation.ts` - Zod schemas (126 lines)
- Check existing patterns for naming

## Code Generation Template

When generating code, follow this template:

```typescript
// Component example
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui";
import type { Bookmark } from "@/lib/types";

interface [ComponentName]Props {
  // props definition
}

export default function [ComponentName]({
  // destructure props
}: [ComponentName]Props) {
  // component logic

  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

## Output Format

For each generated code:

1. **Code block** with full implementation
2. **Placement** - Exact file path where to save
3. **Imports** - What to import in consuming files
4. **Dependencies** - Any new packages needed
5. **Integration** - How to use it in existing code

## Quality Checklist

- [ ] Follows project naming conventions
- [ ] Uses correct TypeScript patterns
- [ ] TailwindCSS over inline styles
- [ ] Proper error handling
- [ ] Type-safe (no `any` types)
- [ ] Under 100 lines (split if needed)
- [ ] Imports from correct paths (`@/`)
- [ ] JSDoc comments for complex logic
- [ ] Matches existing code style

## Examples

```
/generate-bookmark component for bookmark tags editor
/generate-bookmark hook for bookmark favorites
/generate-bookmark test for AddBookmarkForm
/generate-bookmark type for bookmark categories
```

## Integration Points

**Components:**
- Register in parent component (Dashboard, BookmarkListView, etc.)
- Add to `components/bookmarks/` or `components/ui/`

**Hooks:**
- Add to `hooks/` directory
- Export from `hooks/index.ts` if creating index
- Use in Context providers or components

**Types:**
- Add interface to `lib/types.ts`
- Add Zod schema to `lib/validation.ts`
- Ensure exports are in `lib/index.ts`

**Tests:**
- Create in `__tests__/[feature].test.ts`
- Mock localStorage: `jest.mock('lib/storage')`
- Mock API: `global.fetch = jest.fn()`
