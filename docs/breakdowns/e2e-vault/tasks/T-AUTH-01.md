# T-AUTH-01: Install and Configure Clerk Authentication

**Epic:** Vault Foundations (Auth + DB + API)
**Type:** Backend
**State:** pending
**Dependencies:** None

---

## Action

Create Clerk integration with Google OAuth provider

---

## Business Summary

Enable users to sign in with Google accounts, establishing authenticated sessions for vault access

---

## Logic

1. Install `@clerk/nextjs` package
2. Configure Google OAuth in Clerk dashboard
3. Set up environment variables:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
4. Create `middleware.ts` to protect routes
5. Wrap app with `<ClerkProvider>` in `app/layout.tsx`
6. Configure sign-in/sign-up URLs

---

## Technical Logic

- Use Clerk middleware for route protection
- Protect `/api/vault/*` and `/api/sync/*` routes
- Use `auth()` helper to get current user in API routes
- Follow Clerk's Next.js App Router integration guide
- Ensure middleware runs before all API routes

---

## Testing

**Integration Test:**
- Verify unauthenticated users are redirected to sign-in
- Verify authenticated users can access protected routes
- Verify sign-out clears session

---

## Files

**CREATE:**
- `app/middleware.ts`
- `.env.local` (add Clerk keys)

**MODIFY:**
- `app/layout.tsx` (add ClerkProvider)

---

## Patterns

- Follow provider pattern in `app/layout.tsx`
- Reference Clerk documentation for App Router setup
- Use existing error handling patterns

---

## Environment Variables Required

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

---

## Verification Checklist

- [ ] Package installed: `@clerk/nextjs`
- [ ] Environment variables configured in `.env.local`
- [ ] Google OAuth enabled in Clerk dashboard
- [ ] `middleware.ts` created and protecting routes
- [ ] `<ClerkProvider>` wraps app in `layout.tsx`
- [ ] Sign-in page renders correctly
- [ ] Authentication flow works end-to-end
- [ ] Protected routes redirect unauthenticated users

---

## Notes

- Clerk publishable key is safe to expose (starts with `pk_`)
- Clerk secret key MUST NOT be committed (already in `.gitignore`)
- Test with both sign-in and sign-out flows
- Consider adding clerk middleware for public vs private route handling
