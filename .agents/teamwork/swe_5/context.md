# Context: Unified Authentication & Progressive Onboarding System in ape-parel

## Task Overview
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
