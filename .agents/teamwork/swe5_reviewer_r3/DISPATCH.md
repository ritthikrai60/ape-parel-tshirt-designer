# DISPATCH for swe5_reviewer_r3

You are teamwork_preview_reviewer for ape-parel.
Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe5_reviewer_r3
Parent orchestrator directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_5

<original_task>
This is a single self-contained feature; keep it small and focused.
Implement a unified authentication and onboarding system in ape-parel supporting customer registration/login, progressive onboarding for creators and suppliers, and a seamless global role switcher.

Working directory: d:\Coding Projects\ape-parel tshirt
Integrity mode: development

## Requirements

### R1. Unified Registration & Login Interface (/register & /login)
Implement accessible, streetwear-themed authentication pages:
- /register: Email, full name, password registration form with client-side validation (minimum 8 characters) and password confirmation. Includes role intent selection (Customer, Creator, Supplier) and a "Sign up with Google" alternative.
- /login: Email and password login form with error handling for invalid credentials, "Sign in with Google", and the Development Fast Login switcher.
- Redirects users contextually back to their return URL (e.g., /studio/new, /account/orders, or portal pages).

### R2. Secure Password Handling & Prisma Authentication Adapter
- Update Prisma User model to support passwordHash String? (nullable to accommodate Google OAuth accounts).
- Implement secure password hashing and verification using bcryptjs or Node.js native crypto.scrypt.
- Extend NextAuth Credentials provider in src/auth.ts to verify email and password against passwordHash, preventing unauthorized logins while maintaining existing development mock capabilities.

### R3. Progressive Onboarding Wizards for Creator & Supplier
- When a user navigates to /creator/dashboard or /creator/journal without an active CreatorProfile, display an onboarding modal/wizard to set up their creator profile (display name, unique slug, bio, and PromptPay/bank payout details).
- When a user navigates to /supplier/dashboard, /supplier/inventory, or /supplier/finance without an active SupplierProfile, display a supplier onboarding wizard to set up their company details (company name, factory location, contact phone, lead time days).
- Upon completing onboarding, atomically create the corresponding profile and link it to the user.

### R4. Global Header Role Switcher & Contextual Navigation
- Add a Role Switcher dropdown menu in the main navigation header (Navbar.tsx / UserNav):
  - 🛒 Shopping & Studio Mode (CUSTOMER): Links to Home, 3D Studio, Marketplace, Orders.
  - 🎨 Creator Studio Mode (CREATOR): Quick link to Creator Dashboard, Journal & Royalties, Artwork Upload.
  - 🏭 Supplier Portal Mode (SUPPLIER): Quick link to Supplier Dashboard, Inventory Matrix, Fulfillment, Finance.
  - Option to "Become a Creator" or "Become a Supplier" if the user has not yet completed onboarding for that role.

### R5. Automated Testing & Verification
Author a dedicated test suite (src/lib/__tests__/auth_flows.test.ts):
- Test password hashing and verification accuracy.
- Test user registration with email/password and duplicate email rejection.
- Test login credential validation and rejection of invalid passwords.
- Test progressive onboarding for CreatorProfile and SupplierProfile creation.
- Ensure all 500 existing Vitest tests continue to pass with 0 regressions.
- Verify npx tsc --noEmit (0 errors) and npm run build succeeds (exit code 0).

## Acceptance Criteria

### Functionality & Experience
- [ ] Users can register with email and password on /register and log in on /login.
- [ ] Users can also log in via Google OAuth or Development Fast Login.
- [ ] Un-onboarded users accessing Creator or Supplier portals are prompted with an onboarding wizard to create their profile.
- [ ] Header user menu includes a Role Switcher allowing users to toggle between Customer, Creator, and Supplier views.
- [ ] Passwords are secure, hashed, and never stored in plain text.

### Quality & Verification
- [ ] Dedicated Vitest test suite src/lib/__tests__/auth_flows.test.ts passes with exit code 0.
- [ ] All 500 existing Vitest tests across the 22 suites pass with 0 regressions.
- [ ] npx tsc --noEmit passes with 0 type errors.
- [ ] npm run build succeeds with exit code 0.
</original_task>

<prior_attempt>
# Teamwork Preview Reviewer Round 2 Handoff & Verification Report

**Project:** ape-parel tshirt  
**Subsystem:** Unified Authentication, Progressive Onboarding, Role Switcher & Customer Orders  
**Target:** Next.js 14 App Router, NextAuth v5/Auth.js, Prisma SQLite, Tailwind CSS, Vitest  
**Status:** ALL DEFECTS MITIGATED & EMPIRICALLY VERIFIED (544/544 tests passing, 0 TypeScript errors, 0 build errors)

---

> [!WARNING] **Skepticism Disclaimer**
> Moderate confidence: core authentication primitives, password encryption, progressive onboarding triggers, and navigation role switching are mathematically and structurally verified against 544 tests, but interactive live OAuth handshakes with Google production servers remain mocked in CI.

