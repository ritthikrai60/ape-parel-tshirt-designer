# Task Board: ape-parel MVP

Single Source of Truth for task execution and coordination within the Agents Factory framework.

---

## Task Summary Table

| ID | Title | Owner | Reviewer | State | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TASK-001** | Project Scaffolding & Prisma Database Architecture | Technical Lead | Code Reviewer | **PASS** | Prisma 14 models migrated to SQLite, `seed.mjs` populates all seed data + THB 410 benchmark order. |
| **TASK-002** | Creator Marketplace & Artwork Portfolio | Technical Lead | QA Engineer | **PASS** | `/marketplace` & `/creators/[slug]` functional with live license cards and direct studio launch. |
| **TASK-003** | 2D Canvas & Real Three.js 3D Garment Studio | Technical Lead | Code Reviewer | **PASS** | `Garment2DCanvas` (borderless, transparent, 4 authentic colorways) & `GarmentPreview3D` (Three.js `tshirt.obj`, Front/Back UV mapping, contact shadow). |
| **TASK-004** | Live Pricing Engine & Quote Server Validation | Technical Lead | QA Engineer | **PASS** | Authoritative `src/lib/pricing.ts` strictly validates exact THB 410 benchmark and rejects client fee tampering (86 pricing tests pass). |
| **TASK-005** | Order Pipeline & Supplier Production Specification | Technical Lead | Code Reviewer | **PASS** | Atomic order checkout in `src/lib/orders.ts`, supplier RIP technical package in `src/lib/production.ts`, and tracking portal in `/account/orders/[id]`. |
| **TASK-006** | Royalty Ledger & Financial Settlement System | Technical Lead | QA Engineer | **PASS** | Double-entry immutable `RoyaltyObligation` and `RoyaltyLedgerEntry` in `src/lib/royalties.ts` + `/api/royalties/settle` with creator analytics dashboard. |
| **TASK-007** | Supplier Portal, Admin Moderation & Audit Logs | Technical Lead | Code Reviewer | **PASS** | Supplier dashboard at `/supplier/dashboard`, Admin portal at `/admin`, with audit trail and fulfillment status controls. |

---

## Detailed Task Verification Records

### Task Contract: TASK-001 [PASS]
- **Deliverables:** `package.json`, `prisma/schema.prisma`, `prisma/seed.mjs`, `src/lib/prisma.ts`.
- **Evidence:** 
  - Database schema contains all 14 domain models.
  - `node prisma/seed.mjs` runs with exit code 0, populating 1 Admin, 3 Creators, 2 Suppliers, 5 Artworks, 2 Garments, and benchmark Order `APX-ORD-9021`.

### Task Contract: TASK-002 [PASS]
- **Deliverables:** `src/app/marketplace/page.tsx`, `src/app/creators/[slug]/page.tsx`, `src/components/marketplace/ArtworkCard.tsx`, `src/components/marketplace/CategoryFilter.tsx`.
- **Evidence:**
  - Marketplace supports category filtering (Mascot, Typography, Illustration) and search.
  - Creators have dedicated storefronts displaying their portfolios and commercial terms.
  - 37 unit and integration tests passing (`portals_marketplace.test.ts`, `portals_marketplace_challenger.test.ts`).

### Task Contract: TASK-003 [PASS]
- **Deliverables:** `src/app/studio/new/page.tsx`, `src/components/studio/DesignStudioClient.tsx`, `src/components/studio/Garment2DCanvas.tsx`, `src/components/studio/GarmentPreview3D.tsx`, `public/models/tshirt.obj`.
- **Evidence:**
  - 2D Canvas renders high-res vector garment silhouette on transparent background with zero intrusive print boundary boxes, correctly handling Ink Black (`#131718`), Optic White (`#FFFFFF`), Paper Beige (`#F5F0E8`), and Warm Kraft (`#DABA98`).
  - Three.js 3D Viewport loads Wavefront `tshirt.obj` (1,490 vertices, 2,906 faces) with OrbitControls, neutral 3-point lighting, soft contact floor shadow, and independent UV mapping for Front ($u \in [0, 0.5]$) and Back ($u \in [0.5, 1.0]$).
  - 24 unit and pipeline tests passing (`studio_pipeline.test.ts`, `studio_challenger.test.ts`).

### Task Contract: TASK-004 [PASS]
- **Deliverables:** `src/lib/pricing.ts`, `src/app/api/pricing/calculate/route.ts`, `src/lib/__tests__/pricing.test.ts`.
- **Evidence:**
  - Server recalculates all pricing components: Garment Base (฿150) + DTG Print (฿80) + Packaging (฿15) + Shipping (฿40) + Artwork Licenses (฿40 + ฿60 + ฿25 = ฿125) = **THB 410**.
  - Client-tampered inputs are rejected.
  - 86 pricing tests passing across 3 suites (`pricing.test.ts`, `pricing_adversarial.test.ts`, `pricing_challenger.test.ts`).

### Task Contract: TASK-005 [PASS]
- **Deliverables:** `src/lib/orders.ts`, `src/app/api/orders/route.ts`, `src/app/api/orders/[id]/route.ts`, `src/app/api/orders/[id]/production/route.ts`, `src/app/account/orders/[id]/page.tsx`.
- **Evidence:**
  - Orders generate unique order numbers (e.g. `APX-ORD-9021`) and execute atomically inside Prisma transactions.
  - Supplier production endpoint outputs exact coordinate maps, dimensions, resolution, and blank garment SKUs.
  - Customer order tracking displays interactive status timeline and design viewer.

### Task Contract: TASK-006 [PASS]
- **Deliverables:** `src/lib/royalties.ts`, `src/app/creator/dashboard/page.tsx`, `src/app/api/royalties/settle/route.ts`.
- **Evidence:**
  - Every licensed artwork creates an immutable `RoyaltyObligation` and corresponding `RoyaltyLedgerEntry` record.
  - Creators can view earnings breakdown and execute batch settlements with balance conservation verified.
  - 71 order and royalty integration tests passing (`orders_royalties.test.ts`, `orders_royalties_challenger.test.ts`, `orders_api_adversarial.test.ts`).

### Task Contract: TASK-007 [PASS]
- **Deliverables:** `src/app/supplier/dashboard/page.tsx`, `src/app/admin/page.tsx`, `src/components/portal/SupplierDashboardClient.tsx`, `src/components/portal/AdminDashboardClient.tsx`.
- **Evidence:**
  - Supplier portal manages manufacturing queue and updates fulfillment states (`IN_PRODUCTION`, `QA`, `SHIPPED`).
  - Admin governance portal provides platform GMV, royalty pool metrics, artwork moderation approvals, and audit log inspection.
  - All status transitions create immutable `AuditEvent` records.

---

## Master Verification Summary
- **Vitest Test Suite:** 11 / 11 test files passed, **231 / 231 tests passing** (100% pass rate).
- **TypeScript Typecheck:** `npx tsc --noEmit` exited with 0 errors.
- **Production Build:** `npm run build` compiled 9 dynamic & static routes with zero warnings.
