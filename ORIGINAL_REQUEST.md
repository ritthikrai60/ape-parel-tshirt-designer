# Original User Request

## 2026-10-09T23:22:07Z

ape-parel is a creator-powered apparel design and production marketplace connecting Designers, Customers, and Suppliers with interactive 2D/3D customizer, server-authoritative pricing, and auditable royalty tracking.

Working directory: d:/Coding Projects/ape-parel tshirt
Integrity mode: development

## Requirements

### R1. 2D & 3D Interactive Design Studio
- 2D Canvas centered on transparent background with authentic garment colors (Ink Black, Optic White, Paper Beige, Warm Kraft), large full-bleed garment display without intrusive print boundary boxes.
- 3D Viewport powered by Three.js with OrbitControls, neutral 3-point lighting, floor shadow, and independent Front (u in [0, 0.5]) and Back (u in [0.5, 1.0]) texture mapping onto tshirt.obj.
- Multi-artwork placement with interactive positioning, scaling, rotation, and artwork layer management.

### R2. Authoritative Server-Side Pricing Engine & Checkout
- Real-time live price calculation strictly validated on server: garment base + print technique (DTG/Screen) + packaging + shipping + total artwork license fees.
- Exact benchmark verification: Garment (THB 150) + DTG Print (THB 80) + Packaging (THB 15) + Shipping (THB 40) + Artwork Licenses (THB 40 + THB 60 + THB 25 = THB 125) = THB 410 for 1 unit.
- Server rejects unauthorized pricing and client-side fee tampering.

### R3. Auditable Royalty Ledger & Supplier Production Specs
- Atomic order placement generating immutable RoyaltyObligation and RoyaltyLedgerEntry records for every licensed artwork.
- Settlement and payout calculation tracking creator earnings, platform commissions, and payment statuses.
- Automated generation of production specification packages for suppliers (print placement coordinates, dimensions, blank garment SKUs, high-res asset references).

### R4. Multi-Role Portals & Marketplace
- Public Marketplace and Creator storefronts with artwork catalog and licensing terms.
- Creator Dashboard displaying sales volume, license fees earned, and royalty ledger status.
- Supplier Dashboard displaying pending production jobs and manufacturing specifications.
- Customer Order Tracking portal showing design previews, production progress, and item breakdown.

## Verification Resources
- Pre-seeded SQLite database with test creators, suppliers, garments, and artworks (prisma/seed.mjs).
- Unit tests: src/lib/__tests__/pricing.test.ts validating the THB 410 pricing benchmark.
- Integration tests: src/lib/__tests__/orders_royalties.test.ts validating atomic order creation and ledger accuracy.

## Acceptance Criteria

### Pricing & Business Logic
- [ ] Server recalculates all cart items independently of client input.
- [ ] 1-unit benchmark order with the 3 specified licenses calculates to exactly THB 410.
- [ ] Order creation atomically writes royalty obligations and ledger entries for all artists.

### 2D/3D Studio Functionality
- [ ] 2D studio renders shirts large and centered on transparent canvas with no bounding boxes obscuring the garment.
- [ ] 3D studio loads tshirt.obj in Three.js and correctly maps Front and Back canvases separately without mirroring or cross-bleed.

### End-to-End Build & Execution
- [ ] TypeScript type checks pass with zero errors (npx tsc --noEmit).
- [ ] Vitest test suite passes (npm test).
- [ ] Next.js production build completes successfully (npm run build).