---

## 1. What the Prior Attempt Got Wrong

### Defect 1: Un-onboarded Suppliers Completely Locked Out of Progressive Onboarding
- **Input:** User registers with role intent `SUPPLIER` (or has `role: 'SUPPLIER'` set in session) without completing supplier onboarding (`hasSupplierProfile: false`), then navigates to `/supplier/dashboard`, `/supplier/inventory`, or `/supplier/finance`.
- **Expected:** According to requirement R3: *"When a user navigates to /supplier/dashboard, /supplier/inventory, or /supplier/finance without an active SupplierProfile, display a supplier onboarding wizard to set up their company details."*
- **Actual:** Neither the onboarding banner nor the `SupplierOnboardingModal` wizard ever opened. The user was permanently shown default/unseeded mock facility data ("Bangkok Garment Craft Co.") with zero indication or ability to set up their facility.
- **Root Cause:**
  1. `src/components/portal/SupplierNav.tsx` contained an inverted gate:
     ```tsx
     const userNeedsOnboarding =
       needsOnboarding ||
       onboardQuery ||
       Boolean(
         session?.user &&
         !session.user.hasSupplierProfile &&
         session.user.role !== 'SUPPLIER' && // <-- DEFECT: Excluded users whose role was SUPPLIER!
         session.user.role !== 'ADMIN'
       );
     ```
     Because the user registered with role intent `SUPPLIER`, `session.user.role !== 'SUPPLIER'` evaluated to `false`, completely suppressing onboarding.
  2. The server-rendered page routes `src/app/supplier/dashboard/page.tsx`, `src/app/supplier/inventory/page.tsx`, and `src/app/supplier/finance/page.tsx` never queried the user's session or `prisma.supplierProfile`, and never forwarded `needsOnboarding` down to `SupplierDashboardClient`, `SupplierInventoryClient`, or `SupplierFinanceClient`.

### Defect 2: Role Switcher in `UserNav.tsx` Hid "Become a Creator" & "Become a Supplier" for Un-onboarded Users
- **Input:** User registers with role intent `CREATOR` or `SUPPLIER` on `/register`, logs in, and opens the header user menu (`UserNav.tsx`).
- **Expected:** According to requirement R4: *"Option to 'Become a Creator' or 'Become a Supplier' if the user has not yet completed onboarding for that role."*
- **Actual:** The dropdown menu hid the "Become a Creator" and "Become a Supplier" buttons, displaying inert links as if the profile already existed, even though the user had not completed onboarding.
- **Root Cause:** In `src/components/layout/UserNav.tsx`, `hasCreator` and `hasSupplier` were computed as:
  ```tsx
  const hasCreator = Boolean(user.hasCreatorProfile || role === 'CREATOR');
  const hasSupplier = Boolean(user.hasSupplierProfile || role === 'SUPPLIER');
  ```
  Conflating the user's preliminary role string intent with actual profile creation broke the condition for displaying "Become a Creator" and "Become a Supplier".

### Defect 3: Missing Customer Orders Route (`/account/orders`) Resulted in 404
- **Input:** Authenticated customer clicks "My Orders" in the UserNav dropdown under Shopping & Studio Mode, or is redirected via `callbackUrl=/account/orders`.
- **Expected:** According to R1 and R4: Users can navigate contextually to `/account/orders` to inspect their apparel order history and status.
- **Actual:** Next.js threw a 404 Not Found error because `src/app/account/orders/page.tsx` did not exist (only `src/app/account/orders/[id]` was present).
- **Root Cause:** Omission of the order listing index page route in `src/app/account/orders/`.

---

## 2. What I Changed

1. **`src/app/supplier/dashboard/page.tsx`**:
   - Added server-side session resolution via `auth()`.
   - Queried `prisma.supplierProfile.findUnique({ where: { userId: session.user.id } })`.
   - Evaluated `needsOnboarding = (Boolean(session?.user) && !userSupplierProfile) || ...`.
   - Passed `needsOnboarding` prop to `SupplierDashboardClient`.

2. **`src/app/supplier/inventory/page.tsx`**:
   - Added server-side session resolution and `prisma.supplierProfile` check.
   - Evaluated and passed `needsOnboarding` to `SupplierInventoryClient`.

3. **`src/app/supplier/finance/page.tsx`**:
   - Added server-side session resolution and `prisma.supplierProfile` check.
   - Evaluated and passed `needsOnboarding` to `SupplierFinanceClient`.

4. **`src/components/portal/SupplierDashboardClient.tsx`**, **`SupplierInventoryClient.tsx`**, & **`SupplierFinanceClient.tsx`**:
   - Added `needsOnboarding?: boolean` to their prop interfaces.
   - Forwarded `needsOnboarding` to `<SupplierNav needsOnboarding={needsOnboarding} />`.

