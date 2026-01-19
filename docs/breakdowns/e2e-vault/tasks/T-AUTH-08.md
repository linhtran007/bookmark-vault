# T-AUTH-08: Create Settings Screen Foundation

**Epic:** Vault Foundations (Auth + DB + API)
**Type:** Frontend
**State:** pending
**Dependencies:** T-AUTH-07

---

## Action

Build settings page structure for vault controls

---

## Business Summary

Provide dedicated space for vault management UI

---

## Logic

1. Create `/settings` route
2. Build settings page layout with sections
3. Add navigation to settings from header
4. Create placeholder sections for vault controls
5. Use existing UI components (Card, Button)

---

## Technical Logic

- Use Next.js App Router conventions
- Follow `app/page.tsx` structure
- Create reusable SettingsSection component
- Add to app navigation
- Make responsive design

---

## Components

### components/settings/SettingsSection.tsx

```typescript
"use client";

import { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="bg-white rounded-lg border p-6 mb-4">
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      )}
      {children}
    </section>
  );
}
```

### app/settings/page.tsx

```typescript
import { SettingsSection } from "@/components/settings/SettingsSection";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <SettingsSection
        title="Vault Mode"
        description="End-to-end encrypt your bookmarks and sync across devices"
      >
        <div className="text-sm text-gray-500 italic">
          Vault controls coming soon...
        </div>
      </SettingsSection>

      <SettingsSection
        title="Account"
        description="Manage your account settings"
      >
        <div className="text-sm text-gray-500 italic">
          Account controls coming soon...
        </div>
      </SettingsSection>
    </div>
  );
}
```

### Update Header with Settings Link

```typescript
// app/layout.tsx or components/Header.tsx
import Link from "next/link";

// In header:
<Link href="/settings" className="text-gray-600 hover:text-gray-900">
  Settings
</Link>
```

---

## Testing

**Integration Test:**
- Verify settings page renders
- Verify sections display correctly
- Verify navigation link works
- Verify responsive layout

---

## Files

**CREATE:**
- `app/settings/page.tsx`
- `components/settings/SettingsSection.tsx`
- `components/settings/index.ts`

**MODIFY:**
- `app/layout.tsx` or `components/Header.tsx` (add settings link)

---

## Patterns

- Follow `app/page.tsx` layout structure
- Use existing UI primitives
- Create reusable section component

---

## Page Structure

```
Settings
├── Vault Mode (placeholder)
│   ├── Enable toggle (coming)
│   ├── Lock/Unlock controls (coming)
│   └── Device list (coming)
├── Account (placeholder)
│   ├── Email verification (coming)
│   └── Sign out (existing)
└── Data (placeholder)
    ├── Import/Export (existing)
    └── Storage usage (coming)
```

---

## Styling

- Use consistent spacing (mb-4, mb-6)
- Match app color scheme
- Use Card component styling
- Add hover states for interactive elements
- Ensure mobile responsiveness

---

## Verification Checklist

- [ ] /settings route created
- [ ] SettingsSection component created
- [ ] Page renders without errors
- [ ] Sections display correctly
- [ ] Settings link added to navigation
- [ ] Responsive on mobile
- [ ] Matches app styling
- [ ] Placeholder text visible
- [ ] No hydration errors

---

## Notes

- This is foundation - vault controls added in later epics
- Consider adding tabs if sections grow large
- Keep settings URL structure flat (/settings, not /settings/vault)
- Add loading states for future async data
- Consider adding breadcrumbs for navigation
- Plan for settings to grow over time
