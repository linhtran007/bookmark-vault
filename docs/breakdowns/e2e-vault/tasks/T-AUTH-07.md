# T-AUTH-07: Create Auth UI Components

**Epic:** Vault Foundations (Auth + DB + API)
**Type:** Frontend
**State:** pending
**Dependencies:** T-AUTH-01, T-AUTH-06

---

## Action

Build sign-in/sign-out UI with Clerk components

---

## Business Summary

Provide user-friendly authentication interface

---

## Logic

1. Create sign-in button component
2. Create user profile menu with sign-out
3. Style Clerk components to match app theme
4. Handle authentication state changes
5. Add to app layout/header

---

## Technical Logic

- Use Clerk's `<SignInButton>` and `<UserButton>` components
- Wrap in client components with "use client"
- Use existing UI primitives (Button, Modal)
- Handle loading states
- Handle authentication errors

---

## Components

### components/auth/SignInButton.tsx

```typescript
"use client";

import { SignInButton as ClerkSignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui";

export function SignInButton() {
  return (
    <ClerkSignInButton>
      <Button variant="primary">Sign In</Button>
    </ClerkSignInButton>
  );
}
```

### components/auth/UserMenu.tsx

```typescript
"use client";

import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";

export function UserMenu() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">
        {user.firstName || user.emailAddresses[0]?.emailAddress}
      </span>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
```

### components/auth/AuthHeader.tsx (combined)

```typescript
"use client";

import { useAuth } from "@clerk/nextjs";
import { SignInButton } from "./SignInButton";
import { UserMenu } from "./UserMenu";

export function AuthHeader() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <div className="w-20 h-8 bg-gray-200 animate-pulse" />;
  }

  return isSignedIn ? <UserMenu /> : <SignInButton />;
}
```

---

## Testing

**Integration Test:**
- Verify sign-in button shows when not authenticated
- Verify user menu shows when authenticated
- Verify sign-out redirects correctly

---

## Files

**CREATE:**
- `components/auth/SignInButton.tsx`
- `components/auth/UserMenu.tsx`
- `components/auth/AuthHeader.tsx`
- `components/auth/index.ts`

**MODIFY:**
- `app/layout.tsx` (add auth UI to header)

---

## Patterns

- Follow `components/ui/Button.tsx` styling
- Use client components for Clerk hooks
- Export from barrel file (index.ts)

---

## Integration into Layout

```typescript
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { AuthHeader } from "@/components/auth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html>
        <body>
          <header className="border-b px-4 py-2 flex justify-between items-center">
            <h1>Bookmark Vault</h1>
            <AuthHeader />
          </header>
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

---

## Styling Considerations

- Match existing button styles
- Use consistent spacing
- Respect dark mode (if implemented)
- Handle loading states gracefully
- Show user avatar or initials

---

## Verification Checklist

- [ ] SignInButton component created
- [ ] UserMenu component created
- [ ] AuthHeader combines both
- [ ] Components use "use client"
- [ ] Clerk components properly integrated
- [ ] Styles match app theme
- [ ] Barrel export created (index.ts)
- [ ] Added to layout header
- [ ] Sign-in flow works
- [ ] Sign-out flow works
- [ ] Loading states handled

---

## Notes

- Clerk provides default styling - customize with appearance prop
- UserButton includes avatar, name, and sign-out
- Consider adding email verification UI
- Add error boundary for auth errors
- Test on mobile and desktop
- Consider adding "Sign Up" option
