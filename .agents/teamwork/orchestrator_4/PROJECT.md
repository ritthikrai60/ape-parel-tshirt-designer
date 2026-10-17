# Project: ape-parel Graphic Creator Portal & Financial Reconciliation Engine

## Architecture
ape-parel Graphic Creator Portal & Financial Reconciliation Engine expands the marketplace with self-service creator onboarding, customizable storefronts (/creators/[slug]), strict graphic asset validation (transparency, 300 DPI, vector SVG check, watermarked web previews, secure local filesystem storage), comprehensive double-entry financial accounting/reconciliation, and Prisma schema expansion with full audit logging.

```
                  ┌──────────────────────────────────────────────┐
                  │            Creator Onboarding UI             │
                  │        (/creator/onboarding, /register)      │
                  └───────────────────────┬──────────────────────┘
                                          │ Profile & Settings
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │           Creator Public Storefront          │
                  │    (/creators/[slug] with Custom Banners,    │
                  │      Badges, Socials, Tiered Licensing)      │
                  └───────────────────────┬──────────────────────┘
                                          │ Upload Masters
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │         Graphic Asset Validation Engine      │
                  │   (Sharp: 300 DPI, Alpha Transparency,       │
                  │    SVG Vector Bypass, Watermarked Previews)  │
                  └───────────────────────┬──────────────────────┘
                                          │ Author-Defined Licenses
                                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Authoritative Commerce & Ledger                      │
│ - Order Placement (Base + Print + Pack + Ship + Licensing Fees)         │
│ - Dual-Layer Accounting:                                                │
│   • Layer 1: Legacy RoyaltyObligation & RoyaltyLedgerEntry (Preserved)  │
│   • Layer 2: Double-Entry FinancialAccount & JournalEntry               │
│     (125 GMV = 19 Platform (15%) + 106 Creator Accruals (85%))          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Financial Reconciliation Engine                        │
│ - 4-Way Matching (Orders <-> Obligations <-> Ledger <-> Settlements)    │
│ - Balance Conservation: sum(Credits) - sum(Debits) == Current Balance   │
│ - Automated Audit Reporting & Anomaly Detection                         │
│ - /creator/earnings Dashboard, Statement Exports & Payout Flows         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
Every feature from user request (R1–R4) and survey is enumerated below with its assigned milestone.
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | CreatorStorefrontSettings Model | Prisma model for custom store slug, bio, banner, avatar, social links, theme preferences, featured artworks | M1 | R4 |
| 2 | ArtworkFileSpec Model | Prisma model for storage path, mime type, width, height, DPI, color space, transparency, vector flag, watermarked preview, file size | M1 | R4 |
| 3 | CommissionRule Model | Prisma model for platform rate (15%), creator rate (85%), effective dates, active status | M1 | R4 |
| 4 | FinancialAccount & JournalEntry Models | Prisma models for double-entry bookkeeping (CREATOR, PLATFORM, ESCROW accounts) with DEBIT/CREDIT journal entries | M1 | R4 |
| 5 | ReconciliationReport Model | Prisma model for reconciliation audit results (GMV, commission, royalties, matched items, discrepancy count, balance conservation status) | M1 | R4 |
| 6 | AuditEvent Extensions & Service | Enhanced audit logging with actorId and metadata JSON payload tracking all price adjustments, uploads, and payouts | M1 | R4 |
| 7 | Modular Storage Service | Local filesystem abstraction (`public/uploads/masters` and `public/uploads/previews`) with clean pluggable interface | M2 | R2 |
| 8 | Asset Format & DPI Validation | Sharp-powered inspection: PNG alpha transparency enforcement, raster >= 300 DPI check, SVG vector bypass, aspect ratio limits | M2 | R2 |
| 9 | Automated Watermarked Web Previews | Sharp-powered SVG watermark overlay generation (`APE-PAREL • ROYALTY PROTECTED`) protecting master print files | M2 | R2 |
| 10 | Licensing Tier Configuration API | Creator-defined THB pricing for Standard, Commercial, Extended tiers (`POST /api/artworks/upload`, `PATCH /api/artworks/[id]/licenses`) | M2 | R2 |
| 11 | Creator Artwork Upload UI | Front-end upload interface with drag-and-drop, format validation feedback, and license pricing controls | M2 | R2 |
| 12 | Creator Onboarding & Registration | Self-service registration page (`/creator/onboarding`) and API (`POST /api/creators/register`) validating slug uniqueness and visual branding | M3 | R1 |
| 13 | Enhanced Public Storefront | `/creators/[slug]` rendering full-bleed banners, verification badge, social media icons, curated portfolios, and licensing tier cards | M3 | R1 |
| 14 | ape-parel Design Token Styling | Streetwear-inspired UI using Ink Black (`#131718`), Paper Beige (`#EBE7DF`/`#F5F0E8`), and Warm Kraft (`#D4B996`/`#DABA98`) | M3 | R1 |
| 15 | Double-Entry Accounting Service | Double-entry journal recording GMV, 15% platform commission, 85% creator royalty accrual, and payout disbursements with balance conservation | M4 | R3 |
| 16 | Financial Reconciliation Engine | 4-way matching engine verifying sum(Credits) - sum(Debits) == Current Balance for every creator, with automated anomaly reports | M4 | R3 |
| 17 | Payout Request Lifecycle | Transition from `REQUESTED` to `SETTLED` with immutable ledger audit entries and PromptPay/Bank reference tracking | M4 | R3 |
| 18 | Creator Financial Dashboard | `/creator/earnings` displaying pending vs cleared royalties, lifetime payouts, platform fee breakdown, and statement downloads | M4 | R3 |
| 19 | Financial Statement Downloads | CSV and JSON downloadable statement exports itemizing orders, gross GMV, platform fees, net royalties, and running balances | M4 | R3 |
| 20 | Zero-Regression Verification & Hardening | Complete verification ensuring all 268 baseline tests pass + ~60 new tests pass, zero TypeScript errors, clean Next.js production build | M5 | AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Schema Expansion & Audit Infrastructure | Prisma schema extensions (CreatorStorefrontSettings, ArtworkFileSpec, CommissionRule, FinancialAccount, JournalEntry, ReconciliationReport), db push, seed updates, audit service | none | DONE |
| M2 | Graphic Asset Upload & Strict Format Enforcement | Storage abstraction (`public/uploads`), Sharp validation engine (PNG transparency, 300 DPI, SVG vector check, watermarking), upload & licensing APIs, upload UI | M1 | PLANNED |
| M3 | Creator Onboarding & Storefront Management | Self-service onboarding page & API, slug uniqueness, public storefront enhancements (/creators/[slug]), brand design tokens | M1 | PLANNED |
| M4 | Comprehensive Financial Accounting & Reconciliation | Double-entry bookkeeping, 15%/85% splits, reconciliation engine, /creator/earnings dashboard, CSV statements, payout request flow | M1 | PLANNED |
| M5 | E2E Hardening, Adversarial Verification & Victory Audit | Zero-regression execution of 268 baseline tests + ~60 new tests, npx tsc, npm run build, adversarial stress tests, Forensic Audit | M2, M3, M4 | PLANNED |

