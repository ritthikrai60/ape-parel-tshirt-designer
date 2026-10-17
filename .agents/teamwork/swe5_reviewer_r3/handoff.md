# Teamwork Preview Reviewer Round 3 Handoff & Verification Report

**Project:** ape-parel tshirt  
**Subsystem:** Unified Authentication, Progressive Onboarding, Global Role Switcher & Security Hardening  
**Target:** Next.js 14 App Router, NextAuth v5/Auth.js, Prisma SQLite, Tailwind CSS, Vitest  
**Status:** ALL DEFECTS MITIGATED & EMPIRICALLY VERIFIED (546/546 tests passing across 23 test suites, 0 TypeScript errors, 0 build errors)

---

> [!WARNING] **Skepticism Disclaimer**
> High confidence in database transactions, scrypt password hashing, session RBAC, and contextual role transitions; interactive production Google OAuth authorization server handshakes remain mocked in CI.

---

## 1. What the Prior Attempt Got Wrong

### Defect 1: Headless Identity Hijacking Vulnerability on Progressive Onboarding Endpoints
- **Input:** Headless or malicious unauthenticated HTTP caller submits `POST /api/creator/onboard` or `POST /api/supplier/onboard` with arbitrary `body.userId: "<victim_user_id>"` and attacker payout/contact details without valid session cookies.
- **Expected:** In production, any unauthenticated onboarding request attempting to forge identity via `body.userId` must be rejected immediately with `401 Unauthorized`.
- **Actual:** The prior implementation accepted `body.userId` as a fallback whenever `sessionUserId` was missing (`const userId = sessionUserId || body?.userId;`), allowing unauthenticated API callers to create or hijack creator/supplier profiles for other users.
- **Root Cause:** A test convenience shortcut in `src/app/api/creator/onboard/route.ts` and `src/app/api/supplier/onboard/route.ts` left the fallback active unconditionally without verifying `process.env.NODE_ENV === 'test'`.

### Defect 2: Incomplete Role Switcher Navigation & Stale Context in Header Dropdown
- **Input:** Customer on `/marketplace` opens the UserNav dropdown and clicks "Switch to Creator Mode" (or "Switch to Supplier Mode"). Alternatively, an un-onboarded user clicks "Become a Creator" (or "Become a Supplier") and completes the wizard modal.
- **Expected:** According to R4 ("seamless global role switcher" and "Redirects users contextually"), the user should be switched and immediately navigated to their role's home view (`/creator/dashboard` or `/supplier/dashboard`).
- **Actual:**
  1. `handleSwitchRole` called `router.refresh()` while remaining on the customer page (`/marketplace`), forcing the user to reopen the dropdown and find the dashboard link manually.
  2. The `onSuccess` handlers for `<CreatorOnboardingModal>` and `<SupplierOnboardingModal>` in `UserNav.tsx` merely closed the modal and refreshed the existing page instead of routing to the newly created creator or supplier dashboard.
- **Root Cause:** Incomplete contextual redirection logic in `src/components/layout/UserNav.tsx`.

### Defect 3: Studio In-Modal Auth Lacked Email & Password Alternative
- **Input:** Unauthenticated user customizing apparel in the 3D Studio triggers "Save Custom Design" or "Order Apparel", opening `StudioAuthModal`.
- **Expected:** Unified authentication access allowing users to sign in or register with email/password without losing canvas design state.
- **Actual:** `StudioAuthModal` only displayed Google OAuth and Dev Mock login buttons, omitting links to `/login` and `/register`. Users with credentials had to dismiss the modal and manually navigate away.
- **Root Cause:** Omission of unified email/password navigation links in `src/components/studio/StudioAuthModal.tsx`.

---

## 2. What I Changed

1. **`src/app/api/creator/onboard/route.ts`**:
   - Hardened `userId` resolution: restricted `body.userId` fallback strictly to `process.env.NODE_ENV === 'test'`.
   - In production, unauthenticated requests with `body.userId` are rejected with `401 Unauthorized` (`"You must be signed in to set up a Creator profile."`).

2. **`src/app/api/supplier/onboard/route.ts`**:
   - Hardened `userId` resolution: restricted `body.userId` fallback strictly to `process.env.NODE_ENV === 'test'`.
   - In production, unauthenticated requests with `body.userId` are rejected with `401 Unauthorized` (`"You must be signed in to set up a Supplier profile."`).

3. **`src/components/layout/UserNav.tsx`**:
   - Enhanced `handleSwitchRole` with contextual routing:
     - Switching to `CREATOR` navigates to `/creator/dashboard` if not already on `/creator/*`.
     - Switching to `SUPPLIER` navigates to `/supplier/dashboard` if not already on `/supplier/*`.
     - Switching to `CUSTOMER` navigates to `/` when coming from a portal.
   - Enhanced `CreatorOnboardingModal.onSuccess` and `SupplierOnboardingModal.onSuccess` to navigate to `/creator/dashboard?creator=${slug}` and `/supplier/dashboard?supplier=${slug}` respectively.

4. **`src/components/studio/StudioAuthModal.tsx`**:
   - Added email & password navigation links (`/login?callbackUrl=/studio/new` and `/register?callbackUrl=/studio/new`) directly under the Google OAuth button.
   - Preserves 3D canvas design state in localStorage via `studioStateStorage.ts` across credential sign-in and registration flows.

5. **`src/lib/__tests__/auth_flows.test.ts`**:
   - Added Section 11 with 2 comprehensive test cases:
     - Probed production environment simulation (`process.env.NODE_ENV = 'production'`) ensuring unauthenticated `POST /api/creator/onboard` and `POST /api/supplier/onboard` with `body.userId` reject with `401 Unauthorized`.
     - Verified `StudioAuthModal` renders email/password sign-in and register links with contextual return URLs.
   - Fixed `process.env` typing casting to maintain clean TypeScript compilation.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx vitest run src/lib/__tests__/auth_flows.test.ts` -> **46 passed** (46 total tests, 0 failures in 1.86s).
  - `npx vitest run src/lib/__tests__/studio_auth_modal.test.ts` -> **39 passed** (39 total tests, 0 failures in 115ms).
  - `npx vitest run` -> **546 passed** (546 total tests across 23 test suites, 0 regressions in 14.25s).
  - `npx tsc --noEmit` -> **0 errors**, clean static type analysis.
  - `npm run build` -> **Exit code 0**, all 24 routes statically optimized or server-rendered cleanly.
- **Shallow Verification (manual only):**
  - Inspected responsive markup, role switcher badges, and contextual links across `UserNav.tsx` and `StudioAuthModal.tsx`.
- **Unverified aspects:**
  - Production Google OAuth 2.0 handshake against external Google accounts (requires live `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`).
  - Production Thai PromptPay bank clearing network webhooks (modeled via internal double-entry financial ledger accounts).

---

## 4. Known Issues
- `Shallow Verification`: Real-time browser OAuth redirects with external Google accounts cannot be verified in offline CI without network credentials.
- `Minor Robustness Risk`: If a creator profile slug is renamed after initial creation, the double-entry `FinancialAccount` account number (`ACC-CREATOR-${slug}`) remains pinned to the creation slug unless updated via an account migration.

---

## 5. Remaining Risk & Next Step
All 5 requirements (R1-R5) and acceptance criteria are thoroughly satisfied, verified, and hardened. With 546/546 Vitest tests passing, 0 TypeScript errors, and a clean production build, the unified authentication and progressive onboarding system is production-ready.
