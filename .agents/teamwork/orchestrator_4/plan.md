# Plan: ape-parel Graphic Creator Portal & Financial Reconciliation Engine

## Overview
Implement self-service creator onboarding, storefront customization (/creators/[slug]), graphic asset upload with strict validation (transparency, 300 DPI, format verification, watermarked web previews, secure local filesystem storage), comprehensive double-entry financial accounting/reconciliation, and Prisma schema expansion with complete audit logging.

## Execution Phases
1. **Phase 0: Survey & Scoping (Explorers x3)**
   - Explorer Survey 1: Inspect existing Prisma schema, migrations, DB seed, and baseline tests. Identify required Prisma model extensions (`CreatorStorefrontSettings`, `ArtworkFileSpec`, `CommissionRule`, `FinancialAccount`, `ReconciliationReport`, `AuditEvent`).
   - Explorer Survey 2: Inspect existing artwork upload/storage, mockups, image processing, licensing tiers, and API routes. Identify requirements for strict format enforcement, 300 DPI verification, transparency check, watermarking, and local storage (`public/uploads`).
   - Explorer Survey 3: Inspect existing royalty calculation (`src/lib/royalties.ts`), orders (`src/lib/orders.ts`), and creator dashboards. Map requirements for immutable double-entry bookkeeping (GMV, 15% platform commission, 85% creator royalty accruals, payout disbursements), reconciliation engine, and `/creator/earnings` dashboard.
2. **Phase 1: Database Schema Expansion & Audit Tracing (Prisma & Migration)**
   - Extend Prisma schema with required models.
   - Run prisma generate / db push / seed updates.
   - Implement audit event logging utility (`src/lib/audit.ts`).
3. **Phase 2: Graphic Asset Upload & Strict Format Enforcement**
   - Implement image/asset validation engine (PNG transparency verification, 300 DPI metadata/dimension inspection, SVG vector check, TIFF/JPEG support).
   - Implement automated watermarked preview generation (canvas/sharp/pure-js or node-canvas) and secure master storage abstraction under `public/uploads`.
   - Implement licensing tier configuration (Standard, Commercial, Extended in THB) and API endpoints.
4. **Phase 3: Creator Onboarding & Storefront Management**
   - Onboarding & profile registration form (slug validation, bio, avatar, banner, social links).
   - Public storefront `/creators/[slug]` adhering to ape-parel design tokens (`#131718` Ink Black, `#EBE7DF` Paper Beige, `#D4B996` Warm Kraft).
5. **Phase 4: Comprehensive Financial Accounting, Ledger & Reconciliation Engine**
   - Double-entry bookkeeping ledger: GMV, 15% platform commission deduction, 85% creator royalty accrual, payout disbursements.
   - Reconciliation engine with balance-conservation check (`sum(Credits) - sum(Debits) == Current Balance`).
   - Payout state transitions (`REQUESTED` -> `SETTLED`) with audit entries.
   - Creator Financial Dashboard (`/creator/earnings`).
6. **Phase 5: Verification, Hardening & Sentinel Victory Claim**
   - Full test execution (268 baseline tests + new unit & integration tests).
   - Adversarial testing & Forensic audit.
   - TypeScript check (`npx tsc --noEmit`) and Next.js build (`npm run build`).
   - Report to Sentinel for victory audit.