## Interface Contracts
### Storage ↔ Validation ↔ Artwork
- `StorageService.saveMaster(buffer, filename, mimeType)` -> `{ storageKey, relativeUrl, absolutePath }`
- `StorageService.savePreview(buffer, filename, mimeType)` -> `{ storageKey, relativeUrl, absolutePath }`
- `validateAndProcessArtwork(fileBuffer, originalFilename, mimeType, options)` -> `{ isValid, metadata, masterStorageKey, previewStorageKey, error }`

### Financial Accounting ↔ Orders & Reconciliation
- `recordOrderFinancialTransactions(tx, order, items, commissionRule)` -> creates double-entry journal entries for GMV, platform commission (15%), and creator accrual (85%)
- `runFinancialReconciliation(options)` -> `{ isBalanced, totalGmv, totalCommission, totalRoyalties, creatorReconciliations, reportId }`
- Invariant: `sum(Credits) - sum(Debits) === currentBalance`

### Storefront ↔ Onboarding
- `registerCreatorProfile(input)` -> `{ success, creator, settings }`
- `GET /api/creators/[slug]` -> `{ creator, settings, artworks, licensingTiers }`

## Code Layout
- `prisma/schema.prisma`: Authoritative database schema with R4 models (DONE in M1)
- `prisma/seed.mjs`: Database seeding with backward-compatible teardown and initial accounts (DONE in M1)
- `src/lib/audit.ts`: Unified audit logging service (DONE in M1)
- `src/lib/storage.ts`: Modular local filesystem storage service (`public/uploads`)
- `src/lib/assetValidation.ts`: Sharp-powered format, transparency, 300 DPI, and watermark engine
- `src/lib/financialAccounting.ts`: Double-entry accounting transaction helper
- `src/lib/reconciliation.ts`: 4-way financial reconciliation engine and balance-conservation validator
- `src/app/api/artworks/upload/route.ts`: Multipart artwork upload handler
- `src/app/api/artworks/[id]/licenses/route.ts`: Licensing tier management handler
- `src/app/api/creators/register/route.ts`: Creator registration handler
- `src/app/creator/onboarding/page.tsx`: Creator onboarding client page
- `src/app/creators/[slug]/page.tsx`: Enhanced public storefront
- `src/app/creator/earnings/page.tsx`: Creator financial dashboard
- `src/app/api/creator/earnings/route.ts`: Creator earnings metrics & payout trigger
- `src/app/api/creator/statements/route.ts`: Financial statement export (CSV/JSON)
