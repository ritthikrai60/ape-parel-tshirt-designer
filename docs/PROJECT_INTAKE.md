# Project Intake: ape-parel MVP

Compiled from **MASTER CODING AGENT PROMPT — APE-PAREL MVP** via **Agents Factory Intake Process**.

---

## 1. Project Objective & Vision
- **Project Name:** **ape-parel**
- **Brand Identity & Tokens:**
  - Independent creator-driven streetwear, expressive graphic apparel, modular customization, and creator-owned intellectual property.
  - **Color Tokens:**
    - Ink: `#131718`
    - Warm Beige: `#DABA98`
    - Paper: `#F5F0E8`
    - White: `#FFFFFF`
    - Muted Gray: `#777777`
    - Border: `#DED7CE`
- **Core Problem:**
  Connecting three distinct commercial parties into a unified, transparent transaction loop:
  1. **Creators:** Monetize graphic assets with granular licensing, individual storefronts, and auditable royalties.
  2. **Customers:** Combine multiple licensed artworks from different creators onto a garment, preview in real 3D & photorealistic 2D, and receive exact transparent pricing.
  3. **Suppliers:** Publish blank garments and printing capabilities (DTG, screen print), receive structured production specifications, and fulfill orders.
- **Definition of Success:**
  A working, navigable, data-backed MVP executing the complete end-to-end loop:
  > **Designer publishes artwork** ➔ **Customer configures garment & licenses multiple artworks** ➔ **Server calculates live costs** ➔ **Customer reviews & orders** ➔ **Order & royalty ledger records created atomically** ➔ **Supplier receives production specification package** ➔ **Royalty obligations become auditable & settleable**.

---

## 2. Scope & Core Modules

### In-Scope Modules (The 7 Core Domains)
1. **Core Feature A — Creator Marketplace:**
   - Routes: `/`, `/marketplace`, `/artwork/[id]`, `/creators/[slug]`, `/creator/dashboard`, `/creator/artworks`, `/creator/artworks/new`, `/creator/earnings`, `/creator/licenses`.
   - Asset categories: Illustration, Clipart, Logo, Typography, Pattern, Mascot.
   - Licensing model: Per-unit license with price, commercial use terms, and version snapshotting.
2. **Core Feature B — T-Shirt Design Studio:**
   - Routes: `/studio/new`, `/studio/[id]`.
   - 3-Panel Studio Layout: Left (Artwork Catalog), Center (2D & 3D Viewport), Right (Garment Blank, Fit, Color, Size, Transform Sliders, Live Pricing).
   - Surfaces: FRONT, BACK, and SIDE.
   - Normalized Design Document format (`assetId`, `licenseOptionId`, `surface`, `x`, `y`, `width`, `height`, `rotation`, `zIndex`).
3. **Core Feature C — Three.js 3D Garment Preview:**
   - Real 3D garment mesh (`/models/tshirt.obj`), 360° orbit rotation, zoom, camera reset.
   - Dynamic 1024×1024 CanvasTexture mapping separating Front (`u ∈ [0, 0.5]`) and Back (`u ∈ [0.5, 1.0]`) UVs to prevent bleed-through.
   - Studio 3-point lighting rig with floor drop shadow.
4. **Core Feature D — Supplier Marketplace:**
   - Routes: `/suppliers`, `/suppliers/[slug]`, `/supplier/dashboard`, `/supplier/catalog`, `/supplier/orders`.
   - Blank garments, fabric GSM, fits (regular, oversized, boxy), print services (DTG), lead times, MOQs.
5. **Core Feature E — Centralized Pricing Engine:**
   - Route: `/api/pricing/calculate`.
   - Server-side authoritative validation in integer minor currency units (THB).
   - Benchmark Formula:
     - Garment (฿150) + DTG Printing (฿80) + Packaging (฿15) + Shipping (฿40) + Artwork Licenses (฿40 + ฿60 + ฿25) = **THB 410** for 1 unit.
     - Scales accurately by quantity and surface count.
6. **Core Feature F — IP Royalty Ledger Subsystem:**
   - Separate, traceable `RoyaltyObligation` per creator per ordered unit.
   - Immutable `RoyaltyLedgerEntry` audit trail.
   - Internal settlement workflow (`PENDING` ➔ `SETTLED`).
7. **Core Feature G — Orders & Production Export:**
   - Routes: `/api/orders`, `/account/orders`, `/account/orders/[id]`, `/api/orders/[id]/production`.
   - State Machine: `DRAFT`, `QUOTED`, `AWAITING_PAYMENT`, `PAYMENT_CONFIRMED`, `IN_PRODUCTION`, `COMPLETED`.
   - Production Package: Exportable JSON specification with high-res asset references and print coordinates.

### Out-of-Scope (Non-Goals for MVP)
- Distributed microservices, event buses (Kafka/RabbitMQ), Kubernetes.
- Real banking/payment gateway APIs (use labeled `DEV_MOCK` mode).
- Carrier logistics API integrations (use flat-rate tier calculation).

---

## 3. Technology Architecture
- **Architecture Principle:** Modular Monolith with explicit domain separation.
- **Frontend:** Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS, Lucide React.
- **3D Engine:** Three.js with OBJLoader.
- **Database & ORM:** Prisma ORM (SQLite for zero-config dev, PostgreSQL compatible).
- **Validation:** Zod schemas.
- **Testing:** Vitest automated test suite.

---

## 4. Roles & Permissions (RBAC)
- **Customer:** Browse catalog, configure garments, save/reopen drafts, preview in 3D, order, view history.
- **Creator:** Manage storefront, upload/publish artwork, configure license terms, inspect earnings and royalty statements.
- **Supplier:** Manage garment & print catalog, inspect assigned orders, download production specs, update fulfillment status.
- **Admin:** Platform overview, moderate artwork, audit orders & royalty obligations, trigger settlement batches.

---

## 5. Risk, Security & Data Integrity
- **Server Authority:** Frontend is NEVER trusted for pricing, totals, or royalties.
- **Database Transactions:** Atomic transactions for checkout (Order + Royalty Obligations created together).
- **Idempotency:** Prevent duplicate orders and duplicate royalty obligations.
- **Asset Security:** Validate file MIME types, sanitize SVGs, protect original high-res assets.

---

## 6. Agents Factory Team & Verification Gates
- **Technical Lead:** Implements architecture, schemas, full-stack routes, and 3D studio.
- **Code Reviewer:** Enforces domain boundaries, security rules, and code quality.
- **QA Engineer:** Executes automated tests (`npm test`, `npx tsc --noEmit`, `npm run build`), verifies benchmark pricing (฿410), and validates end-to-end user journeys.
