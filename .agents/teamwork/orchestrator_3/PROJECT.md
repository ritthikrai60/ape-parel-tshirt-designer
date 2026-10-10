# Project: ape-parel Apparel Design & Production Marketplace

## Architecture
ape-parel is a creator-powered apparel design and production marketplace connecting Designers, Customers, and Suppliers with an interactive 2D/3D customizer, server-authoritative pricing engine, auditable royalty ledger, and production specification dispatch.

```
                    ┌─────────────────────────┐
                    │    Public Marketplace   │
                    │   & Creator Storefronts │
                    └────────────┬────────────┘
                                 │ Select Artwork / Blank
                                 ▼
                    ┌─────────────────────────┐
                    │  Interactive Studio     │
                    │  - 2D Canvas (Transp)   │
                    │  - 3D Three.js Viewport │
                    └────────────┬────────────┘
                                 │ Configure Design
                                 ▼
                    ┌─────────────────────────┐
                    │ Server Pricing Engine   │
                    │ (Live & Authoritative)  │
                    └────────────┬────────────┘
                                 │ Submit Order
                                 ▼
                    ┌─────────────────────────┐
                    │ Atomic Order & Royalty  │
                    │ - Order Record          │
                    │ - RoyaltyObligations    │
                    │ - RoyaltyLedgerEntries  │
                    └─────┬─────────────┬─────┘
                          │             │
                          ▼             ▼
              ┌───────────────┐     ┌───────────────────────┐
              │ Supplier Jobs │     │ Creator Dashboard     │
              │ & Spec Export │     │ & Royalty Settlements │
              └───────────────┘     └───────────────────────┘
```

## Feature Inventory
Every feature from the user request and survey is enumerated below with its assigned milestone.
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Transparent 2D Canvas | Garment centered on transparent background, authentic colors (Ink Black, Optic White, Paper Beige, Warm Kraft), large full-bleed without intrusive print boundary boxes | M3 | R1, Survey |
| 2 | Three.js 3D Viewport | 3D Viewport with OrbitControls, neutral 3-point lighting, floor shadow | M3 | R1, Survey |
| 3 | Independent UV Mapping | Texture mapping on tshirt.obj with Front ($u \in [0.04, 0.46]$) and Back ($u \in [0.54, 0.96]$) without bleed or mirroring | M3 | R1, Survey |
| 4 | Multi-Artwork Layering | Interactive artwork placement, positioning, scaling, rotation, layer ordering (zIndex) | M3 | R1, Survey |
| 5 | Authoritative Pricing Math | Garment base + print technique (DTG/Screen) + packaging + shipping + total artwork license fees | M1 | R2, Survey |
| 6 | Exact THB 410 Benchmark | 1 unit with APX-HVY-001 (150) + DTG (80) + Packaging (15) + Shipping (40) + Licenses (40+60+25=125) = 410 | M1 | R2, Survey |
| 7 | Server Anti-Tampering | Re-compute all items on server; reject mismatched client claimed totals and invalid license IDs | M1 | R2, Survey |
| 8 | Pricing API Route | `POST /api/pricing/calculate` with Zod validation | M1 | R2, Survey |
| 9 | Atomic Order Placement | `prisma.$transaction` creating Order, RoyaltyObligation, and RoyaltyLedgerEntry atomically | M2 | R3, Survey |
| 10 | Auditable Royalty Ledger | Immutable ledger entries with running balance tracking, earning records, and settlement tracking | M2 | R3, Survey |
| 11 | Creator Settlement Service | Batch settlement processing, balance deduction, settlement record creation | M2 | R3, Survey |
| 12 | Supplier Production Package | JSON production specification export with exact garment SKU, print coordinates, dimensions, asset URLs | M2 | R3, Survey |
| 13 | Order & Production APIs | `POST /api/orders`, `GET /api/orders/[id]`, `GET /api/orders/[id]/production`, `POST /api/royalties/settle` | M2 | R3, Survey |
| 14 | Root Layout & Brand Theme | Global navigation, brand tokens (`#131718` Ink, `#DABA98` Warm, `#F5F0E8` Paper), responsive header | M0/M4 | R4, Survey |
| 15 | Public Marketplace | Artwork catalog with categories (Illustration, Mascot, Typography, Pattern, Logo), search, and Customize link | M4 | R4, Survey |
| 16 | Creator Storefronts | `/creators/[slug]` showing creator profile, bio, avatar, and artwork portfolio | M4 | R4, Survey |
| 17 | Creator Dashboard | `/creator/dashboard` with sales volume, fees earned, eligible balance, and royalty ledger table | M4 | R4, Survey |
| 18 | Supplier Dashboard | `/supplier/dashboard` with job queue, status stepper, and 1-click production spec download | M4 | R4, Survey |
| 19 | Customer Order Tracking | `/account/orders/[id]` with status stepper, mockup preview, itemized pricing breakdown | M4 | R4, Survey |
| 20 | E2E Verification & Hardening | Complete Vitest suites (218 tests, 10 suites), full build pass, zero TypeScript errors, adversarial tests | M5 | AC, Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Test Infra & Core Layout | Test suite framework, `TEST_INFRA.md`, Root Layout (`layout.tsx`), brand styling, base page (`page.tsx`) | none | DONE |
| M1 | Server Pricing Engine & Checkout | Defend `pricing.ts`, unit test `src/lib/__tests__/pricing.test.ts` (THB 410), `POST /api/pricing/calculate`, anti-tamper checkout | M0 | DONE |
| M2 | Royalty Ledger & Supplier Specs | `orders.ts` (atomic tx), `royalties.ts`, `production.ts`, `orders_royalties.test.ts`, API routes | M1 | DONE |
| M3 | 2D & 3D Interactive Design Studio | `public/models/tshirt.obj`, `Garment2DCanvas.tsx`, `GarmentPreview3D.tsx`, layer controls, `studio/new/page.tsx` | M0, M1 | DONE |
| M4 | Multi-Role Portals & Marketplace | Marketplace (`/marketplace`), Creator (`/creators/[slug]`, `/creator/dashboard`), Supplier (`/supplier/dashboard`), Customer (`/account/orders/[id]`) | M2, M3 | DONE |
| M5 | Final Verification & Hardening | Pass 100% E2E tests (Tiers 1-4), Tier 5 adversarial stress testing (218+ tests passing), Forensic Audit verification | M4 | IN_PROGRESS |