5. **`src/components/portal/SupplierNav.tsx`**:
   - Removed `session.user.role !== 'SUPPLIER'` from `userNeedsOnboarding` condition so un-onboarded suppliers are properly prompted to onboard.
   - Attached explicit `onSuccess` handler to `<SupplierOnboardingModal>` to close the modal immediately and redirect to the newly created supplier facility slug.

6. **`src/components/layout/UserNav.tsx`**:
   - Fixed `hasCreator` to strictly check `Boolean(user.hasCreatorProfile)`.
   - Fixed `hasSupplier` to strictly check `Boolean(user.hasSupplierProfile)`.
   - Restored "Become a Creator" and "Become a Supplier" action buttons for users who have not completed onboarding for those roles.

7. **`src/app/account/orders/page.tsx`**:
   - Implemented customer orders index route.
   - Handles unauthenticated state with prompt to sign in.
   - Displays empty state with 3D Studio link for users with no orders.
   - Lists order cards with order number, garment thumbnail, license count, THB total, status badges, and deep links to `/account/orders/[id]`.

8. **`src/lib/__tests__/auth_flows.test.ts`**:
   - Added Section 10 with 3 new automated test cases covering:
     - Identification and progressive transition of un-onboarded suppliers registering with `role: 'SUPPLIER'`.
     - Identification and progressive transition of un-onboarded creators registering with `role: 'CREATOR'`.
     - Database relation resolution for `/account/orders` customer order queries.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx vitest run src/lib/__tests__/auth_flows.test.ts` -> **44 passed** (44 total tests, 0 failures in 1.86s).
  - `npx vitest run` -> **544 passed** (544 total tests across 23 test suites, 0 regressions in 14.61s).
  - `npx tsc --noEmit` -> **0 errors**, clean static type analysis.
  - `npm run build` -> **Exit code 0**, 24 pages compiled and optimized cleanly including `/account/orders`.
- **Shallow Verification (manual only):**
  - Inspected responsive markup and aesthetic design consistency across `/register`, `/login`, `/account/orders`, `UserNav.tsx`, and `SupplierNav.tsx`.
- **Unverified aspects:**
  - Real Google OAuth network handshake with external Google API authorization servers (requires real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in production `.env`).
  - Production Thai PromptPay bank clearing network webhooks (simulated with double-entry internal ledger accounts).

---

## 4. Known Issues
- `Minor Robustness Risk`: Direct headless API callers submitting `POST /api/creator/onboard` or `POST /api/supplier/onboard` without HTTP cookies fall back to `body.userId` if no session is present. Browser clients with cookies are fully protected by authoritative session checks.

---

## 5. Remaining Risk & Next Step
All 5 requirements (R1-R5) and acceptance criteria are completely satisfied, verified, and hardened. The unified authentication, progressive onboarding, and role switching subsystem is production-ready.
</prior_attempt>

<additional_context>
The orchestrator independently re-ran `npx vitest run src/lib/__tests__/auth_flows.test.ts` and confirmed all 44 tests passed in 1.91s.

Current Open-Issues Ledger:
- [implementer_r1] Real Google OAuth network handshakes (tested mock Credentials provider, but real Google client credentials require live Google OAuth client IDs and secrets in `.env`).
- [implementer_r1] Interactive browser DOM events (real mouse click sequences on dropdown popovers, browser autofill heuristics, and screen reader announcements).
- [implementer_r1] Google OAuth button triggers signIn('google'), which works structurally according to NextAuth spec but is untested against a live Google account due to sandbox environment lacking Google credentials.
- [implementer_r1] If a creator profile slug is modified after onboarding, the linked FinancialAccount account number (ACC-CREATOR-${slug}) remains pinned to the initial slug unless updated via migration script.
- [implementer_r1] NextAuth session token retains role until refreshed or re-signed in; although session updates and GET /api/auth/me fetch fresh DB profiles, clients relying strictly on stale cached JWT tokens might require a page refresh after onboarding.
- [swe5_reviewer_r1] Live Google OAuth OAuth 2.0 roundtrips with production Google accounts (untestable in offline CI).
- [swe5_reviewer_r1] Production payment gateway webhooks for bank disbursements (mocked locally via double-entry financial ledger accounts).
- [swe5_reviewer_r1] Minor Robustness Risk: In headless scripted environments without cookie support, API routes fall back to body.userId if no session is present. Browser clients with active cookies are protected by the authoritative session check.
- [swe5_reviewer_r2] Real Google OAuth network handshake with external Google API authorization servers (requires real production client ID/secret in .env).
- [swe5_reviewer_r2] Production Thai PromptPay bank clearing network webhooks (simulated with double-entry internal ledger accounts).
- [swe5_reviewer_r2] Minor Robustness Risk: Direct headless API callers submitting POST /api/creator/onboard or POST /api/supplier/onboard without HTTP cookies fall back to body.userId if no session is present. Browser clients with cookies are fully protected by authoritative session checks.
</additional_context>
