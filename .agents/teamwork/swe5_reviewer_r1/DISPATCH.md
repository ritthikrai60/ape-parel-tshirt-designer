# DISPATCH for swe5_reviewer_r1

You are teamwork_preview_reviewer for ape-parel.
Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe5_reviewer_r1
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
# Handoff Report: Unified Authentication, Progressive Onboarding & Global Role Switcher

## 1. Executive Summary
Successfully implemented and verified the unified authentication and progressive onboarding system for **ape-parel**, connecting customer sign-up/login, progressive creator and supplier profile wizards, and seamless multi-mode role switching.

- **Unified Registration & Login**: Accessible, streetwear-themed `/register` and `/login` pages with client-side validation (8+ character password, confirmation matching), role intent selection (`CUSTOMER`, `CREATOR`, `SUPPLIER`), Google OAuth alternative, and Development Fast Login switcher.
- **Secure Password Handling**: Extended Prisma `User` model with nullable `passwordHash String?`, implemented cryptographically secure `crypto.scrypt` hashing with 16-byte random salts and `timingSafeEqual` verification, and updated NextAuth Credentials provider in `src/auth.ts`.
- **Progressive Onboarding Wizards**: Interactive modal wizards (`CreatorOnboardingModal` and `SupplierOnboardingModal`) automatically activated when un-onboarded users navigate to `/creator/dashboard`, `/creator/journal`, `/supplier/dashboard`, `/supplier/inventory`, or `/supplier/finance`, plus dedicated onboarding routes (`/creator/onboarding` and `/supplier/onboarding`).
- **Global Header Role Switcher**: Added `UserNav` and `Navbar` in the global header with mode switcher:
  - 🛒 Shopping & Studio Mode (CUSTOMER)
  - 🎨 Creator Studio Mode (CREATOR)
  - 🏭 Supplier Portal Mode (SUPPLIER)
  - Quick action buttons to "Become a Creator" and "Become a Supplier" with immediate in-page wizard popups.
- **Automated Verification**: Created dedicated Vitest suite `src/lib/__tests__/auth_flows.test.ts` (33 tests). All 533 Vitest tests (500 existing + 33 new) pass with 0 regressions. `npx tsc --noEmit` passes with 0 errors. `npm run build` exits with code 0.

---

## 2. Changes Summary

| Path | Summary of Modifications |
|---|---|
| `prisma/schema.prisma` | Added `passwordHash String?` to `User` model. Synchronized schema via Prisma db push. |
| `src/lib/authUtils.ts` | Implemented `hashPassword`, `verifyPassword` using `crypto.scrypt`, input validations (`validatePassword`, `validateEmail`), user registration (`registerUser`), and `authorizeCredentials` provider logic. |
| `src/lib/onboarding.ts` | Implemented atomic `onboardCreator` (creates `CreatorProfile`, `FinancialAccount`, `CreatorStorefrontSettings`, sets role to `CREATOR`, records `AuditEvent`), `onboardSupplier` (creates `SupplierProfile`, `PrintingService`, sets role to `SUPPLIER`, records `AuditEvent`), and `getUserRoleProfiles`. |
| `src/auth.ts` | Updated Credentials provider to verify password against `passwordHash` while preserving passwordless Development Fast Login for mock dev accounts. Configured custom `pages: { signIn: '/login' }` and enriched JWT/Session callbacks with `role`, `hasCreatorProfile`, `hasSupplierProfile`, `creatorSlug`, and `supplierSlug`. |
| `src/types/next-auth.d.ts` | Extended TypeScript declarations for `Session['user']`, `User`, and `JWT` to strongly type profile flags and slugs. |
| `src/app/api/auth/register/route.ts` | Created `POST /api/auth/register` with validation, duplicate email rejection (HTTP 409), and role intent assignment. |
| `src/app/api/auth/me/route.ts` | Created `GET /api/auth/me` to expose active session and multi-role profile status. |
| `src/app/api/creator/onboard/route.ts` | Created `POST /api/creator/onboard` with authentication check and atomic profile creation. |
| `src/app/api/supplier/onboard/route.ts` | Created `POST /api/supplier/onboard` with authentication check and atomic profile creation. |
| `src/app/register/page.tsx` | Implemented streetwear-themed `/register` page with client-side validations, role intent toggle, and Google sign-up. |
| `src/app/login/page.tsx` | Implemented streetwear-themed `/login` page with credentials authentication, error alerts, dev fast login buttons, and Google sign-in. |
| `src/components/portal/CreatorOnboardingModal.tsx` | Built accessible modal wizard for creator profile setup (display name, unique slug, bio, PromptPay/bank payout details). |
| `src/components/portal/SupplierOnboardingModal.tsx` | Built accessible modal wizard for supplier setup (company name, slug, facility location, phone, lead time days). |
| `src/app/creator/onboarding/page.tsx` | Created dedicated `/creator/onboarding` entry route. |
| `src/app/supplier/onboarding/page.tsx` | Created dedicated `/supplier/onboarding` entry route. |
| `src/components/layout/UserNav.tsx` | Created global header user menu with multi-role switcher (Customer, Creator, Supplier), status badge, and onboarding modal launchers. |
| `src/components/layout/Navbar.tsx` | Created unified brand navigation header integrating `UserNav`. |
| `src/app/layout.tsx` | Integrated `<Navbar />` into RootLayout. |
| `src/components/portal/CreatorDashboardClient.tsx` | Added `needsOnboarding` detection, notice banner, and `<CreatorOnboardingModal />`. |
| `src/components/portal/CreatorJournalClient.tsx` | Added `needsOnboarding` detection and `<CreatorOnboardingModal />`. |
| `src/components/portal/SupplierNav.tsx` | Added session/query param `userNeedsOnboarding` detection, industrial alert banner, and `<SupplierOnboardingModal />` across all supplier sub-pages. |
| `src/app/creator/dashboard/page.tsx` | Added session check and passed `needsOnboarding` and `initialUser` props. |
| `src/app/creator/journal/page.tsx` | Added session check and passed `needsOnboarding` and `initialUser` props. |
| `src/lib/__tests__/auth_flows.test.ts` | Authored 33 test cases covering hashing, validation, registration, login rejection, progressive creator & supplier onboarding, role switcher queries, and API route handlers. |

