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
| 3 | Independent UV Mapping | Texture mapping on tshirt.obj with Front ($u \in [0, 0.5]$) and Back ($u \in [0.5, 1.0]$) without bleed or mirroring | M3 | R1, Survey |
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
| 20 | E2E Verification & Hardening | Complete Vitest suites, full build pass, zero TypeScript errors, adversarial tests | M5 | AC, Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Test Infra & Core Layout | Test suite framework, `TEST_INFRA.md`, Root Layout (`layout.tsx`), brand styling, base page (`page.tsx`) | none | DONE |
| M1 | Server Pricing Engine & Checkout | Defend `pricing.ts`, unit test `src/lib/__tests__/pricing.test.ts` (THB 410), `POST /api/pricing/calculate`, anti-tamper checkout | M0 | DONE |
| M2 | Royalty Ledger & Supplier Specs | `orders.ts` (atomic tx), `royalties.ts`, `production.ts`, `orders_royalties.test.ts`, API routes | M1 | IN_PROGRESS |
| M3 | 2D & 3D Interactive Design Studio | `public/models/tshirt.obj`, `Garment2DCanvas.tsx`, `GarmentPreview3D.tsx`, layer controls, `studio/new/page.tsx` | M0 | PLANNED |
| M4 | Multi-Role Portals & Marketplace | Marketplace (`/marketplace`), Creator (`/creators/[slug]`, `/creator/dashboard`), Supplier (`/supplier/dashboard`), Customer (`/account/orders/[id]`) | M2, M3 | PLANNED |
| M5 | Final Verification & Hardening | Pass 100% E2E tests (Tiers 1-4), Tier 5 adversarial stress testing, Forensic Audit verification | M4 | PLANNED |

## Interface Contracts

### Pricing Service (`src/lib/pricing.ts`)
```typescript
export async function calculateLivePricing(
  payload: PricingPayload
): Promise<PriceCalculationResult>;
```
- Must throw on invalid or missing `licenseOptionId`.
- Must compute: Garment (base + variant adj) * qty + Print (surface rate * surfaces * qty) + Pack (pack rate * qty) + Ship (flat rate) + Licenses (sum * qty).
- Exactly 410 THB for 1 unit of APX-HVY-001 + 1 surface DTG + 3 licenses (40, 60, 25).

### Order Placement & Ledger Service (`src/lib/orders.ts`)
```typescript
export async function createOrderAtomic(
  input: CreateOrderInput
): Promise<CreateOrderResult>;
```
- Must execute within `prisma.$transaction`.
- Recalculates authoritative price; checks clientClaimedTotal if provided.
- Creates `DesignDocument`, `Order`, `RoyaltyObligation[]`, and `RoyaltyLedgerEntry[]` atomically.

### Production Specification Generator (`src/lib/production.ts`)
```typescript
export async function generateProductionPackage(
  orderId: string
): Promise<ProductionJobPackage>;
```
- Returns complete manufacturing package with garment SKU, variant details, print technique, surface dimensions, and precise artwork coordinates.

### 2D/3D Studio Canvas Contract (`src/components/studio/`)
- Canvas Texture: 1024x1024 offscreen buffer.
- Front UV: $u \in [0.0, 0.5]$ (pixels 0 to 512).
- Back UV: $u \in [0.5, 1.0]$ (pixels 512 to 1024).
- Authentic Garment Colors:
  - Ink Black: `#131718`
  - Optic White: `#FFFFFF`
  - Paper Beige: `#F5F0E8`
  - Warm Kraft: `#DABA98`

## Code Layout
```
d:\Coding Projects\ape-parel tshirt\
├── public/
│   └── models/
│       └── tshirt.obj                  # 3D T-shirt Wavefront mesh with [0,0.5] Front, [0.5,1.0] Back UVs
├── prisma/
│   ├── schema.prisma                  # 14 data models (SQLite)
│   ├── seed.mjs                       # Database seeder with benchmark entities
│   └── dev.db                         # Seeded SQLite database
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with brand header & navigation
│   │   ├── page.tsx                   # Landing page
│   │   ├── globals.css                # Brand styles & CSS variables
│   │   ├── marketplace/page.tsx       # Artwork marketplace catalog
│   │   ├── creators/[slug]/page.tsx   # Creator storefront & portfolio
│   │   ├── studio/new/page.tsx        # 2D/3D interactive design studio
│   │   ├── creator/dashboard/page.tsx # Creator royalty ledger & earnings dashboard
│   │   ├── supplier/dashboard/page.tsx# Supplier pending jobs & spec downloads
│   │   ├── account/orders/[id]/page.tsx # Customer order tracking with status stepper
│   │   └── api/
│   │       ├── pricing/calculate/route.ts # Live price recalculation
│   │       ├── orders/route.ts            # Atomic order placement
│   │       ├── orders/[id]/production/route.ts # Production job spec download
│   │       └── royalties/settle/route.ts  # Creator payout settlement
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx             # Global brand navbar
│   │   │   └── Footer.tsx             # Brand footer
│   │   ├── studio/
│   │   │   ├── DesignStudioClient.tsx # Studio coordinator
│   │   │   ├── Garment2DCanvas.tsx    # Transparent full-bleed 2D canvas
│   │   │   ├── GarmentPreview3D.tsx   # Three.js 3D viewport with OrbitControls & 3-point light
│   │   │   ├── LayerManager.tsx       # Artwork layer ordering & controls
│   │   │   ├── ArtworkCatalogDrawer.tsx # Artwork picker
│   │   │   └── LivePricingCard.tsx    # Live quote display
│   │   ├── marketplace/
│   │   │   ├── ArtworkCard.tsx        # Catalog card
│   │   │   └── CategoryFilter.tsx     # Filter tabs
│   │   └── shared/
│   │       └── StatusBadge.tsx        # Consistent badge styling
│   └── lib/
│       ├── prisma.ts                  # Prisma client singleton
│       ├── types.ts                   # Domain TypeScript interfaces
│       ├── pricing.ts                 # Authoritative pricing calculation
│       ├── orders.ts                  # Atomic order placement & transaction
│       ├── royalties.ts               # Royalty ledger queries & settlements
│       ├── production.ts              # Production specification package generator
│       └── __tests__/
│           ├── pricing.test.ts        # Unit test: exact THB 410 benchmark
│           └── orders_royalties.test.ts # Integration test: atomic order & ledger tracking
```