---

## 3. Verification Record

### 3.1 Unit & Flow Test Suite (`src/lib/__tests__/auth_flows.test.ts`)
Command: `npx vitest run src/lib/__tests__/auth_flows.test.ts`
Result: **33 passed (33)** in 1.25s
- Password hashing generates 16-byte random salt and 64-byte scrypt key.
- Distinct salts generated across multiple hashes of identical plaintext.
- Correct password verification passes; wrong password rejected.
- Corrupt/malformed hashes handled without throwing.
- Minimum 8-character password enforcement and email validation.
- User registration stores `passwordHash` and rejects duplicate emails.
- Credentials provider rejects unauthorized / invalid password attempts.
- Password bypass prevented on accounts with `passwordHash`.
- Development fast login maintained for mock accounts.
- Atomic CreatorProfile creation with `FinancialAccount` (`ACC-CREATOR-${slug}`) and initial 0 THB balance.
- Atomic SupplierProfile creation with default DTG `PrintingService`.
- Rejection of duplicate slugs and duplicate onboardings.
- Role switcher profiles query accurately detects active profile combinations.
- API route handlers (`/api/auth/register`, `/api/creator/onboard`, `/api/supplier/onboard`) return expected status codes and payloads.

### 3.2 Full Regression Test Suite
Command: `npm test` (`vitest run`)
Result: **23 test files passed, 533 tests passed (0 failed)**
- Baseline tests: 500 passed
- New tests: 33 passed
- Regressions: **0**

### 3.3 TypeScript Static Type Check
Command: `npx tsc --noEmit`
Result: **Exit code 0** (0 type errors)

### 3.4 Production Build
Command: `npm run build` (`next build`)
Result: **Exit code 0**
- Successfully compiled all 23 application routes and 14 API routes.
- Static and dynamic routes generated cleanly.
</prior_attempt>

<additional_context>
The orchestrator independently re-ran `npx vitest run src/lib/__tests__/auth_flows.test.ts` and confirmed all 33 tests passed in 1.25s.

Current Open-Issues Ledger:
- [implementer_r1] Real Google OAuth network handshakes (tested mock Credentials provider, but real Google client credentials require live Google OAuth client IDs and secrets in `.env`).
- [implementer_r1] Interactive browser DOM events (real mouse click sequences on dropdown popovers, browser autofill heuristics, and screen reader announcements).
- [implementer_r1] Google OAuth button triggers signIn('google'), which works structurally according to NextAuth spec but is untested against a live Google account due to sandbox environment lacking Google credentials.
- [implementer_r1] If a creator profile slug is modified after onboarding, the linked FinancialAccount account number (ACC-CREATOR-${slug}) remains pinned to the initial slug unless updated via migration script.
- [implementer_r1] NextAuth session token retains role until refreshed or re-signed in; although session updates and GET /api/auth/me fetch fresh DB profiles, clients relying strictly on stale cached JWT tokens might require a page refresh after onboarding.
- [implementer_r1] Attack concurrent creator onboarding submissions attempting to register identical slugs simultaneously at the database lock level.
- [implementer_r1] Test browser autocomplete edge cases when pasting passwords containing special unicode or emoji characters.
- [implementer_r1] Session role refresh without page reload when completing onboarding in-modal.
</additional_context>
